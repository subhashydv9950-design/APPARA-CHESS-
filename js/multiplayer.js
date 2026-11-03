/* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 21B — INTEGRATION FIX
   File: js/multiplayer.js
   ========================================================= */

window.APPARA_MULTIPLAYER = (function () {
    "use strict";

    let mode = "offline";
    let initialized = false;
    let processingMove = false;
    let paused = false;
    let gameFinished = false;
    let playerColor = "w";
    let lastSyncedFen = "";
    let moveCount = 0;

    let callbacks = {
        onMove: null,
        onGameEnd: null,
        onError: null,
        onRoomUpdate: null
    };

    function engine() {
        return window.APPARA_ENGINE || null;
    }

    function game() {
        return engine() ? engine().getGame() : null;
    }

    function notify(message, type) {
        if (
            window.APPARA_APP &&
            typeof APPARA_APP.notify === "function"
        ) {
            APPARA_APP.notify(message, type || "info");
        }
    }

    function reportError(error) {
        const message = error && error.message
            ? error.message
            : String(error || "Unknown error");

        console.error("[APPARA MULTIPLAYER]", message);

        if (typeof callbacks.onError === "function") {
            callbacks.onError(message);
        } else {
            notify(message, "error");
        }

        return false;
    }

    function emitMove(result, source) {
        if (typeof callbacks.onMove === "function") {
            callbacks.onMove(result, source);
        }

        if (
            window.APPARA_GAME &&
            typeof APPARA_GAME.onMultiplayerMove === "function"
        ) {
            APPARA_GAME.onMultiplayerMove(result, source);
        }
    }

    function connectBoard() {
        if (
            !window.APPARA_BOARD ||
            typeof APPARA_BOARD.setMoveHandler !== "function"
        ) {
            return false;
        }

        APPARA_BOARD.setMoveHandler(function (move) {
            return handlePlayerMove(move);
        });

        return true;
    }

    function init(options) {
        options = options || {};

        callbacks = Object.assign(callbacks, options);

        processingMove = false;
        paused = false;
        gameFinished = false;
        moveCount = 0;

        connectBoard();

        initialized = true;
        return true;
    }

    function resetState(newMode) {
        mode = newMode || "offline";
        processingMove = false;
        paused = false;
        gameFinished = false;
        moveCount = 0;
        lastSyncedFen = "";

        if (window.APPARA_AI) {
            APPARA_AI.reset();
        }

        return true;
    }

    function startOffline() {
        if (!engine()) {
            return reportError("Chess engine उपलब्ध नहीं है।");
        }

        resetState("offline");

        engine().createGame();

        connectBoard();

        if (window.APPARA_BOARD) {
            APPARA_BOARD.setOrientation("w");
            APPARA_BOARD.refresh();
        }

        return true;
    }

    function startComputer(options) {
        options = options || {};

        if (!engine()) {
            return reportError("Chess engine उपलब्ध नहीं है।");
        }

        resetState("computer");

        playerColor = options.playerColor === "b"
            ? "b"
            : "w";

        engine().createGame();

        connectBoard();

        if (window.APPARA_BOARD) {
            APPARA_BOARD.setOrientation(playerColor);
            APPARA_BOARD.refresh();
        }

        if (
            window.APPARA_AI &&
            typeof APPARA_AI.init === "function"
        ) {
            APPARA_AI.init();

            if (options.difficulty) {
                APPARA_AI.setDifficulty(options.difficulty);
            }
        }

        if (playerColor === "b") {
            playComputerTurn();
        }

        return true;
    }

    function startOnline(options) {
        options = options || {};

        if (!engine()) {
            return reportError("Chess engine उपलब्ध नहीं है।");
        }

        resetState("online");

        playerColor = options.playerColor === "b"
            ? "b"
            : "w";

        connectBoard();

        if (window.APPARA_BOARD) {
            APPARA_BOARD.setOrientation(playerColor);
            APPARA_BOARD.refresh();
        }

        lastSyncedFen = engine().getFEN();

        return true;
    }

    function isPlayerTurn() {
        const currentGame = game();

        if (!currentGame) return false;

        if (mode === "computer") {
            return currentGame.turn() === playerColor;
        }

        if (mode === "online") {
            return currentGame.turn() === playerColor;
        }

        return true;
    }

    function handlePlayerMove(move) {
        const currentGame = game();

        if (
            !currentGame ||
            !move ||
            paused ||
            processingMove ||
            gameFinished ||
            currentGame.game_over()
        ) {
            return false;
        }

        if (!isPlayerTurn()) {
            return false;
        }

        processingMove = true;

        try {
            if (mode === "online") {
                return handleOnlineMove(move);
            }

            const result = engine().move({
                from: move.from,
                to: move.to,
                promotion: move.promotion || "q"
            });

            if (!result) {
                processingMove = false;
                return false;
            }

            moveCount++;
            afterSuccessfulMove(result, "local");

            processingMove = false;

            if (mode === "computer") {
                if (!gameFinished && !game().game_over()) {
                    playComputerTurn();
                }
            }

            return result;
        } catch (error) {
            processingMove = false;
            return reportError(error);
        }
    }

    function handleOnlineMove(move) {
        if (!window.APPARA_ONLINE) {
            processingMove = false;
            return reportError("Online system उपलब्ध नहीं है।");
        }

        if (
            typeof APPARA_ONLINE.sendMove !== "function"
        ) {
            processingMove = false;
            return reportError("Online move service उपलब्ध नहीं है।");
        }

        Promise.resolve(
            APPARA_ONLINE.sendMove(move)
        ).then(function (result) {
            if (!result) {
                processingMove = false;
                return;
            }

            const currentGame = game();

            if (currentGame) {
                lastSyncedFen = engine().getFEN();
                moveCount++;
                afterSuccessfulMove(result, "online-local");
            }

            processingMove = false;
        }).catch(function (error) {
            processingMove = false;
            reportError(error);
        });

        return true;
    }

    function playComputerTurn() {
        const currentGame = game();

        if (
            mode !== "computer" ||
            !currentGame ||
            paused ||
            gameFinished ||
            processingMove ||
            currentGame.game_over() ||
            currentGame.turn() === playerColor
        ) {
            return false;
        }

        /*
         * Computer turn के दौरान lock लगाया जाता है।
         * Move apply होने के बाद lock हटाया जाता है।
         */
        processingMove = true;

        try {
            if (
                !window.APPARA_AI ||
                typeof APPARA_AI.getBestMove !== "function"
            ) {
                processingMove = false;
                return reportError("Computer AI उपलब्ध नहीं है।");
            }

            const aiMove = APPARA_AI.getBestMove(
                currentGame.turn()
            );

            if (!aiMove) {
                processingMove = false;
                checkGameEnd();
                return false;
            }

            const result = engine().move({
                from: aiMove.from,
                to: aiMove.to,
                promotion: aiMove.promotion || "q"
            });

            if (!result) {
                processingMove = false;
                return false;
            }

            moveCount++;

            afterSuccessfulMove(result, "computer");

            /*
             * सबसे जरूरी सुधार:
             * AI की चाल पूरी होने के बाद lock हटता है।
             * अब अगली player move block नहीं होगी।
             */
            processingMove = false;

            return result;
        } catch (error) {
            processingMove = false;
            return reportError(error);
        }
    }

    function afterSuccessfulMove(result, source) {
        if (window.APPARA_BOARD) {
            APPARA_BOARD.refresh();
        }

        if (window.APPARA_SOUND) {
            if (result && result.captured) {
                APPARA_SOUND.capture();
            } else {
                APPARA_SOUND.move();
            }
        }

        if (window.APPARA_TIMER) {
            if (APPARA_TIMER.isActive()) {
                APPARA_TIMER.switchTurn();
            } else if (!gameFinished) {
                APPARA_TIMER.start();
            }
        }

        emitMove(result, source);

        checkGameEnd();

        return true;
    }

    function handleRoomUpdate(roomData) {
        if (
            mode !== "online" ||
            !roomData ||
            gameFinished
        ) {
            return false;
        }

        if (typeof callbacks.onRoomUpdate === "function") {
            callbacks.onRoomUpdate(roomData);
        }

        const remoteFen =
            roomData.fen ||
            (roomData.game && roomData.game.fen);

        if (
            !remoteFen ||
            remoteFen === lastSyncedFen
        ) {
            return false;
        }

        if (processingMove) {
            return false;
        }

        try {
            processingMove = true;

            const loaded = engine().load(remoteFen);

            if (!loaded) {
                processingMove = false;
                return reportError("Online game position load नहीं हुई।");
            }

            lastSyncedFen = remoteFen;
            moveCount++;

            if (window.APPARA_BOARD) {
                APPARA_BOARD.refresh();
            }

            if (window.APPARA_TIMER) {
                const currentGame = game();

                if (
                    currentGame &&
                    APPARA_TIMER.isActive()
                ) {
                    APPARA_TIMER.switchTurn();
                }
            }

            emitMove(null, "online-remote");
            checkGameEnd();

            processingMove = false;
            return true;
        } catch (error) {
            processingMove = false;
            return reportError(error);
        }
    }

    function checkGameEnd() {
        const currentGame = game();

        if (!currentGame || gameFinished) {
            return false;
        }

        if (!currentGame.game_over()) {
            return false;
        }

        const status = engine().getGameStatus();

        finishGame(status);
        return true;
    }

    function finishGame(status) {
        if (gameFinished) return false;

        gameFinished = true;
        processingMove = false;

        if (window.APPARA_TIMER) {
            APPARA_TIMER.stop();
        }

        if (window.APPARA_AI) {
            APPARA_AI.stop();
        }

        if (typeof callbacks.onGameEnd === "function") {
            callbacks.onGameEnd(status);
        }

        if (
            window.APPARA_GAME &&
            typeof APPARA_GAME.onMultiplayerGameEnd === "function"
        ) {
            APPARA_GAME.onMultiplayerGameEnd(status);
        }

        return true;
    }

    function resign() {
        if (gameFinished) return false;

        const currentGame = game();
        if (!currentGame) return false;

        const winner = currentGame.turn() === "w"
            ? "b"
            : "w";

        finishGame({
            isOver: true,
            status: "resignation",
            winner: winner,
            message: winner === "w"
                ? "White wins by resignation"
                : "Black wins by resignation"
        });

        return true;
    }

    function offerDraw() {
        if (gameFinished) return false;

        if (mode === "online") {
            notify(
                "Online draw offer के लिए server-side draw system आवश्यक है।",
                "info"
            );
            return false;
        }

        finishGame({
            isOver: true,
            status: "draw",
            winner: null,
            message: "Game drawn"
        });

        return true;
    }

    function pause() {
        if (gameFinished || paused) return false;

        paused = true;

        if (window.APPARA_TIMER) {
            APPARA_TIMER.pause();
        }

        return true;
    }

    function resume() {
        if (gameFinished || !paused) return false;

        paused = false;

        if (window.APPARA_TIMER) {
            APPARA_TIMER.resume();
        }

        return true;
    }

    function getState() {
        return {
            mode: mode,
            playerColor: playerColor,
            processingMove: processingMove,
            paused: paused,
            gameFinished: gameFinished,
            moveCount: moveCount,
            lastSyncedFen: lastSyncedFen
        };
    }

    function stop() {
        processingMove = false;
        paused = false;
        gameFinished = true;

        if (window.APPARA_AI) {
            APPARA_AI.stop();
        }

        if (window.APPARA_TIMER) {
            APPARA_TIMER.stop();
        }

        return true;
    }

    function destroy() {
        stop();

        if (window.APPARA_BOARD) {
            APPARA_BOARD.setMoveHandler(null);
        }

        initialized = false;
        return true;
    }

    return {
        init: init,
        startOffline: startOffline,
        startComputer: startComputer,
        startOnline: startOnline,
        connectBoard: connectBoard,
        handlePlayerMove: handlePlayerMove,
        playComputerTurn: playComputerTurn,
        afterSuccessfulMove: afterSuccessfulMove,
        handleRoomUpdate: handleRoomUpdate,
        checkGameEnd: checkGameEnd,
        finishGame: finishGame,
        resign: resign,
        offerDraw: offerDraw,
        pause: pause,
        resume: resume,
        getState: getState,
        stop: stop,
        destroy: destroy
    };
})();

/* =========================================================
   APPARA CHESS — PART 21B END
   FILE END: js/multiplayer.js
   ========================================================= */

