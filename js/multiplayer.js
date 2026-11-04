/* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 21H — INTEGRATION REPAIR
   FILE: js/multiplayer.js
   PART 1/3 — CORE, INITIALIZATION & GAME MODES
========================================================= */

window.APPARA_MULTIPLAYER = (function () {
    "use strict";

    /* =====================================================
       1. STATE
    ===================================================== */

    const state = {
        initialized: false,
        mode: "offline",
        active: false,
        paused: false,
        finished: false,

        playerColor: "w",
        currentRoom: null,

        aiThinking: false,
        aiDifficulty: "medium",

        lastSyncedFen: null,
        lastMove: null,

        moveHandlerBound: false,
        roomHandlerBound: false,

        onStateChange: null
    };


    /* =====================================================
       2. MODULE ACCESS
    ===================================================== */

    function engine() {
        return window.APPARA_ENGINE || null;
    }

    function board() {
        return window.APPARA_BOARD || null;
    }

    function ai() {
        return window.APPARA_AI || null;
    }

    function timer() {
        return window.APPARA_TIMER || null;
    }

    function online() {
        return window.APPARA_ONLINE || null;
    }

    function game() {
        return window.APPARA_GAME || null;
    }

    function sound() {
        return window.APPARA_SOUND || null;
    }


    /* =====================================================
       3. NOTIFICATION
    ===================================================== */

    function notify(message, type) {
        if (
            window.APPARA_APP &&
            typeof window.APPARA_APP.notify === "function"
        ) {
            window.APPARA_APP.notify(message, type || "info");
        } else {
            console.log("[APPARA MULTIPLAYER]", message);
        }
    }


    /* =====================================================
       4. INITIALIZATION
    ===================================================== */

    function init() {
        if (state.initialized) {
            return true;
        }

        if (!engine() || !board()) {
            console.error(
                "APPARA CHESS: Engine or board is unavailable."
            );

            return false;
        }

        connectBoard();

        state.initialized = true;

        return true;
    }


    /* =====================================================
       5. CONNECT BOARD
    ===================================================== */

    function connectBoard() {
        const chessBoard = board();

        if (!chessBoard || state.moveHandlerBound) {
            return false;
        }

        if (typeof chessBoard.setMoveHandler === "function") {
            chessBoard.setMoveHandler(function (move) {
                handlePlayerMove(move);
            });

            state.moveHandlerBound = true;
            return true;
        }

        return false;
    }


    /* =====================================================
       6. RESET MODE STATE
    ===================================================== */

    function resetModeState(mode) {
        state.mode = mode;
        state.active = true;
        state.paused = false;
        state.finished = false;

        state.aiThinking = false;

        state.lastMove = null;
        state.lastSyncedFen = null;
    }


    /* =====================================================
       7. START OFFLINE GAME
    ===================================================== */

    function startOffline(options) {
        options = options || {};

        if (!init()) {
            return false;
        }

        resetModeState("offline");

        state.playerColor = "w";

        const chessEngine = engine();

        if (
            options.resetEngine !== false &&
            chessEngine &&
            typeof chessEngine.reset === "function"
        ) {
            chessEngine.reset();
        }

        connectBoard();

        if (typeof board().render === "function") {
            board().render();
        }

        if (typeof board().setOrientation === "function") {
            board().setOrientation("w");
        }

        notify("Offline game ready.", "success");

        emitStateChange();

        return true;
    }


    /* =====================================================
       8. START COMPUTER GAME
    ===================================================== */

    function startComputer(options) {
        options = options || {};

        if (!init()) {
            return false;
        }

        resetModeState("computer");

        state.playerColor =
            options.playerColor === "b" ? "b" : "w";

        state.aiDifficulty =
            options.difficulty || "medium";

        const chessEngine = engine();

        if (
            options.resetEngine !== false &&
            chessEngine &&
            typeof chessEngine.reset === "function"
        ) {
            chessEngine.reset();
        }

        const computer = ai();

        if (computer) {
            if (typeof computer.setDifficulty === "function") {
                computer.setDifficulty(state.aiDifficulty);
            }

            if (typeof computer.reset === "function") {
                computer.reset();
            }
        }

        connectBoard();

        if (typeof board().setOrientation === "function") {
            board().setOrientation(state.playerColor);
        }

        if (typeof board().render === "function") {
            board().render();
        }

        notify("Computer game ready.", "success");

        emitStateChange();

        /*
         * If the player chooses Black, AI plays White first.
         */

        if (state.playerColor === "b") {
            window.setTimeout(function () {
                if (
                    state.active &&
                    !state.finished &&
                    !state.paused
                ) {
                    playComputerTurn();
                }
            }, 450);
        }

        return true;
    }


    /* =====================================================
       9. START ONLINE GAME
    ===================================================== */

    function startOnline(options) {
        options = options || {};

        if (!init()) {
            return false;
        }

        resetModeState("online");

        state.playerColor =
            options.playerColor === "b" ? "b" : "w";

        state.currentRoom =
            options.roomCode || null;

        state.lastSyncedFen =
            typeof engine().getFEN === "function"
                ? engine().getFEN()
                : null;

        if (typeof board().setOrientation === "function") {
            board().setOrientation(state.playerColor);
        }

        if (typeof board().render === "function") {
            board().render();
        }

        connectOnlineRoom();

        emitStateChange();

        return true;
    }


    /* =====================================================
       10. CONNECT ONLINE ROOM
    ===================================================== */

    function connectOnlineRoom() {
        const onlineModule = online();

        if (!onlineModule) {
            notify("Online module is unavailable.", "error");
            return false;
        }

        if (state.roomHandlerBound) {
            return true;
        }

        /*
         * Online room callbacks are connected in Part 2.
         */

        state.roomHandlerBound = true;

        return true;
    }


    /* =====================================================
       11. CHECK ACTIVE TURN
    ===================================================== */

    function isPlayerTurn() {
        if (!state.active || state.paused || state.finished) {
            return false;
        }

        const chessEngine = engine();

        if (!chessEngine) {
            return false;
        }

        const currentTurn = chessEngine.turn();

        if (state.mode === "computer") {
            return currentTurn === state.playerColor;
        }

        if (state.mode === "online") {
            return currentTurn === state.playerColor;
        }

        return true;
    }


    /* =====================================================
       12. EMIT STATE CHANGE
    ===================================================== */

    function emitStateChange() {
        if (typeof state.onStateChange === "function") {
            state.onStateChange(getState());
        }
    }


    /* =====================================================
       PART 1/3 END
       CONTINUE PART 2/3 BELOW THIS LINE
    ===================================================== */
   /* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 21H — INTEGRATION REPAIR
   FILE: js/multiplayer.js
   PART 2/3 — PLAYER MOVES, AI & ONLINE SYNC
========================================================= */


/* =====================================================
   13. HANDLE PLAYER MOVE
===================================================== */

function handlePlayerMove(move) {
    if (!isPlayerTurn()) {
        return false;
    }

    if (!move || !move.from || !move.to) {
        return false;
    }

    const chessEngine = engine();

    if (!chessEngine) {
        return false;
    }

    if (state.mode === "online") {
        return handleOnlineMove(move);
    }

    const result = chessEngine.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
    });

    if (!result) {
        return false;
    }

    state.lastMove = result;

    afterSuccessfulMove(result);

    if (
        state.mode === "computer" &&
        !state.finished &&
        !state.paused
    ) {
        const currentTurn = chessEngine.turn();

        if (currentTurn !== state.playerColor) {
            window.setTimeout(function () {
                if (
                    state.active &&
                    !state.finished &&
                    !state.paused
                ) {
                    playComputerTurn();
                }
            }, 350);
        }
    }

    return true;
}


