/* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 21J — ONLINE INTEGRATION REBUILD
   FILE: js/multiplayer.js
   PART 1/3
========================================================= */

window.APPARA_MULTIPLAYER = (function () {
    "use strict";

    /* =====================================================
       01. STATE
    ===================================================== */

    const state = {
        mode: "offline",
        active: false,
        finished: false,
        paused: false,

        playerColor: "w",
        opponentColor: "b",

        roomCode: null,
        difficulty: "medium",

        roomHandlerBound: false,
        moveInProgress: false,

        onStateChange: null,
        onGameEnd: null,

        lastPosition: null,
        lastMove: null
    };


    /* =====================================================
       02. MODULE REFERENCES
    ===================================================== */

    function getEngine() {
        return window.APPARA_ENGINE || null;
    }

    function getBoard() {
        return window.APPARA_BOARD || null;
    }

    function getGame() {
        return window.APPARA_GAME || null;
    }

    function getAI() {
        return window.APPARA_AI || null;
    }

    function getTimer() {
        return window.APPARA_TIMER || null;
    }

    function getOnline() {
        return window.APPARA_ONLINE || null;
    }


    /* =====================================================
       03. NOTIFICATION
    ===================================================== */

    function notify(message, type) {
        if (
            window.APPARA_APP &&
            typeof window.APPARA_APP.notify === "function"
        ) {
            window.APPARA_APP.notify(message, type || "info");
            return;
        }

        if (typeof window.showNotification === "function") {
            window.showNotification(message, type || "info");
            return;
        }

        console.log("[APPARA MULTIPLAYER]", message);
    }


    /* =====================================================
       04. STATE CHANGE
    ===================================================== */

    function emitStateChange() {
        if (typeof state.onStateChange === "function") {
            state.onStateChange(getState());
        }
    }

    function setStateChangeHandler(callback) {
        state.onStateChange =
            typeof callback === "function" ? callback : null;
    }

    function setGameEndHandler(callback) {
        state.onGameEnd =
            typeof callback === "function" ? callback : null;
    }


    /* =====================================================
       05. RESET STATE
    ===================================================== */

    function resetState(mode) {
        state.mode = mode || "offline";
        state.active = true;
        state.finished = false;
        state.paused = false;

        state.roomCode = null;
        state.roomHandlerBound = false;
        state.moveInProgress = false;

        state.lastPosition = null;
        state.lastMove = null;

        emitStateChange();
    }


    /* =====================================================
       06. CHECK CONTROLLER AVAILABILITY
    ===================================================== */

    function validateModules() {
        const engine = getEngine();
        const board = getBoard();

        if (!engine || !board) {
            notify(
                "Chess engine or board controller is unavailable.",
                "error"
            );

            return false;
        }

        return true;
    }


    /* =====================================================
       07. CONNECT BOARD
    ===================================================== */

    function connectBoard() {
        const board = getBoard();

        if (!board || typeof board.setMoveHandler !== "function") {
            return false;
        }

        board.setMoveHandler(function (move) {
            handlePlayerMove(move);
        });

        return true;
    }


    /* =====================================================
       08. START OFFLINE GAME
    ===================================================== */

    function startOffline(options) {
        options = options || {};

        if (!validateModules()) {
            return false;
        }

        const engine = getEngine();

        resetState("offline");

        state.playerColor = "w";
        state.opponentColor = "b";

        if (typeof engine.reset === "function") {
            engine.reset();
        }

        connectBoard();

        const board = getBoard();

        if (board && typeof board.setOrientation === "function") {
            board.setOrientation("w");
        }

        const timer = getTimer();

        if (timer && typeof timer.reset === "function") {
            timer.reset({
                minutes: options.minutes || 10,
                increment: options.increment || 0
            });
        }

        emitStateChange();

        return true;
    }


    /* =====================================================
       09. START COMPUTER GAME
    ===================================================== */

    function startComputer(options) {
        options = options || {};

        if (!validateModules()) {
            return false;
        }

        const engine = getEngine();
        const ai = getAI();

        resetState("computer");

        state.playerColor =
            options.playerColor === "b" ? "b" : "w";

        state.opponentColor =
            state.playerColor === "w" ? "b" : "w";

        state.difficulty =
            options.difficulty || "medium";

        if (typeof engine.reset === "function") {
            engine.reset();
        }

        if (ai) {
            if (typeof ai.setDifficulty === "function") {
                ai.setDifficulty(state.difficulty);
            }

            if (typeof ai.reset === "function") {
                ai.reset();
            }
        }

        connectBoard();

        const board = getBoard();

        if (board && typeof board.setOrientation === "function") {
            board.setOrientation(state.playerColor);
        }

        const timer = getTimer();

        if (timer && typeof timer.reset === "function") {
            timer.reset({
                minutes: options.minutes || 10,
                increment: options.increment || 0
            });
        }

        emitStateChange();

        if (state.playerColor === "b") {
            window.setTimeout(function () {
                if (state.active && !state.finished) {
                    playComputerTurn();
                }
            }, 500);
        }

        return true;
    }


    /* =====================================================
       10. CHECK PLAYER TURN
    ===================================================== */

    function isPlayerTurn() {
        if (!state.active || state.finished || state.paused) {
            return false;
        }

        const engine = getEngine();

        if (!engine || typeof engine.turn !== "function") {
            return false;
        }

        if (state.mode === "offline") {
            return true;
        }

        return engine.turn() === state.playerColor;
    }


    /* =====================================================
       11. CHECK GAME STATE
    ===================================================== */

    function canPlayMove() {
        if (!state.active || state.finished || state.paused) {
            return false;
        }

        if (state.moveInProgress) {
            return false;
        }

        return true;
    }


    /* =====================================================
       12. PLAYER MOVE ENTRY
    ===================================================== */

    function handlePlayerMove(move) {
        if (!canPlayMove()) {
            return false;
        }

        if (!move || !move.from || !move.to) {
            return false;
        }

        if (!isPlayerTurn()) {
            notify("It is not your turn.", "warning");
            return false;
        }

        if (state.mode === "online") {
            return handleOnlineMove(move);
        }

        if (state.mode === "computer") {
            return handleComputerPlayerMove(move);
        }

        return handleLocalMove(move);
    }


    /* =====================================================
       PART 1/3 END
       CONTINUE PART 2/3 BELOW THIS LINE
    ===================================================== */

             /* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 21J — MOVE HANDLING & ONLINE SYNC
   FILE: js/multiplayer.js
   PART 2/3
========================================================= */


/* =====================================================
   13. LOCAL PLAYER MOVE
===================================================== */

function handleLocalMove(move) {
    const engine = getEngine();

    if (!engine) {
        return false;
    }

    state.moveInProgress = true;

    try {
        const result = engine.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion || "q"
        });

        if (!result) {
            return false;
        }

        afterSuccessfulMove(result);

        return true;

    } catch (error) {
        console.error("Local move failed:", error);
        return false;

    } finally {
        state.moveInProgress = false;
    }
}


