
/* =========================================================
   APPARA CHESS — ONLINE MULTIPLAYER SERVICE
   FILE: js/online.js
   PART 12
========================================================= */

"use strict";

class ApparaChessOnline {

    constructor() {
        this.firebaseApp = null;
        this.auth = null;
        this.database = null;
        this.roomRef = null;

        this.user = null;
        this.roomId = null;
        this.roomCode = null;

        this.isHost = false;
        this.connected = false;
        this.isReady = false;

        this.playerColor = null;
        this.opponent = null;

        this.listeners = [];
        this.onConnectionChange = null;
        this.onRoomUpdate = null;
        this.onOpponentMove = null;
        this.onOpponentJoined = null;
        this.onOpponentLeft = null;
        this.onError = null;

        this.config = null;
    }

    /* INITIALIZE FIREBASE */
    async initialize(config) {
        if (!config || !config.apiKey ||
            !config.databaseURL || !config.projectId) {
            return this.reportError(
                "Firebase configuration is incomplete."
            );
        }

        if (!window.firebase ||
            typeof window.firebase.initializeApp !== "function") {
            return this.reportError(
                "Firebase SDK is not loaded."
            );
        }

        try {
            this.config = config;

            if (!window.firebase.apps.length) {
                this.firebaseApp =
                    window.firebase.initializeApp(config);
            } else {
                this.firebaseApp =
                    window.firebase.app();
            }

            this.auth = window.firebase.auth();
            this.database = window.firebase.database();

            this.auth.onAuthStateChanged(user => {
                this.user = user || null;
            });

            this.isReady = true;

            return true;

        } catch (error) {
            return this.reportError(error.message);
        }
    }

    /* SIGN IN ANONYMOUSLY */
    async signInGuest(displayName = "Guest Player") {
        if (!this.isReady) {
            return this.reportError(
                "Initialize Firebase before signing in."
            );
        }

        try {
            const result =
                await this.auth.signInAnonymously();

            this.user = result.user;

            await this.user.updateProfile({
                displayName: displayName
            });

            return {
                success: true,
                uid: this.user.uid,
                name: displayName
            };

        } catch (error) {
            return this.reportError(error.message);
        }
    }

    /* GENERATE ROOM CODE */
    generateRoomCode() {
        const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let code = "";

        for (let i = 0; i < 6; i++) {
            code += characters[
                Math.floor(Math.random() * characters.length)
            ];
        }

        return code;
    }

    /* CREATE PRIVATE ROOM */
    async createRoom(options = {}) {
        if (!this.isReady || !this.user) {
            return this.reportError(
                "Sign in before creating a room."
            );
        }

        try {
            const code = this.generateRoomCode();
            const roomId = this.database.ref("rooms").push().key;

            const roomData = {
                code: code,
                host: this.user.uid,
                status: "waiting",
                createdAt: Date.now(),

                settings: {
                    clock: options.clock || "rapid",
                    difficulty: options.difficulty || "medium"
                },

                players: {
                    [this.user.uid]: {
                        name: this.user.displayName || "Player 1",
                        color: "white",
                        joinedAt: Date.now(),
                        connected: true
                    }
                },

                game: {
                    fen: "start",
                    pgn: "",
                    lastMove: null,
                    updatedAt: Date.now()
                }
            };

            await this.database.ref("rooms/" + roomId)
                .set(roomData);

            this.roomId = roomId;
            this.roomCode = code;
            this.isHost = true;
            this.playerColor = "white";
            this.connected = true;

            await this.listenToRoom();

            return {
                success: true,
                roomId: roomId,
                roomCode: code,
                color: "white"
            };

        } catch (error) {
            return this.reportError(error.message);
        }
    }

    /* JOIN PRIVATE ROOM */
    async joinRoom(code) {
        if (!this.isReady || !this.user) {
            return this.reportError(
                "Sign in before joining a room."
            );
        }

        if (!code || code.trim().length !== 6) {
            return this.reportError("Invalid room code.");
        }

        try {
            const snapshot = await this.database.ref("rooms")
                .orderByChild("code")
                .equalTo(code.trim().toUpperCase())
                .once("value");

            if (!snapshot.exists()) {
                return this.reportError("Room not found.");
            }

            const rooms = snapshot.val();
            const roomId = Object.keys(rooms)[0];
            const room = rooms[roomId];

            if (room.status !== "waiting") {
                return this.reportError(
                    "This room is no longer available."
                );
            }

            if (Object.keys(room.players || {}).length >= 2) {
                return this.reportError("Room is full.");
            }

            if (room.players[this.user.uid]) {
                return this.reportError(
                    "You are already in this room."
                );
            }

            const color = "black";

            await this.database.ref(
                "rooms/" + roomId + "/players/" + this.user.uid
            ).set({
                name: this.user.displayName || "Player 2",
                color: color,
                joinedAt: Date.now(),
                connected: true
            });

            await this.database.ref(
                "rooms/" + roomId
            ).update({
                status: "playing"
            });

            this.roomId = roomId;
            this.roomCode = room.code;
            this.isHost = false;
            this.playerColor = color;
            this.connected = true;

            await this.listenToRoom();

            if (typeof this.onOpponentJoined === "function") {
                this.onOpponentJoined(room.host);
            }

            return {
                success: true,
                roomId: roomId,
                roomCode: room.code,
                color: color
            };

        } catch (error) {
            return this.reportError(error.message);
        }
    }