/* =====================================================
   14. HANDLE ONLINE MOVE
===================================================== */

function handleOnlineMove(move) {
    const onlineModule = online();

    if (
        !onlineModule ||
        typeof onlineModule.sendMove !== "function"
    ) {
        notify("Online connection is unavailable.", "error");
        return false;
    }

    const chessEngine = engine();

    const previousFen =
        typeof chessEngine.getFEN === "function"
            ? chessEngine.getFEN()
            : null;

    /*
     * The online module is responsible for validating and
     * submitting the move. The local engine is not changed
     * here, preventing a premature local move.
     */

    const submitted = onlineModule.sendMove({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q",
        expectedFen: previousFen
    });

    if (submitted && typeof submitted.then === "function") {
        submitted
            .then(function (success) {
                if (!success) {
                    notify("Move was not accepted.", "warning");
                }
            })
            .catch(function (error) {
                console.error("Online move failed:", error);
                notify("Could not submit online move.", "error");
            });

        return true;
    }

    if (!submitted) {
        notify("Move was not accepted.", "warning");
        return false;
    }

    return true;
}


/* =====================================================
   15. COMPUTER AI TURN
===================================================== */

function playComputerTurn() {
    if (
        state.mode !== "computer" ||
        !state.active ||
        state.finished ||
        state.paused ||
        state.aiThinking
    ) {
        return false;
    }

    const chessEngine = engine();
    const computer = ai();

    if (!chessEngine || !computer) {
        notify("Computer AI is unavailable.", "error");
        return false;
    }

    if (chessEngine.turn() === state.playerColor) {
        return false;
    }

    state.aiThinking = true;

    emitStateChange();

    window.setTimeout(function () {
        try {
            if (
                !state.active ||
                state.finished ||
                state.paused
            ) {
                state.aiThinking = false;
                emitStateChange();
                return;
            }

            const bestMove =
                typeof computer.getBestMove === "function"
                    ? computer.getBestMove()
                    : null;

            if (!bestMove) {
                state.aiThinking = false;
                checkGameEnd();
                emitStateChange();
                return;
            }

            const result = chessEngine.move({
                from: bestMove.from,
                to: bestMove.to,
                promotion: bestMove.promotion || "q"
            });

            if (!result) {
                console.error("AI returned an invalid move.");
                state.aiThinking = false;
                emitStateChange();
                return;
            }

            state.lastMove = result;

            state.aiThinking = false;

            afterSuccessfulMove(result);

            emitStateChange();

        } catch (error) {
            state.aiThinking = false;

            console.error("AI turn error:", error);

            notify("Computer could not complete its move.", "error");

            emitStateChange();
        }
    }, 120);

    return true;
}


