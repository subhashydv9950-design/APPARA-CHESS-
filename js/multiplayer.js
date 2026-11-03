/* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 14 — js/multiplayer.js
   ========================================================= */

(function () {
  "use strict";

  const Multiplayer = {
    initialized: false,
    active: false,
    mode: "offline",
    playerColor: null,
    opponent: null,
    roomCode: null,
    processingMove: false,
    lastSyncedFen: null,
    callbacks: {
      onGameStart: null,
      onOpponentMove: null,
      onPlayerJoined: null,
      onPlayerLeft: null,
      onGameEnd: null,
      onError: null
    },

    /* ---------- INITIALIZATION ---------- */

    init(options = {}) {
      this.callbacks.onGameStart =
        typeof options.onGameStart === "function"
          ? options.onGameStart
          : null;

      this.callbacks.onOpponentMove =
        typeof options.onOpponentMove === "function"
          ? options.onOpponentMove
          : null;

      this.callbacks.onPlayerJoined =
        typeof options.onPlayerJoined === "function"
          ? options.onPlayerJoined
          : null;

      this.callbacks.onPlayerLeft =
        typeof options.onPlayerLeft === "function"
          ? options.onPlayerLeft
          : null;

      this.callbacks.onGameEnd =
        typeof options.onGameEnd === "function"
          ? options.onGameEnd
          : null;

      this.callbacks.onError =
        typeof options.onError === "function"
          ? options.onError
          : null;

      this.initialized = true;

      return true;
    },

    /* ---------- ERROR HANDLING ---------- */

    reportError(error) {
      console.error("APPARA MULTIPLAYER:", error);

      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }

      return false;
    },

    /* ---------- START OFFLINE GAME ---------- */

    startOffline() {
      if (!window.APPARA_ENGINE) {
        return this.reportError(
          new Error("Chess engine is unavailable.")
        );
      }

      this.stop();

      this.mode = "offline";
      this.active = true;
      this.playerColor = null;
      this.opponent = null;
      this.roomCode = null;
      this.processingMove = false;

      this.lastSyncedFen = window.APPARA_ENGINE.getFEN();

      this.connectBoard();

      return true;
    },

    /* ---------- START COMPUTER GAME ---------- */

    startComputer(options = {}) {
      if (!window.APPARA_ENGINE || !window.APPARA_AI) {
        return this.reportError(
          new Error("Chess engine or AI is unavailable.")
        );
      }

      this.stop();

      this.mode = "computer";
      this.active = true;

      this.playerColor = options.playerColor === "black"
        ? "black"
        : "white";

      this.opponent = {
        name: options.opponentName || "APPARA AI",
        color: this.playerColor === "white" ? "black" : "white"
      };

      this.processingMove = false;
      this.lastSyncedFen = window.APPARA_ENGINE.getFEN();

      window.APPARA_AI.setDifficulty(
        options.difficulty || "medium"
      );

      this.connectBoard();

      if (this.playerColor === "black") {
        this.playComputerTurn();
      }

      return true;
    },

    /* ---------- START ONLINE GAME ---------- */

    startOnline(options = {}) {
      if (!window.APPARA_ENGINE || !window.APPARA_ONLINE) {
        return this.reportError(
          new Error("Online services are unavailable.")
        );
      }

      const online = window.APPARA_ONLINE;

      if (!online.getRoomCode() || !online.getPlayerColor()) {
        return this.reportError(
          new Error("Join or create an online room first.")
        );
      }

      this.stop();

      this.mode = "online";
      this.active = true;

      this.playerColor = online.getPlayerColor();
      this.roomCode = online.getRoomCode();

      this.processingMove = false;

      const room = online.getRoom();

      if (room && room.game && room.game.fen !== "start") {
        window.APPARA_ENGINE.load(room.game.fen);
      } else {
        window.APPARA_ENGINE.reset();
      }

      this.lastSyncedFen = window.APPARA_ENGINE.getFEN();

      this.connectBoard();

      online.callbacks.onRoomUpdate = (updatedRoom) => {
        this.handleRoomUpdate(updatedRoom);
      };

      online.callbacks.onPlayerJoined = (player) => {
        this.opponent = player;

        if (this.callbacks.onPlayerJoined) {
          this.callbacks.onPlayerJoined(player);
        }
      };

      online.callbacks.onPlayerLeft = (player) => {
        if (this.callbacks.onPlayerLeft) {
          this.callbacks.onPlayerLeft(player);
        }
      };

      online.callbacks.onError = (error) => {
        this.reportError(error);
      };

      this.handleRoomUpdate(room);

      return true;
    },

    /* ---------- CONNECT BOARD ---------- */

    connectBoard() {
      if (!window.APPARA_BOARD) return false;

      window.APPARA_BOARD.setMoveHandler(
        (moveData) => this.handlePlayerMove(moveData)
      );

      return true;
    },

    /* ---------- PLAYER MOVE ---------- */

    async handlePlayerMove(moveData) {
      if (!this.active || this.processingMove) {
        return false;
      }

      const engine = window.APPARA_ENGINE;

      if (!engine || engine.isGameOver()) {
        return false;
      }

      const currentColor = engine.turn() === "w"
        ? "white"
        : "black";

      if (
        this.mode !== "offline" &&
        this.playerColor !== currentColor
      ) {
        return false;
      }

      if (this.mode === "computer") {
        if (currentColor !== this.playerColor) {
          return false;
        }
      }

      this.processingMove = true;

      try {
        if (this.mode === "online") {
          const result = await window.APPARA_ONLINE.sendMove(
            moveData
          );

          if (!result || !result.success) {
            return false;
          }

          this.lastSyncedFen = engine.getFEN();

          this.afterSuccessfulMove(result.move);

          return true;
        }

        const result = engine.move(moveData);

        if (!result) {
          return false;
        }

        this.lastSyncedFen = engine.getFEN();

        this.afterSuccessfulMove(result);

        if (
          this.mode === "computer" &&
          this.active &&
          !engine.isGameOver()
        ) {
          await this.playComputerTurn();
        }

        return true;
      } catch (error) {
        return this.reportError(error);
      } finally {
        this.processingMove = false;
      }
    },

    /* ---------- COMPUTER TURN ---------- */

    async playComputerTurn() {
      if (
        !this.active ||
        this.mode !== "computer" ||
        this.processingMove
      ) {
        return false;
      }

      const engine = window.APPARA_ENGINE;

      if (!engine || engine.isGameOver()) {
        this.finishGame();
        return false;
      }

      const currentColor = engine.turn() === "w"
        ? "white"
        : "black";

      if (currentColor === this.playerColor) {
        return false;
      }

      this.processingMove = true;

      try {
        const result = await window.APPARA_AI.playTurn({
          color: engine.turn()
        });

        if (!result) return false;

        this.lastSyncedFen = engine.getFEN();

        this.afterSuccessfulMove(result);

        return true;
      } catch (error) {
        return this.reportError(error);
      } finally {
        this.processingMove = false;
      }
    },

    /* ---------- AFTER SUCCESSFUL MOVE ---------- */

    afterSuccessfulMove(move) {
      if (window.APPARA_BOARD) {
        window.APPARA_BOARD.setLastMove(
          move.from,
          move.to
        );

        window.APPARA_BOARD.refresh();
      }

      if (window.APPARA_SOUND) {
        if (move.captured) {
          window.APPARA_SOUND.capture();
        } else {
          window.APPARA_SOUND.move();
        }
      }

      if (window.APPARA_TIMER) {
        const nextColor = window.APPARA_ENGINE.turn() === "w"
          ? "white"
          : "black";

        window.APPARA_TIMER.switchTurn(nextColor);

        if (!window.APPARA_TIMER.isRunning) {
          window.APPARA_TIMER.start(nextColor);
        }
      }

      this.checkGameEnd();

      return true;
    },

    /* ---------- RECEIVE ROOM UPDATE ---------- */

    handleRoomUpdate(room) {
      if (
        !this.active ||
        this.mode !== "online" ||
        !room ||
        !room.game
      ) {
        return false;
      }

      const engine = window.APPARA_ENGINE;

      if (!engine) return false;

      const remoteFen = room.game.fen;

      if (
        remoteFen &&
        remoteFen !== "start" &&
        remoteFen !== this.lastSyncedFen
      ) {
        const previousFen = engine.getFEN();

        if (remoteFen !== previousFen) {
          const loaded = engine.load(remoteFen);

          if (!loaded) {
            return this.reportError(
              new Error("Could not synchronize the online board.")
            );
          }

          this.lastSyncedFen = remoteFen;

          if (window.APPARA_BOARD) {
            window.APPARA_BOARD.clearLastMove();

            const lastMove = room.game.lastMove;

            if (lastMove && lastMove.from && lastMove.to) {
              window.APPARA_BOARD.setLastMove(
                lastMove.from,
                lastMove.to
              );
            }

            window.APPARA_BOARD.refresh();
          }

          if (window.APPARA_TIMER) {
            const nextColor = engine.turn() === "w"
              ? "white"
              : "black";

            if (!window.APPARA_TIMER.isRunning) {
              window.APPARA_TIMER.start(nextColor);
            } else {
              window.APPARA_TIMER.switchTurn(nextColor);
            }
          }

          if (this.callbacks.onOpponentMove) {
            this.callbacks.onOpponentMove(
              room.game.lastMove,
              room
            );
          }

          this.checkGameEnd();
        }
      }

      if (
        room.players &&
        room.players.white &&
        room.players.black
      ) {
        this.opponent = this.playerColor === "white"
          ? room.players.black
          : room.players.white;

        if (this.callbacks.onGameStart) {
          this.callbacks.onGameStart(room);
        }
      }

      return true;
    },

    /* ---------- GAME END ---------- */

    checkGameEnd() {
      const engine = window.APPARA_ENGINE;

      if (!engine || !engine.isGameOver()) {
        return false;
      }

      this.finishGame();
      return true;
    },

    finishGame() {
      if (!this.active) return false;

      this.active = false;

      if (window.APPARA_TIMER) {
        window.APPARA_TIMER.stop();
      }

      if (window.APPARA_AI) {
        window.APPARA_AI.stop();
      }

      const result = window.APPARA_ENGINE
        ? window.APPARA_ENGINE.getGameStatus()
        : null;

      if (window.APPARA_SOUND) {
        window.APPARA_SOUND.gameEnd();
      }

      if (this.callbacks.onGameEnd) {
        this.callbacks.onGameEnd(result);
      }

      return result;
    },

    /* ---------- RESIGN ---------- */

    async resign() {
      if (!this.active) return false;

      const result = {
        type: "resignation",
        resignedColor: this.playerColor,
        winner: this.playerColor === "white"
          ? "black"
          : "white"
      };

      this.active = false;

      if (window.APPARA_TIMER) {
        window.APPARA_TIMER.stop();
      }

      if (
        this.mode === "online" &&
        window.APPARA_ONLINE
      ) {
        const roomReference =
          window.APPARA_ONLINE.getRoomReference(
            this.roomCode
          );

        if (roomReference) {
          try {
            await roomReference.child("game/result").set(result);
          } catch (error) {
            this.reportError(error);
          }
        }
      }

      if (this.callbacks.onGameEnd) {
        this.callbacks.onGameEnd(result);
      }

      return result;
    },

    /* ---------- DRAW OFFER ---------- */

    async offerDraw() {
      if (!this.active) return false;

      if (this.mode !== "online") {
        return {
          success: false,
          message: "Draw offers are available in online games."
        };
      }

      const reference =
        window.APPARA_ONLINE.getRoomReference(this.roomCode);

      if (!reference) return false;

      try {
        await reference.child("drawOffer").set({
          from: this.playerColor,
          status: "pending",
          createdAt: Date.now()
        });

        return true;
      } catch (error) {
        return this.reportError(error);
      }
    },

    /* ---------- PAUSE AND RESUME ---------- */

    pause() {
      if (!this.active) return false;

      if (window.APPARA_TIMER) {
        window.APPARA_TIMER.pause();
      }

      return true;
    },

    resume() {
      if (!this.active) return false;

      if (
        window.APPARA_TIMER &&
        window.APPARA_TIMER.isPaused
      ) {
        window.APPARA_TIMER.resume();
      }

      return true;
    },

    /* ---------- GAME STATE ---------- */

    getState() {
      return {
        initialized: this.initialized,
        active: this.active,
        mode: this.mode,
        playerColor: this.playerColor,
        opponent: this.opponent,
        roomCode: this.roomCode,
        processingMove: this.processingMove
      };
    },

    /* ---------- STOP ---------- */

    stop() {
      this.active = false;
      this.processingMove = false;

      if (window.APPARA_AI) {
        window.APPARA_AI.stop();
      }

      if (window.APPARA_BOARD) {
        window.APPARA_BOARD.setMoveHandler(null);
      }

      return true;
    },

    /* ---------- CLEANUP ---------- */

    destroy() {
      this.stop();

      this.mode = "offline";
      this.playerColor = null;
      this.opponent = null;
      this.roomCode = null;
      this.lastSyncedFen = null;

      this.initialized = false;

      Object.keys(this.callbacks).forEach((key) => {
        this.callbacks[key] = null;
      });

      return true;
    }
  };

  window.APPARA_MULTIPLAYER = Multiplayer;

})();

/* =========================================================
   APPARA CHESS — MULTIPLAYER CONTROLLER
   PART 14 END
   ========================================================= */
