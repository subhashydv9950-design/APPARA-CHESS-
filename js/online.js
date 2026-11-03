/* =========================================================
   APPARA CHESS — ONLINE ROOM SYSTEM
   PART 13 — js/online.js
   ========================================================= */

(function () {
  "use strict";

  const Online = {
    initialized: false,
    connected: false,
    currentRoomCode: null,
    currentRoom: null,
    currentPlayer: null,
    currentPlayerColor: null,

    roomListener: null,
    connectionListener: null,

    callbacks: {
      onRoomUpdate: null,
      onPlayerJoined: null,
      onPlayerLeft: null,
      onMove: null,
      onStatusChange: null,
      onError: null
    },

    /* ---------- INITIALIZATION ---------- */

    init(options = {}) {
      this.callbacks.onRoomUpdate =
        options.onRoomUpdate || null;

      this.callbacks.onPlayerJoined =
        options.onPlayerJoined || null;

      this.callbacks.onPlayerLeft =
        options.onPlayerLeft || null;

      this.callbacks.onMove =
        options.onMove || null;

      this.callbacks.onStatusChange =
        options.onStatusChange || null;

      this.callbacks.onError =
        options.onError || null;

      if (
        !window.APPARA_FIREBASE ||
        !window.APPARA_FIREBASE.isAvailable()
      ) {
        this.setStatus(false, "Firebase unavailable");
        return false;
      }

      const initialized =
        window.APPARA_FIREBASE.initialize();

      if (!initialized) {
        this.setStatus(false, "Firebase not configured");
        return false;
      }

      const database =
        window.APPARA_FIREBASE.getDatabase();

      if (!database) {
        this.setStatus(false, "Database unavailable");
        return false;
      }

      this.connectionListener = database.ref(".info/connected");

      this.connectionListener.on("value", (snapshot) => {
        this.connected = snapshot.val() === true;

        this.setStatus(
          this.connected,
          this.connected ? "Connected" : "Disconnected"
        );
      });

      this.initialized = true;

      return true;
    },

    /* ---------- STATUS ---------- */

    setStatus(connected, message) {
      this.connected = Boolean(connected);

      const indicator = document.getElementById(
        "connection-indicator"
      );

      const statusText = document.getElementById(
        "online-connection-status"
      );

      if (indicator) {
        indicator.classList.toggle(
          "connected",
          this.connected
        );

        indicator.classList.toggle(
          "disconnected",
          !this.connected
        );
      }

      if (statusText) {
        statusText.textContent = message || (
          this.connected ? "Connected" : "Disconnected"
        );
      }

      if (typeof this.callbacks.onStatusChange === "function") {
        this.callbacks.onStatusChange({
          connected: this.connected,
          message
        });
      }
    },

    reportError(error) {
      console.error("APPARA ONLINE:", error);

      if (typeof this.callbacks.onError === "function") {
        this.callbacks.onError(error);
      }

      return {
        success: false,
        error: error && error.message
          ? error.message
          : String(error)
      };
    },

    /* ---------- FIREBASE ACCESS ---------- */

    getDatabase() {
      if (!window.APPARA_FIREBASE) return null;

      return window.APPARA_FIREBASE.getDatabase();
    },

    getAuth() {
      if (!window.APPARA_FIREBASE) return null;

      return window.APPARA_FIREBASE.getAuth();
    },

    async ensureAuthenticated() {
      const auth = this.getAuth();

      if (!auth) {
        throw new Error("Firebase Authentication unavailable.");
      }

      if (auth.currentUser) {
        return auth.currentUser;
      }

      const credential = await auth.signInAnonymously();

      if (!credential || !credential.user) {
        throw new Error("Anonymous sign-in failed.");
      }

      return credential.user;
    },

    getRoomReference(code) {
      if (!window.APPARA_FIREBASE) return null;

      return window.APPARA_FIREBASE.getRoomReference(
        String(code).toUpperCase()
      );
    },

    /* ---------- ROOM CODE ---------- */

    generateRoomCode() {
      const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

      let code = "";

      for (let index = 0; index < 6; index++) {
        code += characters.charAt(
          Math.floor(Math.random() * characters.length)
        );
      }

      return code;
    },

    /* ---------- PLAYER INFORMATION ---------- */

    getPlayerName() {
      const input = document.getElementById(
        "online-player-name"
      );

      const value = input && input.value
        ? input.value.trim()
        : "";

      return value || "Guest Player";
    },

    createPlayerData(user, name, color) {
      return {
        uid: user.uid,
        name: String(name || "Guest Player").slice(0, 24),
        color,
        joinedAt: Date.now(),
        isOnline: true
      };
    },

    /* ---------- CREATE ROOM ---------- */

    async createRoom(options = {}) {
      try {
        if (!this.initialized && !this.init()) {
          throw new Error("Online system is not initialized.");
        }

        await this.ensureAuthenticated();

        const auth = this.getAuth();
        const user = auth.currentUser;

        const database = this.getDatabase();

        if (!database) {
          throw new Error("Realtime Database unavailable.");
        }

        const playerName = String(
          options.name || this.getPlayerName()
        ).trim().slice(0, 24) || "Guest Player";

        const game = window.APPARA_ENGINE
          ? window.APPARA_ENGINE.getGame()
          : null;

        const startingFen = game
          ? game.fen()
          : "start";

        let roomCode = null;
        let roomReference = null;

        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = this.generateRoomCode();
          const candidateReference = this.getRoomReference(candidate);

          if (!candidateReference) {
            throw new Error("Unable to create room reference.");
          }

          const result = await candidateReference.transaction(
            (currentData) => {
              if (currentData !== null) {
                return;
              }

              return {
                code: candidate,
                status: "waiting",
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                hostUid: user.uid,
                players: {
                  white: this.createPlayerData(
                    user,
                    playerName,
                    "white"
                  ),
                  black: null
                },
                game: {
                  fen: startingFen,
                  pgn: "",
                  moves: [],
                  turn: "w",
                  moveNumber: 1,
                  lastMove: null,
                  result: null
                },
                settings: {
                  timeMinutes: Number(options.minutes) || 10,
                  increment: Number(options.increment) || 0,
                  rated: options.rated === true
                }
              };
            },
            undefined,
            false
          );

          if (result.committed) {
            roomCode = candidate;
            roomReference = candidateReference;
            break;
          }
        }

        if (!roomCode || !roomReference) {
          throw new Error("Could not generate a unique room code.");
        }

        this.currentRoomCode = roomCode;
        this.currentPlayer = user.uid;
        this.currentPlayerColor = "white";

        this.listenToRoom(roomCode);

        return {
          success: true,
          code: roomCode,
          color: "white",
          room: roomReference
        };
      } catch (error) {
        return this.reportError(error);
      }
    },

    /* ---------- JOIN ROOM ---------- */

    async joinRoom(code, options = {}) {
      try {
        if (!this.initialized && !this.init()) {
          throw new Error("Online system is not initialized.");
        }

        const roomCode = String(code || "")
          .trim()
          .toUpperCase();

        if (!/^[A-HJ-NP-Z2-9]{6}$/.test(roomCode)) {
          throw new Error("Please enter a valid 6-character room code.");
        }

        await this.ensureAuthenticated();

        const user = this.getAuth().currentUser;
        const reference = this.getRoomReference(roomCode);

        if (!reference) {
          throw new Error("Room reference unavailable.");
        }

        const playerName = String(
          options.name || this.getPlayerName()
        ).trim().slice(0, 24) || "Guest Player";

        let assignedColor = null;

        const result = await reference.transaction(
          (room) => {
            if (!room || !room.players) {
              return;
            }

            const white = room.players.white;
            const black = room.players.black;

            if (white && white.uid === user.uid) {
              assignedColor = "white";
              return room;
            }

            if (black && black.uid === user.uid) {
              assignedColor = "black";
              return room;
            }

            if (room.status !== "waiting") {
              return;
            }

            if (black !== null) {
              return;
            }

            room.players.black = this.createPlayerData(
              user,
              playerName,
              "black"
            );

            room.status = "active";
            room.updatedAt =
              firebase.database.ServerValue.TIMESTAMP;

            assignedColor = "black";

            return room;
          },
          undefined,
          false
        );

        if (!result.committed || !assignedColor) {
          throw new Error(
            "Room is unavailable, full, or no longer waiting."
          );
        }

        this.currentRoomCode = roomCode;
        this.currentPlayer = user.uid;
        this.currentPlayerColor = assignedColor;

        this.listenToRoom(roomCode);

        return {
          success: true,
          code: roomCode,
          color: assignedColor,
          room: result.snapshot.val()
        };
      } catch (error) {
        return this.reportError(error);
      }
    },

    /* ---------- LISTEN TO ROOM ---------- */

    listenToRoom(code) {
      this.stopRoomListener();

      const reference = this.getRoomReference(code);

      if (!reference) return false;

      let previousRoom = null;

      this.roomListener = reference;

      reference.on(
        "value",
        (snapshot) => {
          if (!snapshot.exists()) {
            this.currentRoom = null;
            return;
          }

          const room = snapshot.val();
          const oldRoom = previousRoom;

          this.currentRoom = room;
          previousRoom = room;

          this.updateRoomDisplay(room);

          if (
            oldRoom &&
            !oldRoom.players.black &&
            room.players.black
          ) {
            if (typeof this.callbacks.onPlayerJoined === "function") {
              this.callbacks.onPlayerJoined(
                room.players.black
              );
            }
          }

          if (
            oldRoom &&
            oldRoom.game &&
            room.game &&
            oldRoom.game.moves &&
            room.game.moves.length < room.game.moves.length
          ) {
            const latestMove =
              room.game.moves[room.game.moves.length - 1];

            if (typeof this.callbacks.onMove === "function") {
              this.callbacks.onMove(latestMove, room);
            }
          }

          if (typeof this.callbacks.onRoomUpdate === "function") {
            this.callbacks.onRoomUpdate(room);
          }
        },
        (error) => {
          this.reportError(error);
        }
      );

      return true;
    },

    stopRoomListener() {
      if (this.roomListener) {
        this.roomListener.off("value");
        this.roomListener = null;
      }
    },

    /* ---------- ROOM DISPLAY ---------- */

    updateRoomDisplay(room) {
      const roomContainer = document.getElementById(
        "created-room-container"
      );

      const roomCodeElement = document.getElementById(
        "created-room-code"
      );

      if (roomContainer) {
        roomContainer.hidden = false;
      }

      if (roomCodeElement) {
        roomCodeElement.textContent =
          room.code || this.currentRoomCode || "";
      }

      const playerNameElement = document.getElementById(
        "online-player-name"
      );

      if (
        playerNameElement &&
        room.players &&
        room.players.white &&
        room.players.black
      ) {
        playerNameElement.dataset.roomStatus = room.status;
      }
    },

    /* ---------- SEND MOVE ---------- */

    async sendMove(moveData) {
      try {
        if (!this.currentRoomCode || !this.currentPlayer) {
          throw new Error("You are not in an online room.");
        }

        const reference = this.getRoomReference(
          this.currentRoomCode
        );

        if (!reference) {
          throw new Error("Room reference unavailable.");
        }

        const user = this.getAuth().currentUser;

        if (!user || user.uid !== this.currentPlayer) {
          throw new Error("Player authentication mismatch.");
        }

        const engine = window.APPARA_ENGINE;

        if (!engine) {
          throw new Error("Chess engine unavailable.");
        }

        const result = engine.move(moveData);

        if (!result) {
          throw new Error("Illegal chess move.");
        }

        const game = engine.getGame();

        const update = {
          fen: game.fen(),
          pgn: game.pgn(),
          turn: game.turn(),
          moveNumber: game.move_number(),
          lastMove: {
            from: result.from,
            to: result.to,
            san: result.san,
            color: result.color,
            timestamp: Date.now()
          },
          result: engine.isGameOver()
            ? engine.getGameStatus()
            : null
        };

        const transaction = await reference.child("game").transaction(
          (currentGame) => {
            if (!currentGame) return;

            const players = this.currentRoom &&
              this.currentRoom.players;

            if (!players) return;

            const player = this.currentPlayerColor === "white"
              ? players.white
              : players.black;

            if (!player || player.uid !== user.uid) {
              return;
            }

            currentGame.fen = update.fen;
            currentGame.pgn = update.pgn;
            currentGame.turn = update.turn;
            currentGame.moveNumber = update.moveNumber;
            currentGame.lastMove = update.lastMove;
            currentGame.result = update.result;

            currentGame.moves = Array.isArray(currentGame.moves)
              ? currentGame.moves
              : [];

            currentGame.moves.push(update.lastMove);

            return currentGame;
          },
          undefined,
          false
        );

        if (!transaction.committed) {
          engine.undo();
          throw new Error("Online move could not be saved.");
        }

        return {
          success: true,
          move: result,
          game: transaction.snapshot.val()
        };
      } catch (error) {
        return this.reportError(error);
      }
    },

    /* ---------- UPDATE PLAYER PRESENCE ---------- */

    async setPlayerOnline(isOnline) {
      try {
        if (!this.currentRoomCode || !this.currentPlayer) {
          return false;
        }

        const reference = this.getRoomReference(
          this.currentRoomCode
        );

        const color = this.currentPlayerColor;

        if (!reference || !color) return false;

        await reference.child(
          "players/" + color + "/isOnline"
        ).set(Boolean(isOnline));

        return true;
      } catch (error) {
        this.reportError(error);
        return false;
      }
    },

    /* ---------- LEAVE ROOM ---------- */

    async leaveRoom() {
      try {
        if (!this.currentRoomCode || !this.currentPlayer) {
          this.stopRoomListener();
          return true;
        }

        const reference = this.getRoomReference(
          this.currentRoomCode
        );

        if (reference && this.currentPlayerColor) {
          const playerReference = reference.child(
            "players/" + this.currentPlayerColor
          );

          const snapshot = await playerReference.once("value");
          const player = snapshot.val();

          if (player && player.uid === this.currentPlayer) {
            await playerReference.update({
              isOnline: false,
              leftAt: Date.now()
            });
          }
        }

        this.stopRoomListener();

        this.currentRoomCode = null;
        this.currentPlayer = null;
        this.currentPlayerColor = null;
        this.currentRoom = null;

        return true;
      } catch (error) {
        return this.reportError(error);
      }
    },

    /* ---------- GET ROOM STATE ---------- */

    getRoom() {
      return this.currentRoom;
    },

    getRoomCode() {
      return this.currentRoomCode;
    },

    getPlayerColor() {
      return this.currentPlayerColor;
    },

    isConnected() {
      return this.connected;
    },

    /* ---------- COPY ROOM CODE ---------- */

    async copyRoomCode() {
      if (!this.currentRoomCode) return false;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(
            this.currentRoomCode
          );

          return true;
        }

        const temporary = document.createElement("textarea");

        temporary.value = this.currentRoomCode;
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";

        document.body.appendChild(temporary);

        temporary.select();

        const copied = document.execCommand("copy");

        temporary.remove();

        return copied;
      } catch (error) {
        this.reportError(error);
        return false;
      }
    },

    /* ---------- CLEANUP ---------- */

    destroy() {
      this.stopRoomListener();

      if (this.connectionListener) {
        this.connectionListener.off("value");
        this.connectionListener = null;
      }

      this.currentRoomCode = null;
      this.currentRoom = null;
      this.currentPlayer = null;
      this.currentPlayerColor = null;

      this.initialized = false;
      this.connected = false;

      return true;
    }
  };

  window.APPARA_ONLINE = Online;

})();

/* =========================================================
   APPARA CHESS — ONLINE ROOM SYSTEM
   PART 13 END
   ========================================================= */