/* =====================================================
   16. AFTER SUCCESSFUL MOVE
===================================================== */

function afterSuccessfulMove(move) {
    if (!move) {
        return false;
    }

    const chessEngine = engine();
    const chessBoard = board();
    const chessTimer = timer();
    const chessSound = sound();

    if (chessBoard) {
        if (typeof chessBoard.clearSelection === "function") {
            chessBoard.clearSelection();
        }

        if (typeof chessBoard.setLastMove === "function") {
            chessBoard.setLastMove(move.from, move.to);
        }

        if (typeof chessBoard.render === "function") {
            chessBoard.render();
        }
    }

    if (chessTimer && typeof chessTimer.switchTurn === "function") {
        chessTimer.switchTurn();
    }

    if (chessSound) {
        if (move.captured && typeof chessSound.capture === "function") {
            chessSound.capture();
        } else if (typeof chessSound.move === "function") {
            chessSound.move();
        }

        if (
            chessEngine &&
            typeof chessEngine.isCheck === "function" &&
            chessEngine.isCheck() &&
            typeof chessSound.check === "function"
        ) {
            chessSound.check();
        }
    }

    const gameController = game();

    if (
        gameController &&
        typeof gameController.onMultiplayerMove === "function"
    ) {
        gameController.onMultiplayerMove(move);
    }

    checkGameEnd();

    return true;
}


/* =====================================================
   17. HANDLE REMOTE ROOM UPDATE
===================================================== */

