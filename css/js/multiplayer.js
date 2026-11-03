
/* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   FILE: js/multiplayer.js
   PART 13
========================================================= */

"use strict";

class ApparaChessMultiplayer {

    constructor() {
        this.mode = "offline";
        this.playerColor = "white";
        this.opponentName = "Opponent";

        this.isMyTurn = true;
        this.isGameActive = false;
        this.isSynchronizing = false;

        this.localPlayer = null;
        this.remotePlayer = null;

        this.onStatusChange = null;
        this.onMoveReceived = null;
        this.onGameFinished = null;

        this.initialize();
    }

    /* INITIALIZE MULTIPLAYER */
    initialize() {
        const online = window.apparaOnline;

        if (!online) return false;

        online.onOpponentJoined = () => {
            this.updateStatus("Opponent joined the game.");
        };

        online.onOpponentLeft = () => {
            this.updateStatus("Opponent left the game.");
        };

        online.onConnectionChange = connected => {
            this.updateStatus(
                connected ? "Connected" : "Disconnected"
            );
        };

        online.onRoomUpdate = room => {
            this.handleRoomUpdate(room);
        };

        online.onOpponentMove = gameData => {
            this.handleOpponentMove(gameData);
        };

        online.onError = message => {
            this.updateStatus(message);
        };

        return true;
    }

    /* SET GAME MODE */
    setMode(mode) {
        const allowedModes = [
            "offline",
            "computer",
            "online"
        ];

        if (!allowedModes.includes(mode)) {
            return false;
        }

        this.mode = mode;
        this.isGameActive = false;

        this.updateStatus(
            "Game mode: " + mode
        );

        return true;
    }

    /* START LOCAL GAME */
    startOffline() {
        this.setMode("offline");

        window.apparaChess.reset();

        this.playerColor = "white";
        this.isMyTurn = true;
        this.isGameActive = true;

        window.apparaBoard?.setOrientation("white");
        window.apparaBoard?.refresh();

        window.apparaTimer?.configure("rapid");
        window.apparaTimer?.start("white");

        window.apparaSound?.playGameStart();

        return true;
    }

    /* START COMPUTER GAME */
    startComputer(difficulty = "medium", playerColor = "white") {
        this.setMode("computer");

        window.apparaChess.reset();
        window.apparaAI.setDifficulty(difficulty);

        this.playerColor = playerColor;
        this.isMyTurn = playerColor === "white";
        this.isGameActive = true;

        window.apparaBoard?.setOrientation(playerColor);
        window.apparaBoard?.refresh();

        window.apparaTimer?.configure("rapid");
        window.apparaTimer?.start("white");

        window.apparaSound?.playGameStart();

        if (playerColor === "black") {
            this.makeComputerMove();
        }

        return true;
    }

    /* CREATE ONLINE MATCH */
    async createOnlineMatch(options = {}) {
        this.setMode("online");

        const online = window.apparaOnline;

        const result = await online.createRoom(options);

        if (!result.success) return result;

        this.playerColor = result.color;
        this.isMyTurn = true;
        this.isGameActive = true;

        window.apparaChess.reset();
        window.apparaBoard?.setOrientation("white");
        window.apparaBoard?.refresh();

        window.apparaTimer?.configure(
            options.clock || "rapid"
        );

        window.apparaTimer?.start("white");

        window.apparaSound?.playGameStart();

        return result;
    }

    /* JOIN ONLINE MATCH */
    async joinOnlineMatch(roomCode) {
        this.setMode("online");

        const result =
            await window.apparaOnline.joinRoom(roomCode);

        if (!result.success) return result;

        this.playerColor = result.color;
        this.isMyTurn = false;
        this.isGameActive = true;

        window.apparaChess.reset();

        window.apparaBoard?.setOrientation(result.color);
        window.apparaBoard?.refresh();

        window.apparaTimer?.configure("rapid");

        return result;
    }

    /* HANDLE LOCAL PLAYER MOVE */
    async playMove(from, to, promotion = "q") {
        if (!this.isGameActive || this.isSynchronizing) {
            return {
                success: false,
                error: "Game is not active."
            };
        }

        if (!this.isMyTurn) {
            return {
                success: false,
                error: "Wait for your turn."
            };
        }

        const currentColor =
            window.apparaChess.getTurn();

        if (this.mode !== "offline" &&
            currentColor !== this.playerColor) {
            return {
                success: false,
                error: "Not your turn."
            };
        }

        const result = window.apparaChess.makeMove(
            from,
            to,
            promotion
        );

        if (!result.success) return result;

        this.isMyTurn = this.mode === "offline"
            ? true
            : window.apparaChess.getTurn() === this.playerColor;

        window.apparaBoard?.setLastMove(result.move);
        window.apparaBoard?.refresh();

        this.playMoveSound(result.move);

        if (this.mode === "online") {
            const syncResult = await window.apparaOnline.sendMove({
                from: from,
                to: to,
                promotion: promotion
            });

            if (!syncResult.success) {
                this.updateStatus(
                    "Move synchronization failed."
                );
            }
        }

        if (this.mode === "computer") {
            window.apparaTimer?.switchTurn(
                window.apparaChess.getTurn()
            );

            if (!window.apparaChess.isGameOver()) {
                this.makeComputerMove();
            }
        } else if (this.mode === "offline") {
            window.apparaTimer?.switchTurn(
                window.apparaChess.getTurn()
            );
        } else {
            window.apparaTimer?.switchTurn(
                window.apparaChess.getTurn()
            );
        }

        this.checkGameEnd();

        return result;
    }