    /* LISTEN TO ROOM */
    async listenToRoom() {
        if (!this.roomId) return false;

        const roomReference =
            this.database.ref("rooms/" + this.roomId);

        this.roomRef = roomReference;

        const callback = snapshot => {
            const room = snapshot.val();

            if (!room) {
                this.connected = false;
                return;
            }

            this.opponent = Object.entries(room.players || {})
                .find(([uid]) => uid !== this.user.uid)?.[1] || null;

            if (typeof this.onRoomUpdate === "function") {
                this.onRoomUpdate(room);
            }

            if (
                room.game?.lastMove &&
                room.game.lastMove.player !== this.user.uid &&
                typeof this.onOpponentMove === "function"
            ) {
                this.onOpponentMove(room.game);
            }

            if (typeof this.onConnectionChange === "function") {
                this.onConnectionChange(true);
            }
        };

        roomReference.on("value", callback);

        this.listeners.push({
            reference: roomReference,
            event: "value",
            callback: callback
        });

        return true;
    }

    /* SEND MOVE */
    async sendMove(moveData) {
        if (!this.connected || !this.roomId || !this.user) {
            return this.reportError(
                "Not connected to an online game."
            );
        }

        try {
            const engine = window.apparaChess;

            if (!engine || !engine.isReady()) {
                return this.reportError(
                    "Chess engine is unavailable."
                );
            }

            const data = {
                fen: engine.getPosition(),
                pgn: engine.getPGN(),

                lastMove: {
                    from: moveData.from,
                    to: moveData.to,
                    promotion: moveData.promotion || null,
                    player: this.user.uid,
                    timestamp: Date.now()
                },

                updatedAt: Date.now()
            };

            await this.database.ref(
                "rooms/" + this.roomId + "/game"
            ).update(data);

            return {
                success: true
            };

        } catch (error) {
            return this.reportError(error.message);
        }
    }

    /* SEND GAME RESULT */
    async sendResult(result) {
        if (!this.roomId || !this.user) return false;

        try {
            await this.database.ref(
                "rooms/" + this.roomId + "/result"
            ).set({
                winner: result.winner || null,
                reason: result.reason || "finished",
                completedAt: Date.now()
            });

            return true;

        } catch (error) {
            this.reportError(error.message);
            return false;
        }
    }

    /* LEAVE ROOM */
    async leaveRoom() {
        if (!this.roomId || !this.user) return false;

        try {
            this.removeListeners();

            const playerRef = this.database.ref(
                "rooms/" + this.roomId +
                "/players/" + this.user.uid
            );

            await playerRef.remove();

            if (this.isHost) {
                await this.database.ref(
                    "rooms/" + this.roomId
                ).update({
                    status: "closed"
                });
            }

            this.roomId = null;
            this.roomCode = null;
            this.isHost = false;
            this.connected = false;
            this.playerColor = null;
            this.opponent = null;

            return true;

        } catch (error) {
            return this.reportError(error.message);
        }
    }

    /* REMOVE LISTENERS */
    removeListeners() {
        this.listeners.forEach(item => {
            item.reference.off(
                item.event,
                item.callback
            );
        });

        this.listeners = [];
    }

    /* CONNECTION STATE */
    async checkConnection() {
        if (!this.database) return false;

        try {
            const snapshot = await this.database.ref(".info/connected")
                .once("value");

            this.connected = snapshot.val() === true;

            return this.connected;

        } catch (error) {
            return false;
        }
    }

    /* ERROR HANDLER */
    reportError(message) {
        console.error("APPARA ONLINE:", message);

        if (typeof this.onError === "function") {
            this.onError(message);
        }

        return {
            success: false,
            error: message
        };
    }

    /* DISCONNECT */
    async disconnect() {
        await this.leaveRoom();

        this.removeListeners();

        if (this.auth && this.user) {
            try {
                await this.auth.signOut();
            } catch (error) {
                console.error("Sign out error:", error);
            }
        }

        this.user = null;
        this.connected = false;
    }

}

/* GLOBAL ONLINE SERVICE */
window.apparaOnline = new ApparaChessOnline();

/* PART 12 END */