function handleRoomUpdate(roomData) {
    if (
        state.mode !== "online" ||
        !state.active ||
        state.finished ||
        !roomData
    ) {
        return false;
    }

    const chessEngine = engine();
    const chessBoard = board();

    if (!chessEngine || !chessBoard) {
        return false;
    }

    const remoteFen = roomData.fen;

    if (
        typeof remoteFen === "string" &&
        remoteFen.length > 0
    ) {
        const currentFen = chessEngine.getFEN();

        if (remoteFen !== currentFen) {
            if (typeof chessEngine.load === "function") {
                const loaded = chessEngine.load(remoteFen);

                if (!loaded) {
                    console.error("Received invalid online FEN.");
                    return false;
                }
            }

            state.lastSyncedFen = remoteFen;

            if (typeof chessBoard.clearSelection === "function") {
                chessBoard.clearSelection();
            }

            if (typeof chessBoard.clearLastMove === "function") {
                chessBoard.clearLastMove();
            }

            if (typeof chessBoard.render === "function") {
                chessBoard.render();
            }

            const gameController = game();

            if (
                gameController &&
                typeof gameController.onMultiplayerMove === "function"
            ) {
                gameController.onMultiplayerMove();
            }
        }
    }

    if (roomData.status === "finished") {
        state.finished = true;
        state.active = false;

        const gameController = game();

        if (
            gameController &&
            typeof gameController.onMultiplayerGameEnd === "function"
        ) {
            gameController.onMultiplayerGameEnd(
                roomData.result || "draw",
                roomData.reason || "online"
            );
        }
    }

    emitStateChange();

    return true;
}


/* =====================================================
   18. CHECK GAME END
===================================================== */

function checkGameEnd() {
    const chessEngine = engine();

    if (!chessEngine) {
        return false;
    }

    let result = null;
    let reason = "normal";

    if (
        typeof chessEngine.isCheckmate === "function" &&
        chessEngine.isCheckmate()
    ) {
        result =
            chessEngine.turn() === "w" ? "b" : "w";

        reason = "checkmate";

    } else if (
        typeof chessEngine.isStalemate === "function" &&
        chessEngine.isStalemate()
    ) {
        result = "draw";
        reason = "stalemate";

    } else if (
        typeof chessEngine.isDraw === "function" &&
        chessEngine.isDraw()
    ) {
        result = "draw";
        reason = "draw";

    } else if (
        typeof chessEngine.isGameOver === "function" &&
        chessEngine.isGameOver()
    ) {
        result = "draw";
        reason = "draw";
    }

    if (!result) {
        return false;
    }

    state.finished = true;
    state.active = false;

    const gameController = game();

    if (
        gameController &&
        typeof gameController.onMultiplayerGameEnd === "function"
    ) {
        gameController.onMultiplayerGameEnd(result, reason);
    }

    emitStateChange();

    return true;
}


/* =====================================================
   PART 2/3 END
   CONTINUE PART 3/3 BELOW THIS LINE
========================================================= */

   /* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 21H — INTEGRATION REPAIR
   FILE: js/multiplayer.js
   PART 3/3 — ONLINE CALLBACKS, CONTROLS & PUBLIC API
========================================================= */


/* =====================================================
   19. REGISTER ROOM UPDATE HANDLER
===================================================== */

function registerRoomUpdateHandler() {
    const onlineModule = online();

    if (!onlineModule) {
        return false;
    }

    /*
     * The online module must expose setRoomUpdateHandler.
     * If it does not, the room listener cannot be connected
     * through this controller.
     */

    if (
        typeof onlineModule.setRoomUpdateHandler === "function"
    ) {
        onlineModule.setRoomUpdateHandler(function (roomData) {
            handleRoomUpdate(roomData);
        });

        state.roomHandlerBound = true;
        return true;
    }

    console.warn(
        "Online module does not expose setRoomUpdateHandler()."
    );

    return false;
}


/* =====================================================
   20. RESIGN
===================================================== */

function resign() {
    if (!state.active || state.finished) {
        return false;
    }

    if (state.mode === "online") {
        const onlineModule = online();

        if (
            onlineModule &&
            typeof onlineModule.resign === "function"
        ) {
            return onlineModule.resign();
        }

        notify("Online resignation is unavailable.", "error");
        return false;
    }

    const losingColor = state.playerColor;
    const winnerColor = losingColor === "w" ? "b" : "w";

    state.finished = true;
    state.active = false;

    const gameController = game();

    if (
        gameController &&
        typeof gameController.onMultiplayerGameEnd === "function"
    ) {
        gameController.onMultiplayerGameEnd(
            winnerColor,
            "resignation"
        );
    }

    emitStateChange();

    return true;
}


/* =====================================================
   21. OFFER DRAW
===================================================== */

