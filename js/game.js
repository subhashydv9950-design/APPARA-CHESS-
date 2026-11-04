/* =========================================================
   APPARA CHESS — GAME CONTROLLER
   PART 21G — INTEGRATION REPAIR
   FILE: js/game.js
   PART 1/3 — CORE, EVENTS & TIMER
========================================================= */

window.APPARA_GAME = (function () {
    "use strict";

    /* =====================================================
       1. GAME STATE
    ===================================================== */

    const state = {
        initialized: false,
        gameStarted: false,
        gameFinished: false,
        gamePaused: false,

        mode: "offline",
        playerColor: "w",

        difficulty: "medium",

        currentOptions: {
            minutes: 10,
            increment: 0,
            playerColor: "w",
            difficulty: "medium"
        },

        result: null,
        resultRecorded: false,

        moveCount: 0,
        startTime: null,
        endTime: null,

        lastResult: null,
        timerInitialized: false,

        eventsBound: false
    };


    /* =====================================================
       2. DOM HELPERS
    ===================================================== */

    function $(selector) {
        return document.querySelector(selector);
    }

    function $all(selector) {
        return Array.from(document.querySelectorAll(selector));
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const element = getElement(id);

        if (element) {
            element.textContent = value;
        }
    }

    function showElement(element) {
        if (element) {
            element.classList.remove("hidden");
            element.style.display = "";
        }
    }

    function hideElement(element) {
        if (element) {
            element.classList.add("hidden");
            element.style.display = "none";
        }
    }


    /* =====================================================
       3. MODULE ACCESS
    ===================================================== */

    function getEngine() {
        return window.APPARA_ENGINE || null;
    }

    function getBoard() {
        return window.APPARA_BOARD || null;
    }

    function getTimer() {
        return window.APPARA_TIMER || null;
    }

    function getSound() {
        return window.APPARA_SOUND || null;
    }

    function getProfile() {
        return window.APPARA_PROFILE || null;
    }

    function getMultiplayer() {
        return window.APPARA_MULTIPLAYER || null;
    }


    /* =====================================================
       4. NOTIFICATION
    ===================================================== */

    function notify(message, type) {
        if (
            window.APPARA_APP &&
            typeof window.APPARA_APP.notify === "function"
        ) {
            window.APPARA_APP.notify(message, type || "info");
            return;
        }

        console.log("[APPARA CHESS]", message);
    }


    /* =====================================================
       5. INITIALIZATION
    ===================================================== */

    function init() {
        if (state.initialized) {
            return true;
        }

        const engine = getEngine();
        const board = getBoard();

        if (!engine || !board) {
            console.error(
                "APPARA CHESS: Engine or Board module missing."
            );

            return false;
        }

        bindEvents();

        state.initialized = true;

        updateGameInterface();

        console.log("APPARA CHESS Game Controller initialized.");

        return true;
    }


    /* =====================================================
       6. EVENT BINDING
    ===================================================== */

    function bindEvents() {
        if (state.eventsBound) {
            return;
        }

        const modeButtons = $all("[data-mode]");

        modeButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                const mode = button.dataset.mode;

                if (mode === "offline") {
                    startGame("offline");
                }

                if (mode === "computer") {
                    startGame("computer");
                }

                if (mode === "online") {
                    if (
                        window.APPARA_APP &&
                        typeof window.APPARA_APP.navigate === "function"
                    ) {
                        window.APPARA_APP.navigate("online");
                    }
                }

                if (mode === "training") {
                    startGame("training");
                }
            });
        });


        const quickPlayButton = getElement("quick-play-btn");

        if (quickPlayButton) {
            quickPlayButton.addEventListener("click", function () {
                startGame("computer");
            });
        }


        const undoButton = getElement("undo-btn");

        if (undoButton) {
            undoButton.addEventListener("click", undoMove);
        }


        const flipButton = getElement("flip-board-btn");

        if (flipButton) {
            flipButton.addEventListener("click", function () {
                const board = getBoard();

                if (board && typeof board.flip === "function") {
                    board.flip();
                }
            });
        }


        const pauseButton = getElement("pause-btn");

        if (pauseButton) {
            pauseButton.addEventListener("click", function () {
                if (state.gamePaused) {
                    resumeGame();
                } else {
                    pauseGame();
                }
            });
        }


        const resignButton = getElement("resign-btn");

        if (resignButton) {
            resignButton.addEventListener("click", resignGame);
        }


        const drawButton = getElement("draw-btn");

        if (drawButton) {
            drawButton.addEventListener("click", offerDraw);
        }


        state.eventsBound = true;
    }


    /* =====================================================
       7. START NEW GAME
    ===================================================== */

    function startGame(mode, options) {
        const engine = getEngine();
        const board = getBoard();

        if (!engine || !board) {
            notify("Game modules are not ready.", "error");
            return false;
        }

        options = options || {};

        const selectedMode = mode || "offline";

        const minutes = Number(
            options.minutes || 10
        );

        const increment = Number(
            options.increment || 0
        );

        const playerColor =
            options.playerColor === "b" ? "b" : "w";

        const difficulty =
            options.difficulty || "medium";


        /* Stop previous game safely. */

        stopGameTimer();

        state.gameStarted = false;
        state.gameFinished = false;
        state.gamePaused = false;

        state.result = null;
        state.resultRecorded = false;

        state.moveCount = 0;
        state.startTime = Date.now();
        state.endTime = null;

        state.mode = selectedMode;
        state.playerColor = playerColor;
        state.difficulty = difficulty;

        state.currentOptions = {
            minutes: minutes,
            increment: increment,
            playerColor: playerColor,
            difficulty: difficulty
        };


        /* Reset chess position. */

        if (typeof engine.reset === "function") {
            engine.reset();
        } else if (typeof engine.createGame === "function") {
            engine.createGame();
        }


        /* Set board orientation. */

        if (typeof board.setOrientation === "function") {
            board.setOrientation(
                selectedMode === "computer" ? playerColor : "w"
            );
        }


        /* Clear previous board selection. */

        if (typeof board.clearSelection === "function") {
            board.clearSelection();
        }


        if (typeof board.clearLastMove === "function") {
            board.clearLastMove();
        }


        if (typeof board.render === "function") {
            board.render();
        }


        /* Prepare game timer. */

        initializeTimer(minutes, increment);


        /* Start selected game mode. */

        const multiplayer = getMultiplayer();

        if (multiplayer) {
            if (selectedMode === "offline") {
                multiplayer.startOffline();
            }

            if (selectedMode === "computer") {
                multiplayer.startComputer({
                    playerColor: playerColor,
                    difficulty: difficulty
                });
            }

            if (selectedMode === "training") {
                multiplayer.startOffline();
            }
        }


        state.gameStarted = true;

        state.gamePaused = false;

        updateGameInterface();

        updateMoveHistory();

        renderCapturedPieces();

        updateTurnDisplay();

        playGameStartSound();

        if (window.APPARA_APP) {
            window.APPARA_APP.navigate("game");
        }

        notify("New game started.", "success");

        return true;
    }


    /* =====================================================
       8. TIMER INITIALIZATION
    ===================================================== */

    function initializeTimer(minutes, increment) {
        const timer = getTimer();

        if (!timer) {
            state.timerInitialized = false;
            return false;
        }

        const whiteClock = getElement("white-clock");
        const blackClock = getElement("black-clock");

        if (
            typeof timer.init !== "function"
        ) {
            console.warn("Timer initialization method missing.");
            return false;
        }

        timer.init({
            minutes: Number(minutes) || 10,
            increment: Number(increment) || 0,

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

        state.timerInitialized = true;

        if (whiteClock) {
            whiteClock.classList.remove("active");
        }

        if (blackClock) {
            blackClock.classList.remove("active");
        }

        return true;
    }


    /* =====================================================
       9. START TIMER
    ===================================================== */

    function startGameTimer() {
        const timer = getTimer();

        if (!timer || !state.timerInitialized) {
            return false;
        }

        if (typeof timer.start === "function") {
            timer.start();
            return true;
        }

        return false;
    }


    /* =====================================================
       10. STOP TIMER
    ===================================================== */

    function stopGameTimer() {
        const timer = getTimer();

        if (timer && typeof timer.stop === "function") {
            timer.stop();
        }

        state.timerInitialized = false;
    }


    /* =====================================================
       11. CLOCK DISPLAY
    ===================================================== */

    function updateClockDisplay(times) {
        const timer = getTimer();

        if (!times && timer && typeof timer.getTimes === "function") {
            times = timer.getTimes();
        }

        if (!times) {
            return;
        }

        const whiteTime =
            times.w !== undefined ? times.w : times.white;

        const blackTime =
            times.b !== undefined ? times.b : times.black;

        const format = timer &&
            typeof timer.formatTime === "function"
                ? timer.formatTime.bind(timer)
                : function (seconds) {
                    const safeSeconds = Math.max(
                        0,
                        Number(seconds) || 0
                    );

                    const minutes = Math.floor(safeSeconds / 60);
                    const remaining = Math.floor(safeSeconds % 60);

                    return (
                        String(minutes).padStart(2, "0") +
                        ":" +
                        String(remaining).padStart(2, "0")
                    );
                };


        if (whiteTime !== undefined) {
            setText("white-clock", format(whiteTime));
        }

        if (blackTime !== undefined) {
            setText("black-clock", format(blackTime));
        }
    }


    /* =====================================================
       12. TURN DISPLAY
    ===================================================== */

    function updateTurnDisplay(color) {
        const engine = getEngine();

        if (!color && engine && typeof engine.turn === "function") {
            color = engine.turn();
        }

        if (!color) {
            color = "w";
        }

        const whitePanel = $(".player-panel.white");
        const blackPanel = $(".player-panel.black");

        if (whitePanel) {
            whitePanel.classList.toggle("active", color === "w");
        }

        if (blackPanel) {
            blackPanel.classList.toggle("active", color === "b");
        }

        const turnText = getElement("current-turn");

        if (turnText) {
            turnText.textContent =
                color === "w" ? "White to move" : "Black to move";
        }
    }


    /* =====================================================
       13. GAME INTERFACE UPDATE
    ===================================================== */

    function updateGameInterface() {
        const engine = getEngine();

        if (!engine) {
            return;
        }

        updateTurnDisplay();

        updateMoveHistory();

        renderCapturedPieces();

        updateClockDisplay();

        setText(
            "move-count",
            String(state.moveCount)
        );

        const pauseButton = getElement("pause-btn");

        if (pauseButton) {
            pauseButton.textContent =
                state.gamePaused ? "Resume" : "Pause";
        }

        const gameStatus = getElement("game-status");

        if (gameStatus) {
            gameStatus.textContent =
                state.gameFinished
                    ? "Game finished"
                    : state.gamePaused
                        ? "Game paused"
                        : "Game in progress";
        }
    }


    /* =====================================================
       14. GAME START SOUND
    ===================================================== */

    function playGameStartSound() {
        const sound = getSound();

        if (sound && typeof sound.gameStart === "function") {
            sound.gameStart();
        }
    }


    /* =====================================================
       PART 1/3 END
       CONTINUE PART 2/3 BELOW THIS LINE
    ===================================================== */

           /* =========================================================
   PART 21G — INTEGRATION REPAIR
   FILE: js/game.js
   PART 2/3 — UNDO, HISTORY, CAPTURED PIECES & GAME CONTROL
========================================================= */


/* =========================================================
   15. UNDO MOVE
========================================================= */

function undoMove() {
    const engine = getEngine();
    const board = getBoard();

    if (!engine || !state.gameStarted || state.gameFinished) {
        notify("No active game to undo.", "warning");
        return false;
    }

    if (state.gamePaused) {
        notify("Resume the game before undoing.", "warning");
        return false;
    }

    const history = engine.getHistory();

    if (!Array.isArray(history) || history.length === 0) {
        notify("There are no moves to undo.", "warning");
        return false;
    }

    const multiplayer = getMultiplayer();

    if (state.mode === "online") {
        notify("Undo is unavailable during an online match.", "warning");
        return false;
    }

    const undoCount =
        state.mode === "computer" && history.length >= 2
            ? 2
            : 1;

    let undone = false;

    for (let i = 0; i < undoCount; i++) {
        const result = engine.undo();

        if (!result) {
            break;
        }

        undone = true;
    }

    if (!undone) {
        notify("Unable to undo this move.", "error");
        return false;
    }

    state.moveCount = Math.max(
        0,
        state.moveCount - undoCount
    );

    if (board && typeof board.clearSelection === "function") {
        board.clearSelection();
    }

    if (board && typeof board.clearLastMove === "function") {
        board.clearLastMove();
    }

    if (board && typeof board.render === "function") {
        board.render();
    }

    updateMoveHistory();
    renderCapturedPieces();
    updateTurnDisplay();
    updateGameInterface();

    notify("Move undone.", "success");

    return true;
}


/* =========================================================
   16. MOVE HISTORY
========================================================= */

function updateMoveHistory() {
    const engine = getEngine();

    if (!engine) {
        return;
    }

    const historyContainer = getElement("move-history");

    if (!historyContainer) {
        return;
    }

    const history = engine.getHistory();

    if (!Array.isArray(history) || history.length === 0) {
        historyContainer.innerHTML =
            '<div class="empty-history">Moves will appear here</div>';

        state.moveCount = 0;
        setText("move-count", "0");

        return;
    }

    state.moveCount = history.length;

    let html = "";

    for (let i = 0; i < history.length; i += 2) {
        const moveNumber = Math.floor(i / 2) + 1;

        const whiteMove = history[i] || "";
        const blackMove = history[i + 1] || "";

        html += `
            <div class="history-row">
                <span class="history-number">${moveNumber}.</span>
                <span class="history-white">${escapeHTML(whiteMove)}</span>
                <span class="history-black">${escapeHTML(blackMove)}</span>
            </div>
        `;
    }

    historyContainer.innerHTML = html;

    historyContainer.scrollTop =
        historyContainer.scrollHeight;

    setText("move-count", String(history.length));
}


/* =========================================================
   17. SAFE HTML TEXT
========================================================= */

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   18. CAPTURED PIECES
========================================================= */

function renderCapturedPieces() {
    const engine = getEngine();

    if (!engine || typeof engine.getCapturedPieces !== "function") {
        return;
    }

    const captured = engine.getCapturedPieces();

    if (!captured) {
        return;
    }

    const whiteCaptured =
        captured.white || captured.w || [];

    const blackCaptured =
        captured.black || captured.b || [];

    const whiteContainer = getElement("captured-white");
    const blackContainer = getElement("captured-black");

    function renderPieces(container, pieces) {
        if (!container) {
            return;
        }

        if (!Array.isArray(pieces)) {
            pieces = [];
        }

        container.innerHTML = pieces.map(function (piece) {
            let symbol = "";

            if (typeof piece === "string") {
                symbol = piece;
            } else if (piece && piece.type) {
                const symbols = {
                    p: "♟",
                    n: "♞",
                    b: "♝",
                    r: "♜",
                    q: "♛",
                    k: "♚"
                };

                symbol = symbols[piece.type] || "";
            }

            return `<span class="captured-piece">${escapeHTML(symbol)}</span>`;
        }).join("");
    }

    renderPieces(whiteContainer, whiteCaptured);
    renderPieces(blackContainer, blackCaptured);
}


/* =========================================================
   19. PAUSE GAME
========================================================= */

function pauseGame() {
    if (!state.gameStarted || state.gameFinished || state.gamePaused) {
        return false;
    }

    const timer = getTimer();

    if (timer && typeof timer.pause === "function") {
        timer.pause();
    }

    const multiplayer = getMultiplayer();

    if (
        state.mode !== "online" &&
        multiplayer &&
        typeof multiplayer.pause === "function"
    ) {
        multiplayer.pause();
    }

    state.gamePaused = true;

    updateGameInterface();

    notify("Game paused.", "info");

    return true;
}


/* =========================================================
   20. RESUME GAME
========================================================= */

function resumeGame() {
    if (!state.gameStarted || state.gameFinished || !state.gamePaused) {
        return false;
    }

    const timer = getTimer();

    if (timer && typeof timer.resume === "function") {
        timer.resume();
    }

    const multiplayer = getMultiplayer();

    if (
        state.mode !== "online" &&
        multiplayer &&
        typeof multiplayer.resume === "function"
    ) {
        multiplayer.resume();
    }

    state.gamePaused = false;

    updateGameInterface();

    notify("Game resumed.", "success");

    return true;
}


/* =========================================================
   21. TIMEOUT HANDLING
========================================================= */

function handleTimeout(color) {
    if (!state.gameStarted || state.gameFinished) {
        return;
    }

    const engine = getEngine();

    if (!engine) {
        return;
    }

    const timedOutColor = color === "b" ? "b" : "w";

    const winnerColor =
        timedOutColor === "w" ? "b" : "w";

    let result = "draw";

    if (typeof engine.getBoard === "function") {
        const board = engine.getBoard();

        let hasMatingMaterial = false;

        if (Array.isArray(board)) {
            board.forEach(function (rank) {
                if (!Array.isArray(rank)) {
                    return;
                }

                rank.forEach(function (piece) {
                    if (
                        piece &&
                        piece.color === winnerColor &&
                        ["q", "r", "b", "n"].includes(piece.type)
                    ) {
                        hasMatingMaterial = true;
                    }
                });
            });
        }

        result = hasMatingMaterial
            ? winnerColor
            : "draw";
    }

    finishGame(result, "timeout");

    const sound = getSound();

    if (sound && typeof sound.gameEnd === "function") {
        sound.gameEnd();
    }
}


/* =========================================================
   22. DRAW OFFER
========================================================= */

function offerDraw() {
    if (!state.gameStarted || state.gameFinished) {
        notify("No active game.", "warning");
        return false;
    }

    if (state.mode === "online") {
        notify(
            "Online draw offers will be handled by the online room.",
            "info"
        );

        return false;
    }

    const accepted = window.confirm(
        "Do you want to end this game as a draw?"
    );

    if (!accepted) {
        return false;
    }

    finishGame("draw", "agreement");

    return true;
}


/* =========================================================
   23. RESIGN GAME
========================================================= */

function resignGame() {
    if (!state.gameStarted || state.gameFinished) {
        notify("No active game.", "warning");
        return false;
    }

    const confirmResign =
        window.APPARA_SETTINGS &&
        typeof window.APPARA_SETTINGS.get === "function"
            ? window.APPARA_SETTINGS.get("confirmResign")
            : true;

    if (confirmResign !== false) {
        const accepted = window.confirm(
            "Are you sure you want to resign this game?"
        );

        if (!accepted) {
            return false;
        }
    }

    if (state.mode === "online") {
        const multiplayer = getMultiplayer();

        if (multiplayer && typeof multiplayer.resign === "function") {
            multiplayer.resign();
        }

        return true;
    }

    const losingColor =
        state.mode === "computer"
            ? state.playerColor
            : "w";

    const winnerColor =
        losingColor === "w" ? "b" : "w";

    finishGame(winnerColor, "resignation");

    return true;
}


/* =========================================================
   PART 2/3 END
   CONTINUE PART 3/3 BELOW THIS LINE
========================================================= */ 
   /* =========================================================
   APPARA CHESS — GAME CONTROLLER
   PART 21G — INTEGRATION REPAIR
   FILE: js/game.js
   PART 3/3 — RESULTS, MULTIPLAYER & PUBLIC API
========================================================= */


/* =====================================================
   24. FINISH GAME
===================================================== */

function finishGame(result, reason) {
    if (state.gameFinished) {
        return false;
    }

    state.gameFinished = true;
    state.gameStarted = false;
    state.gamePaused = false;

    state.result = result;
    state.endTime = Date.now();

    stopGameTimer();

    const board = getBoard();

    if (board && typeof board.clearSelection === "function") {
        board.clearSelection();
    }

    const sound = getSound();

    if (sound && typeof sound.gameEnd === "function") {
        sound.gameEnd();
    }

    recordGameResult(result, reason);

    showGameResult(result, reason);

    updateGameInterface();

    return true;
}


/* =====================================================
   25. RECORD GAME RESULT
===================================================== */

function recordGameResult(result, reason) {
    if (state.resultRecorded) {
        return false;
    }

    state.resultRecorded = true;

    const profile = getProfile();

    if (!profile || typeof profile.recordGame !== "function") {
        console.warn("Profile result recording is unavailable.");
        return false;
    }

    let playerResult = "draw";

    if (result === "draw") {
        playerResult = "draw";
    } else if (result === state.playerColor) {
        playerResult = "win";
    } else if (result === "w" || result === "b") {
        playerResult = "loss";
    } else if (result === "win") {
        playerResult = "win";
    } else if (result === "loss") {
        playerResult = "loss";
    }

    /*
       IMPORTANT:
       APPARA_PROFILE.recordGame expects a result string.
       Do not pass a game-data object as its first argument.
    */

    try {
        profile.recordGame(playerResult);
    } catch (error) {
        console.error("Could not record game result:", error);
        return false;
    }

    state.lastResult = {
        result: playerResult,
        reason: reason || "normal",
        mode: state.mode,
        duration: state.startTime
            ? Math.max(0, Date.now() - state.startTime)
            : 0
    };

    return true;
}


/* =====================================================
   26. GAME RESULT MODAL
===================================================== */

function showGameResult(result, reason) {
    let title = "Game Over";
    let message = "The game has ended.";

    if (result === "draw") {
        title = "Draw Game";
        message = "The match ended in a draw.";
    } else if (result === "w" || result === "b") {
        const winner =
            result === "w" ? "White" : "Black";

        title = winner + " Wins";
        message = winner + " won the match.";
    } else if (result === "win") {
        title = "You Win!";
        message = "Congratulations! You won the match.";
    } else if (result === "loss") {
        title = "You Lost";
        message = "The match has ended.";
    }

    const reasonMessages = {
        checkmate: "Checkmate",
        stalemate: "Stalemate",
        timeout: "Time expired",
        resignation: "A player resigned",
        agreement: "Draw by agreement",
        draw: "Draw game"
    };

    if (reason && reasonMessages[reason]) {
        message += " " + reasonMessages[reason] + ".";
    }

    const content = `
        <div class="game-result">
            <div class="game-result-icon">
                ${result === "draw" ? "🤝" :
                    result === "win" || result === state.playerColor ? "🏆" : "♟"}
            </div>

            <h2>${escapeHTML(title)}</h2>

            <p>${escapeHTML(message)}</p>

            <div class="game-result-actions">
                <button
                    class="primary-btn"
                    id="result-new-game"
                    type="button"
                >
                    New Game
                </button>

                <button
                    class="secondary-btn"
                    id="result-home"
                    type="button"
                >
                    Home
                </button>
            </div>
        </div>
    `;

    if (
        window.APPARA_APP &&
        typeof window.APPARA_APP.openModal === "function"
    ) {
        window.APPARA_APP.openModal(title, content);
    } else {
        notify(title + ": " + message, "info");
    }

    setTimeout(function () {
        const newGameButton = getElement("result-new-game");
        const homeButton = getElement("result-home");

        if (newGameButton) {
            newGameButton.addEventListener("click", function () {
                if (window.APPARA_APP) {
                    window.APPARA_APP.closeModal();
                }

                startGame(
                    state.mode,
                    state.currentOptions
                );
            });
        }

        if (homeButton) {
            homeButton.addEventListener("click", function () {
                if (window.APPARA_APP) {
                    window.APPARA_APP.closeModal();
                    window.APPARA_APP.navigate("home");
                }
            });
        }
    }, 0);
}


/* =====================================================
   27. CHECK CHESS GAME END
===================================================== */

function checkGameEnd() {
    if (state.gameFinished) {
        return true;
    }

    const engine = getEngine();

    if (!engine) {
        return false;
    }

    if (
        typeof engine.isCheckmate === "function" &&
        engine.isCheckmate()
    ) {
        const winner =
            engine.turn() === "w" ? "b" : "w";

        finishGame(winner, "checkmate");
        return true;
    }

    if (
        typeof engine.isStalemate === "function" &&
        engine.isStalemate()
    ) {
        finishGame("draw", "stalemate");
        return true;
    }

    if (
        typeof engine.isDraw === "function" &&
        engine.isDraw()
    ) {
        finishGame("draw", "draw");
        return true;
    }

    if (
        typeof engine.isGameOver === "function" &&
        engine.isGameOver()
    ) {
        finishGame("draw", "draw");
        return true;
    }

    return false;
}


/* =====================================================
   28. MULTIPLAYER MOVE CALLBACK
===================================================== */

function onMultiplayerMove() {
    if (state.gameFinished) {
        return;
    }

    updateMoveHistory();
    renderCapturedPieces();
    updateTurnDisplay();
    updateGameInterface();

    checkGameEnd();
}


/* =====================================================
   29. MULTIPLAYER GAME END CALLBACK
===================================================== */

function onMultiplayerGameEnd(result, reason) {
    if (state.gameFinished) {
        return;
    }

    let finalResult = result;

    if (
        result &&
        typeof result === "object"
    ) {
        finalResult =
            result.winner ||
            result.result ||
            "draw";

        reason =
            result.reason ||
            reason;
    }

    if (
        finalResult !== "w" &&
        finalResult !== "b" &&
        finalResult !== "draw" &&
        finalResult !== "win" &&
        finalResult !== "loss"
    ) {
        finalResult = "draw";
    }

    finishGame(
        finalResult,
        reason || "normal"
    );
}


/* =====================================================
   30. RESET GAME STATE
===================================================== */

function resetGameState() {
    stopGameTimer();

    state.gameStarted = false;
    state.gameFinished = false;
    state.gamePaused = false;

    state.result = null;
    state.resultRecorded = false;

    state.moveCount = 0;
    state.startTime = null;
    state.endTime = null;

    state.lastResult = null;

    updateGameInterface();

    return true;
}


/* =====================================================
   31. GET GAME STATE
===================================================== */

function getState() {
    return {
        initialized: state.initialized,
        gameStarted: state.gameStarted,
        gameFinished: state.gameFinished,
        gamePaused: state.gamePaused,

        mode: state.mode,
        playerColor: state.playerColor,
        difficulty: state.difficulty,

        result: state.result,
        resultRecorded: state.resultRecorded,

        moveCount: state.moveCount,
        startTime: state.startTime,
        endTime: state.endTime,

        lastResult: state.lastResult,

        currentOptions: Object.assign(
            {},
            state.currentOptions
        )
    };
}


/* =====================================================
   32. DESTROY GAME CONTROLLER
===================================================== */

function destroy() {
    stopGameTimer();

    state.gameStarted = false;
    state.gamePaused = false;
    state.initialized = false;

    state.eventsBound = false;

    return true;
}


/* =====================================================
   33. PUBLIC API
===================================================== */

return {
    init: init,

    startGame: startGame,
    start: startGame,

    undoMove: undoMove,

    pauseGame: pauseGame,
    resumeGame: resumeGame,

    pause: pauseGame,
    resume: resumeGame,

    resign: resignGame,
    resignGame: resignGame,

    offerDraw: offerDraw,

    finishGame: finishGame,
    checkGameEnd: checkGameEnd,

    handleTimeout: handleTimeout,

    updateGameInterface: updateGameInterface,
    updateMoveHistory: updateMoveHistory,
    renderCapturedPieces: renderCapturedPieces,
    updateClockDisplay: updateClockDisplay,
    updateTurnDisplay: updateTurnDisplay,

    onMultiplayerMove: onMultiplayerMove,
    onMultiplayerGameEnd: onMultiplayerGameEnd,

    reset: resetGameState,
    getState: getState,

    destroy: destroy
};

})();

/* =========================================================
   APPARA CHESS — GAME CONTROLLER
   PART 21G COMPLETE
   FILE: js/game.js COMPLETE
========================================================= */