/* =====================================================
   14. COMPUTER PLAYER MOVE
===================================================== */

function handleComputerPlayerMove(move) {
    const engine = getEngine();

    if (!engine) {
        return false;
    }

    state.moveInProgress = true;

    try {
        const result = engine.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion || "q"
        });

        if (!result) {
            return false;
        }

        afterSuccessfulMove(result);

        if (!state.finished && state.active) {
            window.setTimeout(function () {
                playComputerTurn();
            }, 350);
        }

        return true;

    } catch (error) {
        console.error("Player move failed:", error);
        return false;

    } finally {
        state.moveInProgress = false;
    }
}


/* =====================================================
   15. ONLINE PLAYER MOVE
===================================================== */

async function handleOnlineMove(move) {
    const online = getOnline();
    const engine = getEngine();

    if (
        !online ||
        !engine ||
        typeof online.sendMove !== "function"
    ) {
        notify("Online connection is unavailable.", "error");
        return false;
    }

    state.moveInProgress = true;

    try {
        const expectedFen = engine.getFEN();

        const accepted = await online.sendMove({
            from: move.from,
            to: move.to,
            promotion: move.promotion || "q",
            expectedFen: expectedFen
        });

        if (!accepted) {
            notify("Move was not accepted.", "warning");
            return false;
        }

        /*
         * Do not modify the local chess engine here.
         * Firebase room listener will deliver the
         * authoritative updated FEN to both players.
         */

        return true;

    } catch (error) {
        console.error("Online move failed:", error);
        notify("Unable to send move.", "error");
        return false;

    } finally {
        state.moveInProgress = false;
    }
}