function offerDraw() {
    if (!state.active || state.finished) {
        return false;
    }

    if (state.mode === "online") {
        const onlineModule = online();

        if (
            onlineModule &&
            typeof onlineModule.offerDraw === "function"
        ) {
            return onlineModule.offerDraw();
        }

        notify("Online draw offer is not available yet.", "warning");
        return false;
    }

    const gameController = game();

    if (
        gameController &&
        typeof gameController.offerDraw === "function"
    ) {
        return gameController.offerDraw();
    }

    return false;
}


/* =====================================================
   22. PAUSE
===================================================== */

function pause() {
    if (!state.active || state.finished || state.paused) {
        return false;
    }

    if (state.mode === "online") {
        notify(
            "Online games cannot be paused locally.",
            "warning"
        );

        return false;
    }

    state.paused = true;

    const chessTimer = timer();

    if (chessTimer && typeof chessTimer.pause === "function") {
        chessTimer.pause();
    }

    emitStateChange();

    return true;
}


/* =====================================================
   23. RESUME
===================================================== */

function resume() {
    if (!state.active || state.finished || !state.paused) {
        return false;
    }

    state.paused = false;

    const chessTimer = timer();

    if (chessTimer && typeof chessTimer.resume === "function") {
        chessTimer.resume();
    }

    emitStateChange();

    return true;
}


/* =====================================================
   24. STOP
===================================================== */

function stop() {
    state.active = false;
    state.paused = false;
    state.finished = true;

    state.aiThinking = false;

    state.lastMove = null;
    state.lastSyncedFen = null;

    const chessTimer = timer();

    if (chessTimer && typeof chessTimer.stop === "function") {
        chessTimer.stop();
    }

    const chessBoard = board();

    if (
        chessBoard &&
        typeof chessBoard.clearSelection === "function"
    ) {
        chessBoard.clearSelection();
    }

    emitStateChange();

    return true;
}


/* =====================================================
   25. LEAVE ONLINE ROOM
===================================================== */

function leaveRoom() {
    const onlineModule = online();

    if (
        onlineModule &&
        typeof onlineModule.leaveRoom === "function"
    ) {
        onlineModule.leaveRoom();
    }

    state.currentRoom = null;
    state.roomHandlerBound = false;

    stop();

    state.mode = "offline";

    return true;
}


/* =====================================================
   26. SET STATE CHANGE CALLBACK
===================================================== */

function setStateChangeHandler(callback) {
    state.onStateChange =
        typeof callback === "function"
            ? callback
            : null;

    return true;
}


/* =====================================================
   27. GET STATE
===================================================== */

function getState() {
    return {
        initialized: state.initialized,
        mode: state.mode,
        active: state.active,
        paused: state.paused,
        finished: state.finished,

        playerColor: state.playerColor,
        currentRoom: state.currentRoom,

        aiThinking: state.aiThinking,
        aiDifficulty: state.aiDifficulty,

        lastSyncedFen: state.lastSyncedFen
    };
}


/* =====================================================
   28. DESTROY
===================================================== */

function destroy() {
    stop();

    state.initialized = false;
    state.moveHandlerBound = false;
    state.roomHandlerBound = false;

    state.onStateChange = null;

    return true;
}


/* =====================================================
   29. PUBLIC API
===================================================== */

return {
    init: init,

    startOffline: startOffline,
    startComputer: startComputer,
    startOnline: startOnline,

    connectBoard: connectBoard,
    connectOnlineRoom: connectOnlineRoom,
    registerRoomUpdateHandler: registerRoomUpdateHandler,

    handlePlayerMove: handlePlayerMove,
    handleOnlineMove: handleOnlineMove,
    playComputerTurn: playComputerTurn,

    afterSuccessfulMove: afterSuccessfulMove,
    handleRoomUpdate: handleRoomUpdate,

    checkGameEnd: checkGameEnd,

    resign: resign,
    offerDraw: offerDraw,

    pause: pause,
    resume: resume,

    stop: stop,
    leaveRoom: leaveRoom,

    setStateChangeHandler: setStateChangeHandler,

    getState: getState,
    destroy: destroy
};

})();

/* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 21H COMPLETE
   FILE: js/multiplayer.js COMPLETE
========================================================= */
