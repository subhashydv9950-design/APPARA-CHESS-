/* =========================================================
   APPARA CHESS
   PART 21E — GAME CONTROLLER INTEGRATION
   PART 1/3
   ========================================================= */

window.APPARA_GAME = (function () {
    "use strict";

    /* -----------------------------------------------------
       GAME STATE
    ----------------------------------------------------- */

    let initialized = false;
    let gameStarted = false;
    let gamePaused = false;
    let gameFinished = false;

    let currentMode = "offline";
    let currentOptions = {};

    let resultRecorded = false;
    let lastKnownMoveCount = 0;
    let gameStartTime = null;

    let eventHandlersBound = false;

    /* -----------------------------------------------------
       DOM HELPERS
    ----------------------------------------------------- */

    function getElement(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const element = getElement(id);

        if (element) {
            element.textContent = String(value);
        }
    }

    function showElement(id) {
        const element = getElement(id);

        if (element) {
            element.classList.remove("hidden");
        }
    }

    function hideElement(id) {
        const element = getElement(id);

        if (element) {
            element.classList.add("hidden");
        }
    }

    function notify(message, type) {
        if (
            window.APPARA_APP &&
            typeof window.APPARA_APP.notify === "function"
        ) {
            window.APPARA_APP.notify(
                message,
                type || "info"
            );

            return;
        }

        const notification = getElement("notification");

        if (!notification) {
            console.log("[APPARA CHESS]", message);
            return;
        }

        notification.textContent = message;
        notification.className =
            "notification show " + (type || "info");

        window.setTimeout(function () {
            notification.classList.remove("show");
        }, 3000);
    }

    /* -----------------------------------------------------
       MODULE ACCESS
    ----------------------------------------------------- */

    function getEngine() {
        return window.APPARA_ENGINE || null;
    }

    function getMultiplayer() {
        return window.APPARA_MULTIPLAYER || null;
    }

    function getTimer() {
        return window.APPARA_TIMER || null;
    }

    function getProfile() {
        return window.APPARA_PROFILE || null;
    }

    /* -----------------------------------------------------
       INITIALIZATION
    ----------------------------------------------------- */

    function init() {
        if (initialized) return true;

        bindEvents();
        updateGameInterface();

        initialized = true;

        return true;
    }

    /* -----------------------------------------------------
       EVENT BINDINGS
    ----------------------------------------------------- */

    function bindEvents() {
        if (eventHandlersBound) return;

        eventHandlersBound = true;

        const quickPlayButton = getElement(
            "quick-play-btn"
        );

        if (quickPlayButton) {
            quickPlayButton.addEventListener(
                "click",
                function () {
                    startGame("computer", {
                        difficulty: "medium",
                        minutes: 10,
                        increment: 0
                    });
                }
            );
        }

        const undoButton = getElement("undo-btn");

        if (undoButton) {
            undoButton.addEventListener(
                "click",
                undoMove
            );
        }

        const flipButton = getElement(
            "flip-board-btn"
        );

        if (flipButton) {
            flipButton.addEventListener(
                "click",
                function () {
                    const board = window.APPARA_BOARD;

                    if (board && board.flip) {
                        board.flip();
                    }
                }
            );
        }

        const drawButton = getElement("draw-btn");

        if (drawButton) {
            drawButton.addEventListener(
                "click",
                offerDraw
            );
        }

        const resignButton = getElement(
            "resign-btn"
        );

        if (resignButton) {
            resignButton.addEventListener(
                "click",
                resign
            );
        }

        const pauseButton = getElement("pause-btn");

        if (pauseButton) {
            pauseButton.addEventListener(
                "click",
                togglePause
            );
        }

        document
            .querySelectorAll("[data-mode]")
            .forEach(function (button) {
                button.addEventListener(
                    "click",
                    function () {
                        const mode = button.getAttribute(
                            "data-mode"
                        );

                        if (!mode) return;

                        if (mode === "online") {
                            if (
                                window.APPARA_APP &&
                                window.APPARA_APP.navigate
                            ) {
                                window.APPARA_APP.navigate(
                                    "online"
                                );
                            }

                            return;
                        }

                        startGame(mode);
                    }
                );
            });
    }

    /* -----------------------------------------------------
       GAME START
    ----------------------------------------------------- */

    function startGame(mode, options) {
        const multiplayer = getMultiplayer();

        if (!multiplayer) {
            notify(
                "Multiplayer module उपलब्ध नहीं है।",
                "error"
            );

            return false;
        }

        mode = mode || "offline";
        options = options || {};

        if (
            !["offline", "computer", "online", "training"]
                .includes(mode)
        ) {
            notify("Invalid game mode.", "error");
            return false;
        }

        currentMode = mode;

        currentOptions = {
            minutes: Number(options.minutes) || 10,
            increment: Number(options.increment) || 0,
            difficulty: options.difficulty || "medium",
            playerColor: options.playerColor || "w",
            roomCode: options.roomCode || null
        };

        gameStarted = false;
        gamePaused = false;
        gameFinished = false;
        resultRecorded = false;

        lastKnownMoveCount = 0;
        gameStartTime = Date.now();

        initializeTimer();

        let started = false;

        try {
            if (mode === "offline") {
                started = multiplayer.startOffline(
                    currentOptions
                );
            } else if (mode === "computer") {
                started = multiplayer.startComputer(
                    currentOptions
                );
            } else if (mode === "online") {
                started = multiplayer.startOnline(
                    currentOptions
                );
            } else if (mode === "training") {
                started = multiplayer.startOffline(
                    currentOptions
                );
            }
        } catch (error) {
            console.error(
                "APPARA game start error:",
                error
            );

            notify(
                "Game शुरू नहीं हो पाया।",
                "error"
            );

            return false;
        }

        if (started === false) {
            notify(
                "Game शुरू नहीं हो पाया।",
                "error"
            );

            return false;
        }

        gameStarted = true;

        if (mode !== "online") {
            const timer = getTimer();

            if (timer && typeof timer.start === "function") {
                timer.start();
            }
        }

        updateGameInterface();

        if (
            window.APPARA_APP &&
            typeof window.APPARA_APP.navigate === "function"
        ) {
            window.APPARA_APP.navigate("game");
        }

        if (
            window.APPARA_SOUND &&
            typeof window.APPARA_SOUND.gameStart === "function"
        ) {
            window.APPARA_SOUND.gameStart();
        }

        notify("Game started!", "success");

        return true;
    }

    /* -----------------------------------------------------
       TIMER INITIALIZATION
    ----------------------------------------------------- */

    function initializeTimer() {
        const timer = getTimer();

        if (!timer || typeof timer.init !== "function") {
            return false;
        }

        timer.init({
            minutes: currentOptions.minutes || 10,

            increment: currentOptions.increment || 0,

            onTick: function (times) {
                updateClockDisplay(times);
            },

            onTimeout: function (color) {
                handleTimeout(color);
            },

            onTurnChange: function (color) {
                updateTurnDisplay(color);
            }
        });

        updateClockDisplay(
            timer.getTimes ? timer.getTimes() : null
        );

        return true;
    }

    /* -----------------------------------------------------
       CLOCK DISPLAY
    ----------------------------------------------------- */

    function updateClockDisplay(times) {
        if (!times) return;

        const timer = getTimer();

        if (!timer || !timer.formatTime) return;

        const whiteTime = timer.formatTime(
            times.w
        );

        const blackTime = timer.formatTime(
            times.b
        );

        setText("white-clock", whiteTime);
        setText("black-clock", blackTime);

        const whiteClock = getElement("white-clock");
        const blackClock = getElement("black-clock");

        if (whiteClock) {
            whiteClock.classList.toggle(
                "clock-active",
                timer.getActiveColor &&
                timer.getActiveColor() === "w"
            );
        }

        if (blackClock) {
            blackClock.classList.toggle(
                "clock-active",
                timer.getActiveColor &&
                timer.getActiveColor() === "b"
            );
        }
    }

    /* -----------------------------------------------------
       TURN DISPLAY
    ----------------------------------------------------- */

    function updateTurnDisplay(color) {
        const label = color === "w"
            ? "White to move"
            : "Black to move";

        setText("current-turn", label);
        setText("game-status", label);
    }

    /* -----------------------------------------------------
       GAME INTERFACE
    ----------------------------------------------------- */

    function updateGameInterface() {
        const modeLabels = {
            offline: "LOCAL 2 PLAYER",
            computer: "VS COMPUTER",
            online: "ONLINE MATCH",
            training: "TRAINING MODE"
        };

        setText(
            "game-mode-label",
            modeLabels[currentMode] || "CHESS MATCH"
        );

        const engine = getEngine();

        if (engine && engine.getGameStatus) {
            const status = engine.getGameStatus();

            if (status && status.message) {
                setText(
                    "game-status",
                    status.message
                );
            }
        }

        updateTurnDisplay(
            engine && engine.turn
                ? engine.turn()
                : "w"
        );
    }

/* =========================================================
   PART 21E — PART 1/3 END
   CONTINUE IN SAME FILE WITH PART 2/3
   ========================================================= */
               
/* =========================================================
   APPARA CHESS
   PART 21E — GAME CONTROLLER INTEGRATION
   PART 2/3
   ========================================================= */

    /* -----------------------------------------------------
       UNDO MOVE
    ----------------------------------------------------- */

    function undoMove() {
        if (!gameStarted || gameFinished || gamePaused) {
            notify("अभी Undo उपलब्ध नहीं है।", "warning");
            return false;
        }

        if (currentMode === "online") {
            notify(
                "Online match में Undo उपलब्ध नहीं है।",
                "warning"
            );
            return false;
        }

        const engine = getEngine();

        if (!engine || !engine.undo) {
            return false;
        }

        const history = engine.getHistory
            ? engine.getHistory()
            : [];

        if (!history || history.length === 0) {
            notify("Undo करने के लिए कोई move नहीं है।");
            return false;
        }

        /* Computer mode: undo computer move and player move. */
        let undoCount = 1;

        if (currentMode === "computer") {
            undoCount = Math.min(2, history.length);
        }

        let undone = 0;

        for (let i = 0; i < undoCount; i++) {
            const move = engine.undo();

            if (!move) break;

            undone++;
        }

        if (!undone) {
            notify("Move Undo नहीं हो पाया।", "error");
            return false;
        }

        refreshBoardAndHistory();

        /* Reset clock after undo to avoid incorrect turn timing. */
        const timer = getTimer();

        if (timer) {
            if (timer.stop) timer.stop();

            if (timer.reset) {
                timer.reset({
                    minutes: currentOptions.minutes,
                    increment: currentOptions.increment
                });
            }

            if (timer.start) timer.start();
        }

        lastKnownMoveCount = engine.getHistory
            ? engine.getHistory().length
            : 0;

        updateGameInterface();

        notify("Move Undo हो गया।", "success");

        return true;
    }

    /* -----------------------------------------------------
       BOARD AND MOVE HISTORY REFRESH
    ----------------------------------------------------- */

    function refreshBoardAndHistory() {
        const board = window.APPARA_BOARD;

        if (board) {
            if (board.clearSelection) {
                board.clearSelection();
            }

            if (board.refresh) {
                board.refresh();
            } else if (board.render) {
                board.render();
            }
        }

        renderMoveHistory();
        renderCapturedPieces();
    }

    function renderMoveHistory() {
        const container = getElement("move-history");
        const engine = getEngine();

        if (!container || !engine || !engine.getHistory) {
            return;
        }

        const history = engine.getHistory() || [];

        container.innerHTML = "";

        for (let i = 0; i < history.length; i += 2) {
            const whiteMove = history[i];
            const blackMove = history[i + 1];

            const row = document.createElement("div");
            row.className = "move-history-row";

            const number = document.createElement("span");
            number.className = "move-number";
            number.textContent = String(
                Math.floor(i / 2) + 1
            ) + ".";

            const white = document.createElement("span");
            white.className = "move-white";
            white.textContent = whiteMove
                ? whiteMove.san
                : "";

            const black = document.createElement("span");
            black.className = "move-black";
            black.textContent = blackMove
                ? blackMove.san
                : "";

            row.appendChild(number);
            row.appendChild(white);
            row.appendChild(black);

            container.appendChild(row);
        }

        setText("move-count", history.length);
        container.scrollTop = container.scrollHeight;
    }

    /* -----------------------------------------------------
       CAPTURED PIECES
    ----------------------------------------------------- */

    function renderCapturedPieces() {
        const engine = getEngine();

        if (!engine || !engine.getCapturedPieces) {
            return;
        }

        const captured = engine.getCapturedPieces();

        if (!captured) return;

        const whiteContainer = getElement(
            "captured-white"
        );

        const blackContainer = getElement(
            "captured-black"
        );

        function makePieceSymbols(pieces) {
            if (!Array.isArray(pieces)) return "";

            const symbols = {
                p: "♟",
                n: "♞",
                b: "♝",
                r: "♜",
                q: "♛",
                k: "♚"
            };

            return pieces.map(function (piece) {
                const type = typeof piece === "string"
                    ? piece
                    : piece.type;

                return symbols[String(type || "").toLowerCase()] || "";
            }).join("");
        }

        if (whiteContainer) {
            whiteContainer.textContent =
                makePieceSymbols(
                    captured.white || captured.w || []
                );
        }

        if (blackContainer) {
            blackContainer.textContent =
                makePieceSymbols(
                    captured.black || captured.b || []
                );
        }
    }

    /* -----------------------------------------------------
       PAUSE / RESUME
    ----------------------------------------------------- */

    function togglePause() {
        if (!gameStarted || gameFinished) {
            return false;
        }

        if (gamePaused) {
            return resumeGame();
        }

        return pauseGame();
    }

    function pauseGame() {
        if (
            !gameStarted ||
            gameFinished ||
            gamePaused
        ) {
            return false;
        }

        if (currentMode === "online") {
            notify(
                "Online match में local pause लागू नहीं है।",
                "warning"
            );
            return false;
        }

        gamePaused = true;

        const timer = getTimer();

        if (timer && timer.pause) {
            timer.pause();
        }

        const multiplayer = getMultiplayer();

        if (multiplayer && multiplayer.pause) {
            multiplayer.pause();
        }

        setText("pause-btn", "Resume");

        notify("Game paused.", "info");

        return true;
    }

    function resumeGame() {
        if (
            !gameStarted ||
            gameFinished ||
            !gamePaused
        ) {
            return false;
        }

        gamePaused = false;

        const timer = getTimer();

        if (timer && timer.resume) {
            timer.resume();
        }

        const multiplayer = getMultiplayer();

        if (multiplayer && multiplayer.resume) {
            multiplayer.resume();
        }

        setText("pause-btn", "Pause");

        notify("Game resumed.", "success");

        return true;
    }

    /* -----------------------------------------------------
       TIMEOUT HANDLING
    ----------------------------------------------------- */

    function handleTimeout(color) {
        if (gameFinished || !gameStarted) return;

        const losingColor = color === "b" ? "b" : "w";
        const winningColor = losingColor === "w" ? "b" : "w";

        const engine = getEngine();

        /*
         * A timeout is a draw if the opponent cannot
         * possibly checkmate with the remaining material.
         */
        let isDraw = false;

        if (
            engine &&
            engine.getGame &&
            engine.getGame()
        ) {
            const chessGame = engine.getGame();

            if (
                typeof chessGame.insufficient_material ===
                "function"
            ) {
                isDraw = chessGame.insufficient_material();
            }
        }

        if (isDraw) {
            finishGame("draw", "Time out — insufficient material");
            return;
        }

        finishGame(
            winningColor === "w" ? "white" : "black",
            "Time out"
        );
    }

    /* -----------------------------------------------------
       DRAW OFFER
    ----------------------------------------------------- */

    function offerDraw() {
        if (!gameStarted || gameFinished) {
            return false;
        }

        if (currentMode === "online") {
            notify(
                "Online draw offer के लिए server-side draw system जरूरी है।",
                "warning"
            );

            return false;
        }

        const confirmed = window.confirm(
            "क्या आप इस game को Draw घोषित करना चाहते हैं?"
        );

        if (!confirmed) return false;

        finishGame("draw", "Draw agreed");

        return true;
    }

    /* -----------------------------------------------------
       RESIGN
    ----------------------------------------------------- */

    function resign() {
        if (!gameStarted || gameFinished) {
            return false;
        }

        const confirmed = window.confirm(
            "क्या आप यह game resign करना चाहते हैं?"
        );

        if (!confirmed) return false;

        const engine = getEngine();

        const currentTurn = engine && engine.turn
            ? engine.turn()
            : "w";

        const losingColor = currentTurn;
        const winningColor = losingColor === "w" ? "b" : "w";

        if (currentMode === "online") {
            const multiplayer = getMultiplayer();

            if (multiplayer && multiplayer.resign) {
                multiplayer.resign();
            }
        }

        finishGame(
            winningColor === "w" ? "white" : "black",
            "Resigned"
        );

        return true;
    }

/* =========================================================
   PART 21E — PART 2/3 END
   CONTINUE IN SAME FILE WITH PART 3/3
   ========================================================= */
   
/* =========================================================
   APPARA CHESS
   PART 21E — GAME CONTROLLER INTEGRATION
   PART 3/3
   ========================================================= */

    /* -----------------------------------------------------
       FINISH GAME
    ----------------------------------------------------- */

    function finishGame(result, reason) {
        if (gameFinished) return false;

        gameFinished = true;
        gameStarted = false;
        gamePaused = false;

        const timer = getTimer();

        if (timer && timer.stop) {
            timer.stop();
        }

        const multiplayer = getMultiplayer();

        /*
         * Do not call multiplayer.finishGame() here.
         * Its own finish callback may call this function.
         */

        recordGameResult(result, reason);

        const resultTitle = getResultTitle(result);

        setText("game-status", resultTitle);
        setText("current-turn", resultTitle);

        setText(
            "pause-btn",
            "Pause"
        );

        if (
            window.APPARA_SOUND &&
            typeof window.APPARA_SOUND.gameEnd === "function"
        ) {
            window.APPARA_SOUND.gameEnd();
        }

        showGameResult(result, reason);

        notify(
            resultTitle + (reason ? " — " + reason : ""),
            result === "draw" ? "info" : "success"
        );

        return true;
    }

    /* -----------------------------------------------------
       RESULT TITLE
    ----------------------------------------------------- */

    function getResultTitle(result) {
        if (result === "white") {
            return "White Wins!";
        }

        if (result === "black") {
            return "Black Wins!";
        }

        if (result === "draw") {
            return "Game Draw!";
        }

        return "Game Finished";
    }

    /* -----------------------------------------------------
       RESULT RECORDING
    ----------------------------------------------------- */

    function recordGameResult(result, reason) {
        if (resultRecorded) return false;

        resultRecorded = true;

        const profile = getProfile();

        if (!profile || !profile.recordGame) {
            return false;
        }

        /*
         * Local two-player games do not have a single
         * profile winner, so only computer and online
         * games are recorded as personal results.
         */

        if (
            currentMode !== "computer" &&
            currentMode !== "online"
        ) {
            return false;
        }

        let playerResult = "draw";

        if (result !== "draw") {
            const playerColor =
                currentMode === "computer"
                    ? "w"
                    : currentOptions.playerColor;

            const playerWon =
                (result === "white" && playerColor === "w") ||
                (result === "black" && playerColor === "b");

            playerResult = playerWon ? "win" : "loss";
        }

        const engine = getEngine();

        const gameData = {
            mode: currentMode,
            result: playerResult,
            reason: reason || "",
            moves: engine && engine.getHistory
                ? engine.getHistory().length
                : 0,
            duration: gameStartTime
                ? Math.max(
                    0,
                    Math.floor(
                        (Date.now() - gameStartTime) / 1000
                    )
                )
                : 0,
            date: Date.now()
        };

        try {
            profile.recordGame(gameData);
        } catch (error) {
            console.error(
                "APPARA result recording error:",
                error
            );

            return false;
        }

        return true;
    }

    /* -----------------------------------------------------
       GAME RESULT DISPLAY
    ----------------------------------------------------- */

    function showGameResult(result, reason) {
        const title = getResultTitle(result);

        const content =
            '<div class="game-result-content">' +
                '<div class="game-result-icon">' +
                    (result === "draw" ? "🤝" : "🏆") +
                '</div>' +
                '<h2>' + escapeText(title) + '</h2>' +
                '<p>' + escapeText(reason || "Game completed") + '</p>' +
                '<button type="button" id="result-new-game">' +
                    'New Game' +
                '</button>' +
                '<button type="button" id="result-close">' +
                    'Close' +
                '</button>' +
            '</div>';

        if (
            window.APPARA_APP &&
            typeof window.APPARA_APP.openModal === "function"
        ) {
            window.APPARA_APP.openModal(
                "Game Result",
                content
            );
        } else {
            const modal = getElement("global-modal");
            const modalContent = getElement("modal-content");

            if (modal && modalContent) {
                modalContent.innerHTML = content;
                modal.classList.add("active");
            }
        }

        const newGameButton = getElement(
            "result-new-game"
        );

        if (newGameButton) {
            newGameButton.addEventListener(
                "click",
                function () {
                    closeResultModal();

                    startGame(
                        currentMode === "online"
                            ? "offline"
                            : currentMode,
                        currentOptions
                    );
                }
            );
        }

        const closeButton = getElement(
            "result-close"
        );

        if (closeButton) {
            closeButton.addEventListener(
                "click",
                closeResultModal
            );
        }
    }

    function escapeText(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function closeResultModal() {
        if (
            window.APPARA_APP &&
            typeof window.APPARA_APP.closeModal === "function"
        ) {
            window.APPARA_APP.closeModal();
            return;
        }

        const modal = getElement("global-modal");

        if (modal) {
            modal.classList.remove("active");
        }
    }

    /* -----------------------------------------------------
       CHECK GAME END
    ----------------------------------------------------- */

    function checkGameEnd() {
        if (gameFinished) return true;

        const engine = getEngine();

        if (!engine || !engine.getGameStatus) {
            return false;
        }

        const status = engine.getGameStatus();

        if (!status || !status.isOver) {
            return false;
        }

        const statusText = String(
            status.status || ""
        ).toLowerCase();

        if (
            statusText.includes("checkmate") ||
            statusText.includes("mate")
        ) {
            const winner = engine.turn() === "w"
                ? "black"
                : "white";

            finishGame(winner, "Checkmate");
            return true;
        }

        finishGame(
            "draw",
            status.message || "Draw"
        );

        return true;
    }

    /* -----------------------------------------------------
       MULTIPLAYER CALLBACKS
    ----------------------------------------------------- */

    function onMultiplayerMove(move) {
        if (gameFinished) return;

        renderMoveHistory();
        renderCapturedPieces();

        const engine = getEngine();

        if (engine && engine.getHistory) {
            lastKnownMoveCount =
                engine.getHistory().length;
        }

        updateGameInterface();

        if (
            window.APPARA_SOUND &&
            typeof window.APPARA_SOUND.move === "function"
        ) {
            if (move && move.captured) {
                window.APPARA_SOUND.capture();
            } else {
                window.APPARA_SOUND.move();
            }
        }

        checkGameEnd();
    }

    function onMultiplayerGameEnd(result, reason) {
        if (gameFinished) return;

        finishGame(
            result || "draw",
            reason || "Match completed"
        );
    }

    /* -----------------------------------------------------
       NEW GAME / RESET
    ----------------------------------------------------- */

    function resetGameState() {
        gameStarted = false;
        gamePaused = false;
        gameFinished = false;
        resultRecorded = false;

        lastKnownMoveCount = 0;
        gameStartTime = null;

        setText("pause-btn", "Pause");

        return true;
    }

    /* -----------------------------------------------------
       PUBLIC STATE
    ----------------------------------------------------- */

    function getState() {
        return {
            initialized: initialized,
            started: gameStarted,
            paused: gamePaused,
            finished: gameFinished,
            mode: currentMode,
            options: Object.assign({}, currentOptions),
            resultRecorded: resultRecorded,
            moveCount: lastKnownMoveCount,
            startTime: gameStartTime
        };
    }

    /* -----------------------------------------------------
       CLEANUP
    ----------------------------------------------------- */

    function destroy() {
        const timer = getTimer();

        if (timer && timer.stop) {
            timer.stop();
        }

        resetGameState();

        initialized = false;
        eventHandlersBound = false;
    }

    /* -----------------------------------------------------
       PUBLIC API
    ----------------------------------------------------- */

    return {
        init: init,
        startGame: startGame,

        undoMove: undoMove,
        pauseGame: pauseGame,
        resumeGame: resumeGame,
        togglePause: togglePause,

        offerDraw: offerDraw,
        resign: resign,
        finishGame: finishGame,
        checkGameEnd: checkGameEnd,

        renderMoveHistory: renderMoveHistory,
        renderCapturedPieces: renderCapturedPieces,
        refreshBoardAndHistory: refreshBoardAndHistory,

        onMultiplayerMove: onMultiplayerMove,
        onMultiplayerGameEnd: onMultiplayerGameEnd,

        updateGameInterface: updateGameInterface,
        getState: getState,
        resetGameState: resetGameState,
        destroy: destroy
    };

})();

/* =========================================================
   APPARA CHESS — PART 21E COMPLETE
   GAME CONTROLLER FILE END
   ========================================================= */
   
