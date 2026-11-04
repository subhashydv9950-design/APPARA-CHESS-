/* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   REBUILT INTEGRATION
   FILE: js/multiplayer.js
   PART 1/3 START
========================================================= */

window.APPARA_MULTIPLAYER = (function () {
    "use strict";

    const state = {
        mode: "offline",
        active: false,
        finished: false,
        paused: false,

        playerColor: "w",
        opponentColor: "b",

        roomCode: null,
        difficulty: "medium",

        moveInProgress: false,
        roomHandlerBound: false,

        onStateChange: null,
        onGameEnd: null,

        lastMove: null,
        lastPosition: null
    };


    /* MODULE REFERENCES */

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


    /* NOTIFICATIONS */

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


    /* COLOR HELPERS */

    function normalizeColor(color) {
        if (color === "b" || color === "black") {
            return "b";
        }

        return "w";
    }

    function getRoomColor() {
        return state.playerColor === "w" ? "white" : "black";
    }


    /* STATE EVENTS */

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

            moveInProgress: state.moveInProgress,
            roomHandlerBound: state.roomHandlerBound,

            lastMove: state.lastMove,
            lastPosition: state.lastPosition
        };
    }

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


    /* RESET CONTROLLER */

    function resetState(mode) {
        state.mode = mode || "offline";
        state.active = true;
        state.finished = false;
        state.paused = false;

        state.roomCode = null;
        state.moveInProgress = false;
        state.roomHandlerBound = false;

        state.lastMove = null;
        state.lastPosition = null;

        emitStateChange();
    }


    /* VALIDATE REQUIRED MODULES */

    function validateModules() {
        const engine = getEngine();
        const board = getBoard();

        if (!engine || !board) {
            notify(
                "Chess Engine या Board उपलब्ध नहीं है।",
                "error"
            );

            return false;
        }

        return true;
    }


    /* CONNECT BOARD */

    function connectBoard() {
        const board = getBoard();

        if (
            !board ||
            typeof board.setMoveHandler !== "function"
        ) {
            return false;
        }

        board.setMoveHandler(function (move) {
            return handlePlayerMove(move);
        });

        return true;
    }


    /* START OFFLINE GAME */

    function startOffline(options) {
        options = options || {};

        if (!validateModules()) {
            return false;
        }

        const engine = getEngine();

        resetState("offline");

        state.playerColor = "w";
        state.opponentColor = "b";

        engine.reset();

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


    /* START COMPUTER GAME */

    function startComputer(options) {
        options = options || {};

        if (!validateModules()) {
            return false;
        }

        const engine = getEngine();
        const ai = getAI();

        resetState("computer");

        state.playerColor = normalizeColor(options.playerColor);
        state.opponentColor =
            state.playerColor === "w" ? "b" : "w";

        state.difficulty = options.difficulty || "medium";

        engine.reset();

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


    /* CHECK PLAYER TURN */

    function isPlayerTurn() {
        if (
            !state.active ||
            state.finished ||
            state.paused
        ) {
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


    /* CHECK WHETHER A MOVE CAN START */

    function canPlayMove() {
        return (
            state.active &&
            !state.finished &&
            !state.paused &&
            !state.moveInProgress
        );
    }


    /* PLAYER MOVE ENTRY */

    function handlePlayerMove(move) {
        if (!canPlayMove()) {
            return false;
        }

        if (!move || !move.from || !move.to) {
            return false;
        }

        if (!isPlayerTurn()) {
            notify("अभी आपकी चाल नहीं है।", "warning");
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


    /* LOCAL PLAYER MOVE */

    function handleLocalMove(move) {
        const engine = getEngine();

        if (!engine) return false;

        state.moveInProgress = true;

        try {
            const result = engine.move(
                move.from,
                move.to,
                move.promotion || "q"
            );

            if (!result) {
                return false;
            }

            afterSuccessfulMove(result);
            return true;

        } catch (error) {
            console.error("[APPARA] Local move failed:", error);
            return false;

        } finally {
            state.moveInProgress = false;
        }
    }


    /* COMPUTER GAME PLAYER MOVE */

    function handleComputerPlayerMove(move) {
        const engine = getEngine();

        if (!engine) return false;

        state.moveInProgress = true;

        try {
            const result = engine.move(
                move.from,
                move.to,
                move.promotion || "q"
            );

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
            console.error("[APPARA] Player move failed:", error);
            return false;

        } finally {
            state.moveInProgress = false;
        }
    }


    /* ONLINE PLAYER MOVE */

    async function handleOnlineMove(move) {
        const online = getOnline();
        const engine = getEngine();

        if (
            !online ||
            !engine ||
            typeof online.sendMove !== "function"
        ) {
            notify("Online connection उपलब्ध नहीं है।", "error");
            return false;
        }

        state.moveInProgress = true;

        try {
            const result = await online.sendMove({
                from: move.from,
                to: move.to,
                promotion: move.promotion || "q",
                expectedFen: engine.getFEN()
            });

            if (!result || result.success !== true) {
                notify(
                    result && result.error
                        ? result.error
                        : "Move स्वीकार नहीं हुआ।",
                    "warning"
                );

                return false;
            }

            return true;

        } catch (error) {
            console.error("[APPARA] Online move failed:", error);
            notify("Online Move भेजने में समस्या हुई।", "error");
            return false;

        } finally {
            state.moveInProgress = false;
        }
    }


    /* =========================================================
       PART 1/3 END
       PART 2/3 इसी फाइल में नीचे जोड़ा जाएगा।
   ========================================================= */

        /* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 2/3 START
========================================================= */


/* PLAY COMPUTER TURN */
function playComputerTurn() {
    if (
        state.mode !== "computer" ||
        !canPlayMove()
    ) {
        return false;
    }

    const engine = getEngine();
    const ai = getAI();

    if (!engine || !ai) {
        notify("Computer Player उपलब्ध नहीं है।", "error");
        return false;
    }

    if (engine.turn() !== state.opponentColor) {
        return false;
    }

    state.moveInProgress = true;

    try {
        let result = null;

        if (typeof ai.getBestMove === "function") {
            const bestMove = ai.getBestMove();

            if (bestMove && bestMove.from && bestMove.to) {
                result = engine.move(
                    bestMove.from,
                    bestMove.to,
                    bestMove.promotion || "q"
                );
            }
        } else if (typeof ai.playMove === "function") {
            result = ai.playMove();
        }

        if (!result) {
            checkGameEnd();
            return false;
        }

        afterSuccessfulMove(result);

        return true;

    } catch (error) {
        console.error("[APPARA] Computer move failed:", error);
        notify("Computer की चाल में समस्या हुई।", "error");
        return false;

    } finally {
        state.moveInProgress = false;
    }
}


/* PROCESS A SUCCESSFUL MOVE */
function afterSuccessfulMove(moveResult) {
    const engine = getEngine();

    if (!engine) return;

    state.lastMove = moveResult;

    state.lastPosition =
        typeof engine.getFEN === "function"
            ? engine.getFEN()
            : null;

    const board = getBoard();

    if (board && typeof board.refresh === "function") {
        board.refresh();
    }

    const timer = getTimer();

    if (timer && typeof timer.switchTurn === "function") {
        timer.switchTurn();
    }

    checkGameEnd();

    emitStateChange();
}


/* CHECK GAME END */
function checkGameEnd() {
    const engine = getEngine();

    if (!engine) return false;

    let status = null;

    if (typeof engine.getGameStatus === "function") {
        status = engine.getGameStatus();
    }

    if (!status || !status.over) {
        return false;
    }

    state.finished = true;
    state.active = false;

    const timer = getTimer();

    if (timer && typeof timer.stop === "function") {
        timer.stop();
    }

    if (typeof state.onGameEnd === "function") {
        state.onGameEnd(status);
    }

    emitStateChange();

    return true;
}


/* START ONLINE GAME */
function startOnline(options) {
    options = options || {};

    if (!validateModules()) {
        return false;
    }

    resetState("online");

    state.playerColor = normalizeColor(
        options.playerColor || options.color
    );

    state.opponentColor =
        state.playerColor === "w" ? "b" : "w";

    state.roomCode =
        options.roomCode || options.code || null;

    const engine = getEngine();

    if (options.fen) {
        try {
            engine.load(options.fen);
        } catch (error) {
            console.error("[APPARA] Invalid online FEN:", error);
            engine.reset();
        }
    } else {
        engine.reset();
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

    return true;
}


/* CONNECT TO ONLINE ROOM */
function connectOnlineRoom(room, roomCode, playerColor) {
    if (!room) {
        notify("Online Room की जानकारी उपलब्ध नहीं है।", "error");
        return false;
    }

    const color = normalizeColor(playerColor);

    const started = startOnline({
        room: room,
        roomCode: roomCode,
        playerColor: color,
        fen: room.fen || null
    });

    if (!started) return false;

    state.roomCode = roomCode || null;

    bindRoomUpdates();

    return true;
}


/* BIND ROOM UPDATE HANDLER */
function bindRoomUpdates() {
    const online = getOnline();

    if (
        !online ||
        typeof online.setRoomUpdateHandler !== "function"
    ) {
        return false;
    }

    if (state.roomHandlerBound) {
        return true;
    }

    online.setRoomUpdateHandler(function (room) {
        handleRoomUpdate(room);
    });

    state.roomHandlerBound = true;

    return true;
}


/* APPLY REMOTE ROOM UPDATE */
function handleRoomUpdate(room) {
    if (!room || state.mode !== "online") {
        return false;
    }

    const engine = getEngine();

    if (!engine) return false;

    const roomStatus = room.status;

    if (roomStatus === "finished" || roomStatus === "cancelled") {
        state.finished = true;
        state.active = false;

        const timer = getTimer();

        if (timer && typeof timer.stop === "function") {
            timer.stop();
        }

        emitStateChange();
        return true;
    }

    if (roomStatus !== "playing") {
        return false;
    }

    if (room.fen && room.fen !== engine.getFEN()) {
        try {
            engine.load(room.fen);

            const board = getBoard();

            if (board && typeof board.refresh === "function") {
                board.refresh();
            }

            state.lastPosition = room.fen;

            const timer = getTimer();

            if (timer && typeof timer.switchTurn === "function") {
                const currentTurn = engine.turn();

                if (currentTurn === state.playerColor) {
                    timer.switchTurn(state.playerColor === "w" ? "white" : "black");
                } else {
                    timer.switchTurn(state.opponentColor === "w" ? "white" : "black");
                }
            }

        } catch (error) {
            console.error("[APPARA] Room position update failed:", error);
            notify("Online Board अपडेट नहीं हो पाया।", "error");
            return false;
        }
    }

    checkGameEnd();
    emitStateChange();

    return true;
}


/* PAUSE GAME */
function pause() {
    if (!state.active || state.finished) {
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


/* RESUME GAME */
function resume() {
    if (!state.active || state.finished) {
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


/* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 2/3 END
========================================================= */

     /* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 3/3 START
========================================================= */


/* UNDO MOVE */
function undoMove() {
    if (
        !state.active ||
        state.finished ||
        state.mode === "online"
    ) {
        notify("इस Game Mode में Undo उपलब्ध नहीं है।", "warning");
        return false;
    }

    const engine = getEngine();

    if (!engine || typeof engine.undo !== "function") {
        return false;
    }

    try {
        const firstUndo = engine.undo();

        if (!firstUndo) {
            notify("Undo करने के लिए कोई चाल नहीं है।", "warning");
            return false;
        }

        /* Computer Game में खिलाड़ी और AI दोनों की चाल Undo करें */
        if (state.mode === "computer") {
            engine.undo();
        }

        const board = getBoard();

        if (board && typeof board.refresh === "function") {
            board.refresh();
        }

        state.lastMove = null;
        state.lastPosition = engine.getFEN();

        state.finished = false;
        state.active = true;

        emitStateChange();

        return true;

    } catch (error) {
        console.error("[APPARA] Undo failed:", error);
        notify("Undo नहीं हो पाया।", "error");
        return false;
    }
}


/* RESIGN GAME */
async function resign() {
    if (!state.active || state.finished) {
        return false;
    }

    if (state.mode === "online") {
        const online = getOnline();

        if (!online || typeof online.resign !== "function") {
            notify("Online Resign उपलब्ध नहीं है।", "error");
            return false;
        }

        const result = await online.resign();

        if (result) {
            state.finished = true;
            state.active = false;
            emitStateChange();
        }

        return result;
    }

    state.finished = true;
    state.active = false;

    const timer = getTimer();

    if (timer && typeof timer.stop === "function") {
        timer.stop();
    }

    const result = {
        over: true,
        type: "resignation",
        winner: state.mode === "computer"
            ? "black"
            : null,
        message: "Game resigned"
    };

    if (typeof state.onGameEnd === "function") {
        state.onGameEnd(result);
    }

    emitStateChange();

    return true;
}


/* OFFER DRAW */
async function offerDraw() {
    if (!state.active || state.finished) {
        return false;
    }

    if (state.mode !== "online") {
        notify("Draw Offer केवल Online Game में उपलब्ध है।", "warning");
        return false;
    }

    const online = getOnline();

    if (!online || typeof online.offerDraw !== "function") {
        return false;
    }

    return await online.offerDraw();
}


/* RESPOND TO DRAW */
async function respondToDraw(accept) {
    if (state.mode !== "online") {
        return false;
    }

    const online = getOnline();

    if (!online || typeof online.respondToDraw !== "function") {
        return false;
    }

    const result = await online.respondToDraw(Boolean(accept));

    if (result && accept) {
        state.finished = true;
        state.active = false;
        emitStateChange();
    }

    return result;
}


/* EXIT CURRENT GAME */
async function exitGame() {
    const online = getOnline();

    if (state.mode === "online" && online) {
        if (typeof online.leaveRoom === "function") {
            await online.leaveRoom();
        }
    }

    const timer = getTimer();

    if (timer && typeof timer.stop === "function") {
        timer.stop();
    }

    state.active = false;
    state.finished = true;
    state.paused = false;
    state.moveInProgress = false;
    state.roomCode = null;
    state.roomHandlerBound = false;

    emitStateChange();

    return true;
}


/* GET CURRENT GAME MODE */
function getMode() {
    return state.mode;
}


/* CHECK ACTIVE GAME */
function isActive() {
    return Boolean(state.active && !state.finished);
}


/* CHECK ONLINE GAME */
function isOnline() {
    return state.mode === "online";
}


/* CHECK COMPUTER GAME */
function isComputerGame() {
    return state.mode === "computer";
}


/* GET CURRENT PLAYER COLOR */
function getPlayerColor() {
    return state.playerColor;
}


/* CHANGE AI DIFFICULTY */
function setDifficulty(level) {
    const allowed = ["easy", "medium", "hard", "expert"];

    if (!allowed.includes(level)) {
        return false;
    }

    state.difficulty = level;

    const ai = getAI();

    if (ai && typeof ai.setDifficulty === "function") {
        ai.setDifficulty(level);
    }

    emitStateChange();

    return true;
}


/* RESET CURRENT GAME */
function resetGame() {
    const engine = getEngine();

    if (!engine) return false;

    try {
        engine.reset();

        state.finished = false;
        state.active = true;
        state.paused = false;
        state.moveInProgress = false;
        state.lastMove = null;
        state.lastPosition = engine.getFEN();

        const board = getBoard();

        if (board && typeof board.refresh === "function") {
            board.refresh();
        }

        const timer = getTimer();

        if (timer && typeof timer.reset === "function") {
            timer.reset();
        }

        emitStateChange();

        return true;

    } catch (error) {
        console.error("[APPARA] Reset failed:", error);
        return false;
    }
}


/* CLEANUP */
function destroy() {
    const online = getOnline();

    if (
        online &&
        typeof online.setRoomUpdateHandler === "function"
    ) {
        online.setRoomUpdateHandler(null);
    }

    const timer = getTimer();

    if (timer && typeof timer.stop === "function") {
        timer.stop();
    }

    state.mode = "offline";
    state.active = false;
    state.finished = false;
    state.paused = false;
    state.roomCode = null;
    state.moveInProgress = false;
    state.roomHandlerBound = false;
    state.lastMove = null;
    state.lastPosition = null;

    emitStateChange();

    return true;
}


/* PUBLIC API */
return Object.freeze({

    /* Game start */
    startOffline: startOffline,
    startComputer: startComputer,
    startOnline: startOnline,
    connectOnlineRoom: connectOnlineRoom,

    /* Moves */
    handlePlayerMove: handlePlayerMove,
    playComputerTurn: playComputerTurn,
    undoMove: undoMove,

    /* Game controls */
    pause: pause,
    resume: resume,
    resetGame: resetGame,
    exitGame: exitGame,
    resign: resign,

    /* Online draw controls */
    offerDraw: offerDraw,
    respondToDraw: respondToDraw,

    /* State */
    getState: getState,
    getMode: getMode,
    isActive: isActive,
    isOnline: isOnline,
    isComputerGame: isComputerGame,
    isPlayerTurn: isPlayerTurn,
    getPlayerColor: getPlayerColor,

    /* Settings and callbacks */
    setDifficulty: setDifficulty,
    setStateChangeHandler: setStateChangeHandler,
    setGameEndHandler: setGameEndHandler,

    /* Cleanup */
    destroy: destroy

});

})();

/* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 3/3 END
========================================================= */                        