    /* PLAY MOVE SOUND */
    playMoveSound(move) {
        if (move.captured) {
            window.apparaSound?.playCapture();
        } else if (move.flags.includes("k") ||
                   move.flags.includes("q")) {
            window.apparaSound?.playCastle();
        } else if (move.promotion) {
            window.apparaSound?.playPromotion();
        } else {
            window.apparaSound?.playMove();
        }

        if (window.apparaChess.isCheck()) {
            window.apparaSound?.playCheck();
        }
    }

    /* COMPUTER MOVE */
    async makeComputerMove() {
        if (
            this.mode !== "computer" ||
            !this.isGameActive ||
            window.apparaChess.getTurn() === this.playerColor
        ) {
            return null;
        }

        this.isMyTurn = false;

        const result = await window.apparaAI.makeMove();

        if (!result || !result.success) {
            this.updateStatus("Computer could not move.");
            return result;
        }

        this.isMyTurn = true;

        window.apparaTimer?.switchTurn(
            window.apparaChess.getTurn()
        );

        this.checkGameEnd();

        return result;
    }

    /* HANDLE ROOM UPDATES */
    handleRoomUpdate(room) {
        if (!room || this.mode !== "online") return;

        if (room.status === "closed") {
            this.isGameActive = false;
            window.apparaTimer?.stop();
            this.updateStatus("Online room closed.");
            return;
        }

        if (room.status === "playing") {
            this.opponentName =
                Object.values(room.players || {})
                    .find(player =>
                        player.color !== this.playerColor
                    )?.name || "Opponent";

            this.updateStatus(
                "Playing against " + this.opponentName
            );
        }
    }

    /* RECEIVE OPPONENT MOVE */
    handleOpponentMove(gameData) {
        if (
            this.mode !== "online" ||
            !this.isGameActive ||
            !gameData?.fen ||
            this.isSynchronizing
        ) {
            return;
        }

        const currentFen = window.apparaChess.getPosition();

        if (currentFen === gameData.fen) return;

        this.isSynchronizing = true;

        try {
            const loaded = window.apparaChess.loadPosition(
                gameData.fen
            );

            if (!loaded) {
                this.updateStatus(
                    "Could not synchronize opponent position."
                );
                return;
            }

            this.isMyTurn =
                window.apparaChess.getTurn() === this.playerColor;

            const history =
                window.apparaChess.getDetailedHistory();

            const lastMove = history.length
                ? history[history.length - 1]
                : null;

            window.apparaBoard?.setLastMove(lastMove);
            window.apparaBoard?.refresh();

            if (typeof this.onMoveReceived === "function") {
                this.onMoveReceived(gameData);
            }

            this.checkGameEnd();

        } finally {
            this.isSynchronizing = false;
        }
    }

    /* UNDO MOVE */
    undoMove() {
        if (!this.isGameActive || this.mode === "online") {
            return false;
        }

        const undone = window.apparaChess.undoMove();

        if (!undone) return false;

        if (this.mode === "computer") {
            window.apparaChess.undoMove();
        }

        this.isMyTurn =
            this.mode === "offline" ||
            window.apparaChess.getTurn() === this.playerColor;

        window.apparaBoard?.refresh();

        return true;
    }

    /* RESIGN GAME */
    async resign() {
        if (!this.isGameActive) return false;

        this.isGameActive = false;

        window.apparaTimer?.stop();

        const winner = this.mode === "offline"
            ? null
            : (
                this.playerColor === "white"
                    ? "black"
                    : "white"
            );

        if (this.mode === "online") {
            await window.apparaOnline.sendResult({
                winner: winner,
                reason: "resignation"
            });
        }

        this.updateStatus("Game resigned.");

        if (typeof this.onGameFinished === "function") {
            this.onGameFinished({
                winner: winner,
                reason: "resignation"
            });
        }

        return true;
    }

    /* CHECK GAME END */
    checkGameEnd() {
        const status = window.apparaChess.getStatus();

        if (!status.gameOver) return false;

        this.isGameActive = false;

        window.apparaTimer?.stop();

        if (status.checkmate) {
            window.apparaSound?.playVictory();
        } else {
            window.apparaSound?.playClick();
        }

        if (this.mode === "online") {
            window.apparaOnline.sendResult({
                winner: status.winner,
                reason: status.reason
            });
        }

        if (typeof this.onGameFinished === "function") {
            this.onGameFinished(status);
        }

        this.updateStatus(
            status.checkmate
                ? "Checkmate!"
                : "Game drawn."
        );

        return true;
    }

    /* UPDATE STATUS */
    updateStatus(message) {
        if (typeof this.onStatusChange === "function") {
            this.onStatusChange(message);
        }

        const element =
            document.getElementById("game-status");

        if (element) {
            element.textContent = message;
        }
    }

    /* EXIT GAME */
    async exitGame() {
        this.isGameActive = false;
        this.isMyTurn = false;

        window.apparaTimer?.stop();

        if (this.mode === "online") {
            await window.apparaOnline.leaveRoom();
        }

        window.apparaChess.reset();
        window.apparaBoard?.clearSelection();
        window.apparaBoard?.refresh();

        this.updateStatus("Game ended.");

        return true;
    }

}

/* GLOBAL MULTIPLAYER CONTROLLER */
window.apparaMultiplayer = new ApparaChessMultiplayer();

/* PART 13 END */
          