/* =====================================================
   16. COMPUTER AI TURN
===================================================== */

function playComputerTurn() {
    if (
        state.mode !== "computer" ||
        !state.active ||
        state.finished ||
        state.paused
    ) {
        return false;
    }

    const engine = getEngine();
    const ai = getAI();

    if (!engine || !ai) {
        return false;
    }

    if (engine.turn() === state.playerColor) {
        return false;
    }

    if (
        typeof ai.getBestMove !== "function" ||
        typeof engine.move !== "function"
    ) {
        return false;
    }

    state.moveInProgress = true;

    try {
        const bestMove = ai.getBestMove();

        if (!bestMove) {
            checkGameEnd();
            return false;
        }

        const result = engine.move({
            from: bestMove.from,
            to: bestMove.to,
            promotion: bestMove.promotion || "q"
        });

        if (!result) {
            notify("Computer could not complete its move.", "warning");
            return false;
        }

        afterSuccessfulMove(result);

        return true;

    } catch (error) {
        console.error("Computer turn failed:", error);
        return false;

    } finally {
        state.moveInProgress = false;
    }
}


/* =====================================================
   17. SUCCESSFUL MOVE PROCESSOR
===================================================== */

function afterSuccessfulMove(move) {
    const engine = getEngine();
    const board = getBoard();
    const timer = getTimer();

    if (!engine) {
        return false;
    }

    state.lastMove = move;

    state.lastPosition = engine.getFEN();

    if (board) {
        if (typeof board.setLastMove === "function") {
            board.setLastMove(move.from, move.to);
        }

        if (typeof board.clearSelection === "function") {
            board.clearSelection();
        }

        if (typeof board.refresh === "function") {
            board.refresh();
        }
    }

    if (timer && typeof timer.switchTurn === "function") {
        timer.switchTurn();
    }

    if (window.APPARA_SOUND) {
        if (move.captured) {
            window.APPARA_SOUND.capture();
        } else {
            window.APPARA_SOUND.move();
        }

        if (engine.isCheck && engine.isCheck()) {
            window.APPARA_SOUND.check();
        }
    }

    const game = getGame();

    if (game && typeof game.onMultiplayerMove === "function") {
        game.onMultiplayerMove(move);
    }

    checkGameEnd();

    emitStateChange();

    return true;
}


/* =====================================================
   18. REGISTER ONLINE ROOM HANDLER
===================================================== */

function registerRoomUpdateHandler() {
    const online = getOnline();

    if (
        !online ||
        typeof online.setRoomUpdateHandler !== "function"
    ) {
        return false;
    }

    online.setRoomUpdateHandler(function (roomData) {
        handleRoomUpdate(roomData);
    });

    state.roomHandlerBound = true;

    return true;
}


/* =====================================================
   19. RECEIVE ONLINE ROOM UPDATE
===================================================== */

