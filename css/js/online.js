/* =========================================
   APPARA CHESS — ONLINE MULTIPLAYER
   PART 21 START
========================================= */

class ApparaChessOnline {
    constructor() {
        this.app = null;
        this.auth = null;
        this.database = null;
        this.user = null;

        this.roomRef = null;
        this.roomCode = null;
        this.roomData = null;

        this.roomListener = null;
        this.connectionListener = null;

        this.connected = false;
        this.isHost = false;
        this.playerColor = null;

        this.onRoomUpdate = null;
        this.onConnectionChange = null;
        this.onOpponentMove = null;
        this.onError = null;

        this.initialized = false;
        this.busy = false;
    }

    async initialize() {
        if (this.initialized) return true;

        try {
            if (window.apparaFirebaseReady) {
                const ready = await window.apparaFirebaseReady;
                if (!ready) throw new Error("Firebase configuration is incomplete.");
            }

            if (!window.firebase) {
                throw new Error("Firebase SDK is not loaded.");
            }

            if (!window.APPARA_FIREBASE_CONFIG ||
                window.APPARA_FIREBASE_CONFIG.apiKey === "YOUR_FIREBASE_API_KEY") {
                throw new Error("Firebase configuration is missing.");
            }

            this.app = firebase.apps.length
                ? firebase.app()
                : firebase.initializeApp(window.APPARA_FIREBASE_CONFIG);

            this.auth = firebase.auth();
            this.database = firebase.database();

            await this.signIn();

            this.watchConnection();
            this.initialized = true;

            return true;

        } catch (error) {
            this.reportError(error);
            return false;
        }
    }

    async signIn() {
        if (!this.auth) throw new Error("Firebase Auth is unavailable.");

        if (this.auth.currentUser) {
            this.user = this.auth.currentUser;
            return this.user;
        }

        const result = await this.auth.signInAnonymously();
        this.user = result.user;

        return this.user;
    }

    watchConnection() {
        if (!this.database) return;

        const connectedRef = this.database.ref(".info/connected");

        this.connectionListener = connectedRef.on("value", snapshot => {
            this.connected = snapshot.val() === true;

            if (typeof this.onConnectionChange === "function") {
                this.onConnectionChange(this.connected);
            }
        });
    }

