/* =========================================================
   APPARA CHESS — GAME CONTROLLER
   PART 21K — GAME & TIMER INTEGRATION REBUILD
   FILE: js/game.js
   PART 1/3
========================================================= */

window.APPARA_GAME = (function () {
    "use strict";


    /* =====================================================
       01. GAME STATE
    ===================================================== */

    const state = {
        initialized: false,
        gameStarted: false,
        gameFinished: false,
        gamePaused: false,

        mode: "offline",
        playerColor: "w",
        difficulty: "medium",

        minutes: 10,
        increment: 0,

        moveCount: 0,
        gameStartTime: null,
        gameEndTime: null,

        lastResult: null,
        lastReason: null,

        timerInitialized: false,
        resultRecorded: false
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

    function getTimer() {
        return window.APPARA_TIMER || null;
    }

    function getMultiplayer() {
        return window.APPARA_MULTIPLAYER || null;
    }

    function getProfile() {
        return window.APPARA_PROFILE || null;
    }

    function getSound() {
        return window.APPARA_SOUND || null;
    }


    /* =====================================================
       03. DOM HELPERS
    ===================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const element = getElement(id);

        if (element) {
            element.textContent =
                value === undefined || value === null
                    ? ""
                    : String(value);
        }
    }

    function showElement(id) {
        const element = getElement(id);

        if (element) {
            element.style.display = "";
        }
    }

    function hideElement(id) {
        const element = getElement(id);

        if (element) {
            element.style.display = "none";
        }
    }


    /* =====================================================
       04. NOTIFICATIONS
    ===================================================== */

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

        console.log("[APPARA GAME]", message);
    }


    /* =====================================================
       05. INITIALIZE CONTROLLER
    ===================================================== */

    function init() {
        if (state.initialized) {
            return true;
        }

        const engine = getEngine();
        const board = getBoard();

        if (!engine || !board) {
            console.error(
                "APPARA CHESS: Engine or board is unavailable."
            );

            return false;
        }

        bindGameButtons();
        connectBoard();
        resetGameState();

        state.initialized = true;

        return true;
    }


    /* =====================================================
       06. RESET GAME STATE
    ===================================================== */

    function resetGameState() {
        state.gameStarted = false;
        state.gameFinished = false;
        state.gamePaused = false;

        state.moveCount = 0;
        state.gameStartTime = null;
        state.gameEndTime = null;

        state.lastResult = null;
        state.lastReason = null;

        state.timerInitialized = false;
        state.resultRecorded = false;

        setText("move-count", "0");
    }


    /* =====================================================
       07. CONNECT BOARD
    ===================================================== */

    function connectBoard() {
        const board = getBoard();
        const multiplayer = getMultiplayer();

        if (
            !board ||
            typeof board.setMoveHandler !== "function"
        ) {
            return false;
        }

        board.setMoveHandler(function (move) {
            if (
                multiplayer &&
                typeof multiplayer.handlePlayerMove === "function"
            ) {
                multiplayer.handlePlayerMove(move);
            }
        });

        return true;
    }


    /* =====================================================
       08. BIND GAME BUTTONS
    ===================================================== */

    function bindGameButtons() {
        const buttons = [
            ["undo-btn", undoMove],
            ["flip-board-btn", flipBoard],
            ["draw-btn", offerDraw],
            ["resign-btn", resignGame],
            ["pause-btn", togglePause]
        ];

        buttons.forEach(function (item) {
            const element = getElement(item[0]);

            if (!element || element.dataset.gameBound === "true") {
                return;
            }

            element.addEventListener("click", item[1]);

            element.dataset.gameBound = "true";
        });
    }


    /* =====================================================
       09. START GAME
    ===================================================== */

    function startGame(options) {
        options = options || {};

        const engine = getEngine();
        const multiplayer = getMultiplayer();

        if (!engine || !multiplayer) {
            notify("Game modules are unavailable.", "error");
            return false;
        }

        if (!state.initialized) {
            init();
        }

        resetGameState();

        state.mode = options.mode || "offline";

        state.playerColor =
            options.playerColor === "b" ? "b" : "w";

        state.difficulty =
            options.difficulty || "medium";

        state.minutes = Number(options.minutes) || 10;
        state.increment = Number(options.increment) || 0;

        engine.reset();

        initializeTimer();

        let started = false;

        if (state.mode === "computer") {
            started = multiplayer.startComputer({
                playerColor: state.playerColor,
                difficulty: state.difficulty,
                minutes: state.minutes,
                increment: state.increment
            });

        } else if (state.mode === "online") {
            started = multiplayer.startOnline({
                playerColor: state.playerColor,
                roomCode: options.roomCode
            });

        } else {
            started = multiplayer.startOffline({
                minutes: state.minutes,
                increment: state.increment
            });
        }

        if (!started) {
            stopGameTimer();
            return false;
        }

        state.gameStarted = true;
        state.gameFinished = false;
        state.gamePaused = false;

        state.gameStartTime = Date.now();

        startGameTimer();

        updateGameDisplay();

        const sound = getSound();

        if (sound && typeof sound.gameStart === "function") {
            sound.gameStart();
        }

        return true;
    }


    /* =====================================================
       10. INITIALIZE GAME TIMER
    ===================================================== */

    function initializeTimer() {
        const timer = getTimer();

        if (!timer) {
            state.timerInitialized = false;
            return false;
        }

        if (typeof timer.init === "function") {
            timer.init({
                minutes: state.minutes,
                increment: state.increment,

                onTick: function (times) {
                    updateClockDisplay(times);
                },

                onTimeout: function (color) {
                    handleTimeout(color);
                },

                onTurnChange: function () {
                    updateGameDisplay();
                }
            });
        }

        if (typeof timer.reset === "function") {
            timer.reset({
                minutes: state.minutes,
                increment: state.increment
            });
        }

        state.timerInitialized = true;

        return true;
    }


    /* =====================================================
       11. START GAME TIMER
    ===================================================== */

    function startGameTimer() {
        const timer = getTimer();

        if (!timer || !state.gameStarted) {
            return false;
        }

        if (typeof timer.start === "function") {
            timer.start();
            return true;
        }

        return false;
    }


    /* =====================================================
       12. STOP GAME TIMER
    ===================================================== */

    function stopGameTimer() {
        const timer = getTimer();

        if (timer && typeof timer.stop === "function") {
            timer.stop();
        }

        return true;
    }


    /* =====================================================
       13. CLOCK DISPLAY
    ===================================================== */

    function updateClockDisplay(times) {
        if (!times) {
            return;
        }

        const timer = getTimer();

        if (timer && typeof timer.render === "function") {
            timer.render();
        }
    }


    /* =====================================================
       14. UPDATE GAME DISPLAY
    ===================================================== */

    function updateGameDisplay() {
        const engine = getEngine();

        if (!engine) {
            return;
        }

        const history = engine.getHistory();

        state.moveCount = history ? history.length : 0;

        setText("move-count", state.moveCount);

        updateMoveHistory();
        renderCapturedPieces();

        const board = getBoard();

        if (board && typeof board.refresh === "function") {
            board.refresh();
        }
    }


    /* =====================================================
       15. UPDATE MOVE HISTORY
    ===================================================== */

    function updateMoveHistory() {
        const engine = getEngine();
        const container = getElement("move-history");

        if (!engine || !container) {
            return;
        }

        const history = engine.getHistory() || [];

        container.innerHTML = "";

        for (let i = 0; i < history.length; i += 2) {
            const row = document.createElement("div");

            row.className = "move-history-row";

            const number = document.createElement("span");
            number.className = "move-number";
            number.textContent = String(
                Math.floor(i / 2) + 1
            ) + ".";

            const whiteMove = document.createElement("span");
            whiteMove.className = "white-move";
            whiteMove.textContent = history[i] || "";

            const blackMove = document.createElement("span");
            blackMove.className = "black-move";
            blackMove.textContent = history[i + 1] || "";

            row.appendChild(number);
            row.appendChild(whiteMove);
            row.appendChild(blackMove);

            container.appendChild(row);
        }

        container.scrollTop = container.scrollHeight;
    }


    /* =====================================================
       PART 1/3 END
       CONTINUE PART 2/3 BELOW THIS LINE
    ===================================================== */

           /* =========================================================
   APPARA CHESS — GAME CONTROLLER
   PART 21K — GAME ACTIONS & PLAYER CONTROLS
   FILE: js/game.js
   PART 2/3
========================================================= */


/* =====================================================
   16. RENDER CAPTURED PIECES
===================================================== */

function renderCapturedPieces() {
    const engine = getEngine();

    if (!engine || typeof engine.getCapturedPieces !== "function") {
        return;
    }

    const captured = engine.getCapturedPieces();

    if (!captured) {
        return;
    }

    const whiteContainer = getElement("captured-white");
    const blackContainer = getElement("captured-black");

    if (whiteContainer) {
        whiteContainer.textContent = "";

        (captured.white || []).forEach(function (piece) {
            const span = document.createElement("span");
            span.className = "captured-piece";
            span.textContent = piece.symbol || piece;
            whiteContainer.appendChild(span);
        });
    }

    if (blackContainer) {
        blackContainer.textContent = "";

        (captured.black || []).forEach(function (piece) {
            const span = document.createElement("span");
            span.className = "captured-piece";
            span.textContent = piece.symbol || piece;
            blackContainer.appendChild(span);
        });
    }
}


/* =====================================================
   17. UNDO MOVE
===================================================== */

function undoMove() {
    if (!state.gameStarted || state.gameFinished) {
        return false;
    }

    if (state.mode === "online") {
        notify("Undo is unavailable in online matches.", "info");
        return false;
    }

    const engine = getEngine();

    if (!engine || typeof engine.undo !== "function") {
        return false;
    }

    const history = engine.getHistory() || [];

    if (!history.length) {
        notify("There are no moves to undo.", "info");
        return false;
    }

    let undoCount = 1;

    if (
        state.mode === "computer" &&
        history.length >= 2
    ) {
        undoCount = 2;
    }

    let undone = 0;

    for (let i = 0; i < undoCount; i++) {
        if (!engine.undo()) {
            break;
        }

        undone++;
    }

    if (!undone) {
        return false;
    }

    state.moveCount = Math.max(
        0,
        state.moveCount - undone
    );

    updateGameDisplay();

    const timer = getTimer();

    if (timer && typeof timer.reset === "function") {
        timer.reset({
            minutes: state.minutes,
            increment: state.increment
        });

        if (state.gameStarted && !state.gamePaused) {
            timer.start();
        }
    }

    notify("Move undone.", "success");

    return true;
}


/* =====================================================
   18. FLIP BOARD
===================================================== */

function flipBoard() {
    const board = getBoard();

    if (!board || typeof board.flip !== "function") {
        return false;
    }

    board.flip();

    return true;
}


/* =====================================================
   19. PAUSE GAME
===================================================== */

function pauseGame() {
    if (
        !state.gameStarted ||
        state.gameFinished ||
        state.gamePaused
    ) {
        return false;
    }

    state.gamePaused = true;

    const multiplayer = getMultiplayer();

    if (multiplayer && typeof multiplayer.pause === "function") {
        multiplayer.pause();
    }

    const timer = getTimer();

    if (timer && typeof timer.pause === "function") {
        timer.pause();
    }

    setText("pause-btn", "Resume");

    notify("Game paused.", "info");

    return true;
}


/* =====================================================
   20. RESUME GAME
===================================================== */

function resumeGame() {
    if (
        !state.gameStarted ||
        state.gameFinished ||
        !state.gamePaused
    ) {
        return false;
    }

    state.gamePaused = false;

    const multiplayer = getMultiplayer();

    if (multiplayer && typeof multiplayer.resume === "function") {
        multiplayer.resume();
    }

    const timer = getTimer();

    if (timer && typeof timer.resume === "function") {
        timer.resume();
    }

    setText("pause-btn", "Pause");

    notify("Game resumed.", "success");

    return true;
}


/* =====================================================
   21. TOGGLE PAUSE
===================================================== */

function togglePause() {
    if (state.gamePaused) {
        return resumeGame();
    }

    return pauseGame();
}


/* =====================================================
   22. HANDLE TIMEOUT
===================================================== */

function handleTimeout(color) {
    if (!state.gameStarted || state.gameFinished) {
        return false;
    }

    const engine = getEngine();

    if (!engine) {
        return false;
    }

    const losingColor = color === "b" ? "b" : "w";
    const winningColor = losingColor === "w" ? "b" : "w";

    /*
     * A timeout is a draw if the opponent has no
     * possible material to deliver checkmate.
     */

    const board = engine.getBoard();

    let opponentCanMate = false;

    if (board && Array.isArray(board)) {
        board.forEach(function (rank) {
            rank.forEach(function (piece) {
                if (!piece || piece.color !== winningColor) {
                    return;
                }

                if (
                    piece.type === "p" ||
                    piece.type === "q" ||
                    piece.type === "r" ||
                    piece.type === "b" ||
                    piece.type === "n"
                ) {
                    opponentCanMate = true;
                }
            });
        });
    }

    if (!opponentCanMate) {
        finishGame("draw", "timeout-insufficient-material");
    } else {
        finishGame(winningColor, "timeout");
    }

    return true;
}


/* =====================================================
   23. OFFER DRAW
===================================================== */

async function offerDraw() {
    if (!state.gameStarted || state.gameFinished) {
        return false;
    }

    if (state.mode === "online") {
        const multiplayer = getMultiplayer();

        if (multiplayer && typeof multiplayer.offerDraw === "function") {
            return await multiplayer.offerDraw();
        }

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


/* =====================================================
   24. RESIGN GAME
===================================================== */

async function resignGame() {
    if (!state.gameStarted || state.gameFinished) {
        return false;
    }

    const accepted = window.confirm(
        "Are you sure you want to resign this game?"
    );

    if (!accepted) {
        return false;
    }

    const multiplayer = getMultiplayer();

    if (
        state.mode === "online" &&
        multiplayer &&
        typeof multiplayer.resign === "function"
    ) {
        return await multiplayer.resign();
    }

    const losingColor = state.playerColor;
    const winningColor = losingColor === "w" ? "b" : "w";

    finishGame(winningColor, "resignation");

    return true;
}


/* =====================================================
   25. HANDLE ONLINE MOVE CALLBACK
===================================================== */

function onMultiplayerMove(move) {
    if (!state.gameStarted || state.gameFinished) {
        return false;
    }

    updateGameDisplay();

    if (
        move &&
        move.remote &&
        window.APPARA_SOUND
    ) {
        window.APPARA_SOUND.move();
    }

    return true;
}


/* =====================================================
   PART 2/3 END
   CONTINUE PART 3/3 BELOW THIS LINE
========================================================= */

          /* =========================================================
   APPARA CHESS — GAME CONTROLLER
   PART 21K — RESULTS, STATISTICS & PUBLIC API
   FILE: js/game.js
   PART 3/3
========================================================= */


/* =====================================================
   26. CHECK GAME END
===================================================== */

function checkGameEnd() {
    if (state.gameFinished) {
        return true;
    }

    const engine = getEngine();

    if (!engine || !engine.isGameOver()) {
        return false;
    }

    let result = "draw";
    let reason = "draw";

    if (engine.isCheckmate()) {
        const winner = engine.turn() === "w" ? "b" : "w";

        result = winner;
        reason = "checkmate";

    } else if (engine.isStalemate()) {
        result = "draw";
        reason = "stalemate";

    } else if (engine.isDraw()) {
        result = "draw";
        reason = "draw";
    }

    finishGame(result, reason);

    return true;
}


/* =====================================================
   27. ONLINE GAME END CALLBACK
===================================================== */

function onMultiplayerGameEnd(result, reason) {
    if (state.gameFinished) {
        return false;
    }

    finishGame(
        result || "draw",
        reason || "online-result"
    );

    return true;
}


/* =====================================================
   28. FINISH GAME
===================================================== */

function finishGame(result, reason) {
    if (state.gameFinished) {
        return false;
    }

    state.gameFinished = true;
    state.gameStarted = false;
    state.gamePaused = false;

    state.gameEndTime = Date.now();
    state.lastResult = result;
    state.lastReason = reason;
    state.resultRecorded = false;

    stopGameTimer();

    const sound = getSound();

    if (sound) {
        if (result === "draw") {
            sound.gameEnd();
        } else if (typeof sound.checkmate === "function" &&
                   reason === "checkmate") {
            sound.checkmate();
        } else {
            sound.gameEnd();
        }
    }

    recordGameResult(result, reason);

    showGameResult(result, reason);

    const multiplayer = getMultiplayer();

    if (
        multiplayer &&
        typeof multiplayer.getState === "function"
    ) {
        const multiplayerState = multiplayer.getState();

        if (
            multiplayerState.mode !== "online" &&
            multiplayerState.active
        ) {
            multiplayer.stop();
        }
    }

    return true;
}


/* =====================================================
   29. RECORD GAME RESULT
===================================================== */

function recordGameResult(result, reason) {
    if (state.resultRecorded) {
        return false;
    }

    const profile = getProfile();

    if (!profile || typeof profile.recordGame !== "function") {
        return false;
    }

    let playerResult = "draw";

    if (result !== "draw") {
        if (state.mode === "computer" || state.mode === "online") {
            playerResult =
                result === state.playerColor ? "win" : "loss";
        } else {
            /*
             * Local two-player games do not have a single
             * tracked player result.
             */
            playerResult = "draw";
        }
    }

    const engine = getEngine();

    const gameRecord = {
        result: playerResult,
        mode: state.mode,
        reason: reason,
        moves: engine ? engine.getHistory().length : 0,
        duration: state.gameStartTime && state.gameEndTime
            ? Math.floor(
                (state.gameEndTime - state.gameStartTime) / 1000
            )
            : 0,
        date: Date.now()
    };

    try {
        profile.recordGame(gameRecord);
        state.resultRecorded = true;
        return true;

    } catch (error) {
        console.error("Could not record game:", error);
        return false;
    }
}


/* =====================================================
   30. SHOW GAME RESULT
===================================================== */

function showGameResult(result, reason) {
    let title = "Game Over";
    let message = "The match has ended.";

    if (reason === "checkmate") {
        title = "Checkmate!";
        message = result === state.playerColor
            ? "Congratulations! You won the game."
            : "Your opponent won the game.";

    } else if (reason === "stalemate") {
        title = "Stalemate";
        message = "The game ended in a draw.";

    } else if (reason === "timeout") {
        title = "Time Out";
        message = result === state.playerColor
            ? "Your opponent ran out of time. You won!"
            : "Your time ran out.";

    } else if (reason === "resignation") {
        title = "Resignation";
        message = result === state.playerColor
            ? "Your opponent resigned. You won!"
            : "You resigned the game.";

    } else if (reason === "agreement") {
        title = "Draw Agreed";
        message = "Both players agreed to a draw.";

    } else if (result === "draw") {
        title = "Draw";
        message = "The game ended in a draw.";

    } else {
        title = result === state.playerColor
            ? "You Won!"
            : "Game Over";

        message = result === state.playerColor
            ? "Congratulations on your victory!"
            : "Better luck next time!";
    }

    if (
        window.APPARA_APP &&
        typeof window.APPARA_APP.openModal === "function"
    ) {
        const content =
            '<div class="game-result-content">' +
                '<div class="game-result-icon">♟</div>' +
                '<p>' + escapeHTML(message) + '</p>' +
                '<button class="btn btn-primary" ' +
                    'onclick="APPARA_GAME.newGame()">' +
                    'New Game' +
                '</button>' +
            '</div>';

        window.APPARA_APP.openModal(title, content);

    } else {
        notify(title + " — " + message, "success");
    }
}


/* =====================================================
   31. ESCAPE HTML
===================================================== */

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =====================================================
   32. START NEW GAME
===================================================== */

function newGame() {
    return startGame({
        mode: state.mode,
        playerColor: state.playerColor,
        difficulty: state.difficulty,
        minutes: state.minutes,
        increment: state.increment
    });
}


/* =====================================================
   33. GET GAME STATE
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

        minutes: state.minutes,
        increment: state.increment,

        moveCount: state.moveCount,
        gameStartTime: state.gameStartTime,
        gameEndTime: state.gameEndTime,

        lastResult: state.lastResult,
        lastReason: state.lastReason,

        timerInitialized: state.timerInitialized,
        resultRecorded: state.resultRecorded
    };
}


/* =====================================================
   34. STOP GAME
===================================================== */

function stopGame() {
    if (!state.gameStarted && !state.gamePaused) {
        return false;
    }

    state.gameStarted = false;
    state.gamePaused = false;

    stopGameTimer();

    const multiplayer = getMultiplayer();

    if (multiplayer && typeof multiplayer.stop === "function") {
        multiplayer.stop();
    }

    return true;
}


/* =====================================================
   35. DESTROY CONTROLLER
===================================================== */

function destroy() {
    stopGameTimer();

    const board = getBoard();

    if (board && typeof board.setMoveHandler === "function") {
        board.setMoveHandler(null);
    }

    const buttons = [
        "undo-btn",
        "flip-board-btn",
        "draw-btn",
        "resign-btn",
        "pause-btn"
    ];

    buttons.forEach(function (id) {
        const element = getElement(id);

        if (element) {
            element.removeAttribute("data-game-bound");
        }
    });

    state.initialized = false;

    resetGameState();

    return true;
}


/* =====================================================
   36. PUBLIC API
===================================================== */

return {
    init: init,

    startGame: startGame,
    newGame: newGame,
    stopGame: stopGame,

    initializeTimer: initializeTimer,
    startGameTimer: startGameTimer,
    stopGameTimer: stopGameTimer,

    updateGameDisplay: updateGameDisplay,
    updateMoveHistory: updateMoveHistory,
    renderCapturedPieces: renderCapturedPieces,

    undoMove: undoMove,
    flipBoard: flipBoard,

    pauseGame: pauseGame,
    resumeGame: resumeGame,
    togglePause: togglePause,

    offerDraw: offerDraw,
    resignGame: resignGame,

    handleTimeout: handleTimeout,
    checkGameEnd: checkGameEnd,
    finishGame: finishGame,

    onMultiplayerMove: onMultiplayerMove,
    onMultiplayerGameEnd: onMultiplayerGameEnd,

    recordGameResult: recordGameResult,
    showGameResult: showGameResult,

    getState: getState,
    destroy: destroy
};

})();


/* =========================================================
   APPARA CHESS — GAME CONTROLLER
   PART 21K COMPLETE
========================================================= */            