function handleRoomUpdate(roomData) {
    if (
        !roomData ||
        state.mode !== "online" ||
        !state.active ||
        state.finished
    ) {
        return false;
    }

    const engine = getEngine();

    if (!engine) {
        return false;
    }

    if (roomData.status === "finished") {
        state.finished = true;
        state.active = false;

        const game = getGame();

        if (game && typeof game.onMultiplayerGameEnd === "function") {
            game.onMultiplayerGameEnd(
                roomData.result,
                roomData.reason
            );
        }

        emitStateChange();

        return true;
    }

    if (
        roomData.status !== "playing" ||
        !roomData.fen
    ) {
        return false;
    }

    const localFen = engine.getFEN();

    if (localFen === roomData.fen) {
        return true;
    }

    const loaded = engine.load(roomData.fen);

    if (!loaded) {
        console.error("Invalid FEN received from room.");
        return false;
    }

    state.lastPosition = roomData.fen;

    const board = getBoard();

    if (board && typeof board.refresh === "function") {
        board.refresh();
    }

    const game = getGame();

    if (game && typeof game.onMultiplayerMove === "function") {
        game.onMultiplayerMove({
            remote: true,
            fen: roomData.fen
        });
    }

    checkGameEnd();

    emitStateChange();

    return true;
}


/* =====================================================
   20. CHECK GAME END
===================================================== */

function checkGameEnd() {
    const engine = getEngine();

    if (!engine || state.finished) {
        return false;
    }

    if (
        typeof engine.isGameOver === "function" &&
        engine.isGameOver()
    ) {
        state.finished = true;
        state.active = false;

        const game = getGame();

        if (game && typeof game.checkGameEnd === "function") {
            game.checkGameEnd();
        }

        if (typeof state.onGameEnd === "function") {
            state.onGameEnd(engine.getGameStatus());
        }

        emitStateChange();

        return true;
    }

    return false;
}


/* =====================================================
   PART 2/3 END
   CONTINUE PART 3/3 BELOW THIS LINE
========================================================= */   
   /* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 21J — FINAL CONTROLS & PUBLIC API
   FILE: js/multiplayer.js
   PART 3/3
========================================================= */


/* =====================================================
   21. START ONLINE GAME
===================================================== */

function startOnline(options) {
    options = options || {};

    if (!validateModules()) {
        return false;
    }

    const engine = getEngine();
    const online = getOnline();

    if (!online) {
        notify("Online controller is unavailable.", "error");
        return false;
    }

    resetState("online");

    state.playerColor =
        options.playerColor === "b" ? "b" : "w";

    state.opponentColor =
        state.playerColor === "w" ? "b" : "w";

    state.roomCode =
        options.roomCode || online.getRoomCode();

    if (!state.roomCode) {
        notify("Room code is missing.", "error");
        return false;
    }

    connectBoard();

    const board = getBoard();

    if (board && typeof board.setOrientation === "function") {
        board.setOrientation(state.playerColor);
    }

    registerRoomUpdateHandler();

    const room = online.getRoom
        ? online.getRoom()
        : null;

    if (room) {
        handleRoomUpdate(room);
    }

    emitStateChange();

    return true;
}


/* =====================================================
   22. CONNECT ONLINE ROOM
===================================================== */

function connectOnlineRoom(roomCode, playerColor) {
    const online = getOnline();

    if (!online) {
        return false;
    }

    if (playerColor) {
        state.playerColor =
            playerColor === "b" ? "b" : "w";

        state.opponentColor =
            state.playerColor === "w" ? "b" : "w";
    }

    state.roomCode =
        roomCode || online.getRoomCode();

    if (!state.roomCode) {
        return false;
    }

    registerRoomUpdateHandler();

    const room = online.getRoom
        ? online.getRoom()
        : null;

    if (room) {
        handleRoomUpdate(room);
    }

    return true;
}


/* =====================================================
   23. RESIGN
===================================================== */

async function resign() {
    if (!state.active || state.finished) {
        return false;
    }

    if (state.mode === "online") {
        const online = getOnline();

        if (!online || typeof online.resign !== "function") {
            return false;
        }

        return await online.resign();
    }

    state.finished = true;
    state.active = false;

    const game = getGame();

    if (game && typeof game.onMultiplayerGameEnd === "function") {
        game.onMultiplayerGameEnd(
            state.opponentColor,
            "resignation"
        );
    }

    emitStateChange();

    return true;
}