    generateRoomCode() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";

        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }

        return code;
    }

    async createRoom(playerName = "White Player") {
        if (!await this.initialize()) {
            throw new Error("Online service could not initialize.");
        }

        if (this.busy) throw new Error("Please wait.");
        this.busy = true;

        try {
            let code = "";
            let created = false;
            let ref = null;

            for (let attempt = 0; attempt < 5; attempt++) {
                code = this.generateRoomCode();
                ref = this.database.ref("rooms/" + code);

                const result = await ref.transaction(current => {
                    if (current === null) {
                        return {
                            code,
                            status: "waiting",
                            hostId: this.user.uid,
                            guestId: null,
                            hostName: playerName,
                            guestName: null,
                            hostColor: "w",
                            fen: this.getStartingFen(),
                            turn: "w",
                            moves: [],
                            lastMove: null,
                            createdAt: firebase.database.ServerValue.TIMESTAMP,
                            updatedAt: firebase.database.ServerValue.TIMESTAMP
                        };
                    }

                    return;
                });

                if (result.committed) {
                    created = true;
                    break;
                }
            }

            if (!created) {
                throw new Error("Could not create a unique room. Try again.");
            }

            this.roomCode = code;
            this.roomRef = ref;
            this.isHost = true;
            this.playerColor = "w";
            this.roomData = (await ref.once("value")).val();

            this.listenToRoom();

            return {
                success: true,
                code,
                roomCode: code,
                color: "w",
                room: this.roomData
            };

        } finally {
            this.busy = false;
        }
    }

    async joinRoom(code, playerName = "Black Player") {
        if (!await this.initialize()) {
            throw new Error("Online service could not initialize.");
        }

        if (this.busy) throw new Error("Please wait.");
        this.busy = true;

        try {
            code = String(code || "").trim().toUpperCase();

            if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
                throw new Error("Enter a valid 6-character room code.");
            }

            const ref = this.database.ref("rooms/" + code);
            let joinError = null;

            const result = await ref.transaction(room => {
                if (!room) {
                    joinError = "Room not found.";
                    return;
                }

                if (room.hostId === this.user.uid) {
                    joinError = "You cannot join your own room.";
                    return;
                }

                if (room.guestId && room.guestId !== this.user.uid) {
                    joinError = "This room is already full.";
                    return;
                }

                if (room.status !== "waiting" &&
                    room.guestId !== this.user.uid) {
                    joinError = "This match has already started.";
                    return;
                }

                room.guestId = this.user.uid;
                room.guestName = playerName;
                room.status = "playing";
                room.updatedAt = firebase.database.ServerValue.TIMESTAMP;

                return room;
            });

            if (!result.committed) {
                throw new Error(joinError || "Could not join this room.");
            }

            this.roomCode = code;
            this.roomRef = ref;
            this.isHost = false;
            this.playerColor = "b";
            this.roomData = result.snapshot.val();

            this.listenToRoom();

            return {
                success: true,
                code,
                roomCode: code,
                color: "b",
                room: this.roomData
            };

        } finally {
            this.busy = false;
        }
    }

    getStartingFen() {
        if (window.apparaChess &&
            typeof window.apparaChess.getFEN === "function") {
            return window.apparaChess.getFEN();
        }

        return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }

    listenToRoom() {
        if (!this.roomRef) return;

        this.stopRoomListener();

        this.roomListener = this.roomRef.on("value", snapshot => {
            if (!snapshot.exists()) {
                this.reportError(new Error("Room no longer exists."));
                return;
            }

            const previous = this.roomData;
            const current = snapshot.val();

            this.roomData = current;

            if (typeof this.onRoomUpdate === "function") {
                this.onRoomUpdate(current, previous);
            }

            if (previous && current.moves) {
                const oldCount = (previous.moves || []).length;
                const newCount = current.moves.length;

                if (newCount > oldCount &&
                    current.moves[newCount - 1].playerId !== this.user.uid) {
                    if (typeof this.onOpponentMove === "function") {
                        this.onOpponentMove(current.moves[newCount - 1], current);
                    }
                }
            }
        }, error => this.reportError(error));
    }

    async sendMove(move, fen) {
        if (!this.roomRef || !this.roomData) {
            throw new Error("You are not in an online room.");
        }

        const current = this.roomData;

        if (current.status !== "playing") {
            throw new Error("The match is not active.");
        }

        const expectedId = current.turn === "w"
            ? current.hostId
            : current.guestId;

        if (expectedId !== this.user.uid) {
            throw new Error("It is not your turn.");
        }

        const moveData = {
            from: move.from,
            to: move.to,
            promotion: move.promotion || "q",
            san: move.san || "",
            color: current.turn,
            playerId: this.user.uid,
            timestamp: Date.now()
        };

        let moveError = null;

        const result = await this.roomRef.transaction(room => {
            if (!room || room.status !== "playing") {
                moveError = "Match is no longer active.";
                return;
            }

            const playerId = room.turn === "w"
                ? room.hostId
                : room.guestId;

            if (playerId !== this.user.uid) {
                moveError = "It is not your turn.";
                return;
            }

            room.moves = room.moves || [];
            room.moves.push(moveData);

            room.lastMove = moveData;
            room.fen = fen;
            room.turn = room.turn === "w" ? "b" : "w";
            room.updatedAt = firebase.database.ServerValue.TIMESTAMP;

            return room;
        });

        if (!result.committed) {
            throw new Error(moveError || "Move could not be sent.");
        }

        this.roomData = result.snapshot.val();
        return true;
    }

    async finishRoom(resultText = "finished") {
        if (!this.roomRef) return false;

        await this.roomRef.update({
            status: "finished",
            result: resultText,
            finishedAt: firebase.database.ServerValue.TIMESTAMP
        });

        return true;
    }

    async sendDrawOffer() {
        if (!this.roomRef) return false;

        const offer = {
            from: this.user.uid,
            timestamp: Date.now()
        };

        await this.roomRef.child("drawOffer").set(offer);
        return true;
    }

    async respondDrawOffer(accepted) {
        if (!this.roomRef) return false;

        if (accepted) {
            await this.finishRoom("draw");
        } else {
            await this.roomRef.child("drawOffer").remove();
        }

        return true;
    }

    async resign() {
        if (!this.roomRef) return false;

        const winner = this.playerColor === "w" ? "black" : "white";
        await this.finishRoom(winner + "_wins_by_resignation");

        return true;
    }

    stopRoomListener() {
        if (this.roomRef && this.roomListener) {
            this.roomRef.off("value", this.roomListener);
        }

        this.roomListener = null;
    }

    async leaveRoom() {
        this.stopRoomListener();

        if (this.roomRef && this.isHost) {
            try {
                await this.roomRef.update({
                    status: "closed",
                    closedAt: firebase.database.ServerValue.TIMESTAMP
                });
            } catch (error) {
                this.reportError(error);
            }
        }

        this.roomRef = null;
        this.roomCode = null;
        this.roomData = null;
        this.isHost = false;
        this.playerColor = null;

        return true;
    }

    getRoomCode() {
        return this.roomCode;
    }

    getPlayerColor() {
        return this.playerColor;
    }

    getOpponentName() {
        if (!this.roomData) return "Opponent";

        return this.isHost
            ? (this.roomData.guestName || "Waiting for opponent...")
            : (this.roomData.hostName || "Opponent");
    }

    reportError(error) {
        console.error("[APPARA ONLINE]", error);

        if (typeof this.onError === "function") {
            this.onError(error);
        }
    }

    destroy() {
        this.stopRoomListener();

        if (this.database && this.connectionListener) {
            this.database.ref(".info/connected")
                .off("value", this.connectionListener);
        }

        this.connectionListener = null;
        this.connected = false;
    }
}

window.apparaOnline = new ApparaChessOnline();

/* =========================================
   PART 21 END
========================================= */