/* =====================================================
   24. OFFER DRAW
===================================================== */

async function offerDraw() {
    if (!state.active || state.finished) {
        return false;
    }

    if (state.mode !== "online") {
        notify("Draw offers are available in online games.", "info");
        return false;
    }

    const online = getOnline();

    if (!online || typeof online.offerDraw !== "function") {
        return false;
    }

    return await online.offerDraw();
}


/* =====================================================
   25. RESPOND TO DRAW
===================================================== */

async function respondToDraw(accept) {
    if (state.mode !== "online") {
        return false;
    }

    const online = getOnline();

    if (!online || typeof online.respondToDraw !== "function") {
        return false;
    }

    return await online.respondToDraw(Boolean(accept));
}


/* =====================================================
   26. PAUSE GAME
===================================================== */

function pause() {
    if (!state.active || state.finished || state.paused) {
        return false;
    }

    state.paused = true;

    const timer = getTimer();

    if (timer && typeof timer.pause === "function") {
        timer.pause();
    }

    emitStateChange();

    return true;
}


/* =====================================================
   27. RESUME GAME
===================================================== */

function resume() {
    if (!state.active || state.finished || !state.paused) {
        return false;
    }

    state.paused = false;

    const timer = getTimer();

    if (timer && typeof timer.resume === "function") {
        timer.resume();
    }

    emitStateChange();

    return true;
}


/* =====================================================
   28. STOP GAME
===================================================== */

function stop() {
    state.active = false;
    state.finished = true;
    state.paused = false;
    state.moveInProgress = false;

    const timer = getTimer();

    if (timer && typeof timer.stop === "function") {
        timer.stop();
    }

    emitStateChange();

    return true;
}


/* =====================================================
   29. LEAVE ONLINE ROOM
===================================================== */

async function leaveRoom() {
    const online = getOnline();

    if (online && typeof online.leaveRoom === "function") {
        await online.leaveRoom();
    }

    stop();

    state.mode = "offline";
    state.roomCode = null;
    state.roomHandlerBound = false;

    emitStateChange();

    return true;
}


/* =====================================================
   30. GET CURRENT STATE
===================================================== */

function getState() {
    return {
        mode: state.mode,
        active: state.active,
        finished: state.finished,
        paused: state.paused,

        playerColor: state.playerColor,
        opponentColor: state.opponentColor,

        roomCode: state.roomCode,
        difficulty: state.difficulty,

        roomHandlerBound: state.roomHandlerBound,
        moveInProgress: state.moveInProgress,

        lastPosition: state.lastPosition,
        lastMove: state.lastMove
    };
}


/* =====================================================
   31. DESTROY CONTROLLER
===================================================== */

function destroy() {
    stop();

    const board = getBoard();

    if (board && typeof board.setMoveHandler === "function") {
        board.setMoveHandler(null);
    }

    state.onStateChange = null;
    state.onGameEnd = null;
    state.roomHandlerBound = false;

    return true;
}


/* =====================================================
   32. PUBLIC API
===================================================== */

return {
    startOffline: startOffline,
    startComputer: startComputer,
    startOnline: startOnline,

    connectBoard: connectBoard,
    connectOnlineRoom: connectOnlineRoom,
    registerRoomUpdateHandler: registerRoomUpdateHandler,

    handlePlayerMove: handlePlayerMove,
    handleOnlineMove: handleOnlineMove,
    handleRoomUpdate: handleRoomUpdate,

    playComputerTurn: playComputerTurn,
    afterSuccessfulMove: afterSuccessfulMove,
    checkGameEnd: checkGameEnd,

    resign: resign,
    offerDraw: offerDraw,
    respondToDraw: respondToDraw,

    pause: pause,
    resume: resume,
    stop: stop,
    leaveRoom: leaveRoom,

    setStateChangeHandler: setStateChangeHandler,
    setGameEndHandler: setGameEndHandler,
    getState: getState,

    destroy: destroy
};

})();


/* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 21J COMPLETE
========================================================= */
