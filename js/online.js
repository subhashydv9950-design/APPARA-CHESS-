/* =========================================================
   APPARA CHESS — ONLINE MULTIPLAYER
   FILE: js/online.js
   PART 1/3 — CORE, FIREBASE & ROOM CREATION
   ========================================================= */

window.APPARA_ONLINE = (function () {
    "use strict";

    const state = {
        initialized: false,
        connected: false,
        authenticated: false,

        currentRoom: null,
        currentRoomCode: null,
        currentPlayerColor: null,
        currentUser: null,

        roomReference: null,
        roomListener: null,
        roomUpdateHandler: null,

        auth: null,
        database: null,

        submittingMove: false,
        leavingRoom: false,
        multiplayerConnected: false,

        lastError: null
    };

    /* DOM HELPERS */

    function getElement(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const element = getElement(id);

        if (element) {
            element.textContent = String(value ?? "");
        }
    }

    function notify(message, type = "info") {
        if (
            window.APPARA_APP &&
            typeof window.APPARA_APP.notify === "function"
        ) {
            window.APPARA_APP.notify(message, type);
        } else {
            console.log("[APPARA ONLINE]", message);
        }
    }

    /* FIREBASE */

    function getFirebaseModule() {
        return window.APPARA_FIREBASE || null;
    }

    function isFirebaseReady() {
        const module = getFirebaseModule();

        if (!module) return false;

        if (
            typeof module.isAvailable === "function" &&
            !module.isAvailable()
        ) {
            return false;
        }

        if (
            typeof module.isConfigured === "function" &&
            !module.isConfigured()
        ) {
            return false;
        }

        return true;
    }

    function init() {
        if (state.initialized) return true;

        const module = getFirebaseModule();

        if (!module || !isFirebaseReady()) {
            setStatus(false, "Firebase setup required");
            return false;
        }

        try {
            if (typeof module.initialize === "function") {
                module.initialize();
            }

            state.auth =
                typeof module.getAuth === "function"
                    ? module.getAuth()
                    : null;

            state.database =
                typeof module.getDatabase === "function"
                    ? module.getDatabase()
                    : null;

            if (!state.auth || !state.database) {
                setStatus(false, "Firebase services unavailable");
                return false;
            }

            state.initialized = true;

            monitorConnection();
            setStatus(false, "Connecting to Firebase");

            return true;

        } catch (error) {
            reportError(error, "Firebase initialization failed");
            return false;
        }
    }

    function setStatus(connected, message) {
        state.connected = Boolean(connected);

        const indicator = getElement("connection-indicator");
        const status = getElement("online-connection-status");

        if (indicator) {
            indicator.classList.toggle("connected", state.connected);
            indicator.classList.toggle("disconnected", !state.connected);
        }

        if (status) {
            status.textContent =
                message ||
                (state.connected ? "Connected" : "Disconnected");
        }
    }

    function monitorConnection() {
        if (!state.database) return;

        try {
            state.database
                .ref(".info/connected")
                .on("value", function (snapshot) {
                    const connected = snapshot.val() === true;

                    setStatus(
                        connected,
                        connected
                            ? "Connected to Firebase"
                            : "Connection unavailable"
                    );
                });

        } catch (error) {
            reportError(error, "Connection monitoring failed");
        }
    }

    function reportError(error, message = "Online service error") {
        state.lastError = error || null;

        console.error("[APPARA ONLINE]", message, error || "");

        setStatus(false, message);
        notify(message, "error");
    }

    /* AUTHENTICATION */

    async function ensureAuthenticated() {
        if (!init()) {
            throw new Error("Firebase is not configured.");
        }

        if (state.auth.currentUser) {
            state.currentUser = state.auth.currentUser;
            state.authenticated = true;
            return state.currentUser;
        }

        return new Promise(function (resolve, reject) {
            let unsubscribe = null;

            unsubscribe = state.auth.onAuthStateChanged(
                function (user) {
                    if (unsubscribe) unsubscribe();

                    if (user) {
                        state.currentUser = user;
                        state.authenticated = true;
                        resolve(user);
                        return;
                    }

                    state.auth.signInAnonymously()
                        .then(function (credential) {
                            state.currentUser = credential.user;
                            state.authenticated = true;
                            resolve(credential.user);
                        })
                        .catch(function (error) {
                            reportError(error, "Anonymous sign-in failed");
                            reject(error);
                        });
                },
                function (error) {
                    if (unsubscribe) unsubscribe();

                    reportError(error, "Authentication failed");
                    reject(error);
                }
            );
        });
    }

    /* PLAYER INFORMATION */

    function getPlayerName() {
        const profile = window.APPARA_PROFILE;

        if (
            profile &&
            typeof profile.getProfile === "function"
        ) {
            const data = profile.getProfile();

            if (data && data.name) {
                return String(data.name).trim().slice(0, 24);
            }
        }

        const input = getElement("online-player-name");

        if (input && input.value.trim()) {
            return input.value.trim().slice(0, 24);
        }

        return "Guest Player";
    }

    function createPlayerData(color) {
        return {
            uid: state.currentUser
                ? state.currentUser.uid
                : null,

            name: getPlayerName(),
            color: color,
            online: true,
            joinedAt: Date.now()
        };
    }

    /* ROOM CODE */

    function generateRoomCode() {
        const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let code = "";

        for (let i = 0; i < 6; i++) {
            code += characters[
                Math.floor(Math.random() * characters.length)
            ];
        }

        return code;
    }

    function getRoomReference(roomCode) {
        if (!state.database || !roomCode) return null;

        return state.database
            .ref("rooms")
            .child(String(roomCode).toUpperCase());
    }

    /* CREATE ROOM */

    async function createRoom() {
        if (state.currentRoomCode) {
            notify("You are already in a room.", "warning");
            return false;
        }

        try {
            await ensureAuthenticated();

            let roomCode = null;
            let roomRef = null;
            let transaction = null;

            for (let attempt = 0; attempt < 5; attempt++) {
                roomCode = generateRoomCode();
                roomRef = getRoomReference(roomCode);

                const roomData = {
                    code: roomCode,
                    status: "waiting",

                    createdAt: Date.now(),
                    updatedAt: Date.now(),

                    hostUid: state.currentUser.uid,

                    players: {
                        white: createPlayerData("w"),
                        black: null
                    },

                    fen: null,
                    moves: {},
                    turn: "w",

                    result: null,
                    reason: null
                };

                transaction = await roomRef.transaction(
                    function (currentData) {
                        if (currentData !== null) return;
                        return roomData;
                    },
                    undefined,
                    false
                );

                if (transaction.committed) break;
            }

            if (!transaction || !transaction.committed) {
                throw new Error("Could not create a unique room.");
            }

            state.currentRoom = transaction.snapshot.val();
            state.currentRoomCode = roomCode;
            state.currentPlayerColor = "w";
            state.roomReference = roomRef;
            state.multiplayerConnected = false;

            showCreatedRoom(roomCode);
            listenToRoom(roomCode);

            notify(
                "Room created. Share the code with your friend.",
                "success"
            );

            return {
                success: true,
                roomCode: roomCode,
                code: roomCode
            };

        } catch (error) {
            reportError(error, "Could not create room");
            return false;
        }
    }

    function showCreatedRoom(roomCode) {
        const container = getElement("created-room-container");
        const codeElement = getElement("created-room-code");

        if (codeElement) {
            codeElement.textContent = roomCode;
        }

        if (container) {
            container.classList.remove("hidden");
            container.style.display = "";
        }
    }

    /* =========================================================
       PART 1/3 END
       PART 2/3 इसी फाइल में इसके नीचे जोड़ना है।
       अभी Commit मत करना।
       ========================================================= */

           /* =========================================================
   APPARA CHESS — ONLINE SYSTEM
   PART 2/3 START
========================================================= */

/* Copy room code */
async function copyRoomCode() {
    const code = state.currentRoomCode;

    if (!code) {
        notify("अभी कोई Room Code उपलब्ध नहीं है।", "warning");
        return false;
    }

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(code);
        } else {
            const field = document.createElement("textarea");
            field.value = code;
            field.style.position = "fixed";
            field.style.opacity = "0";
            document.body.appendChild(field);
            field.select();

            const copied = document.execCommand("copy");
            field.remove();

            if (!copied) {
                throw new Error("Copy नहीं हो पाया।");
            }
        }

        notify("Room Code कॉपी हो गया: " + code, "success");
        return true;
    } catch (error) {
        reportError("Room Code कॉपी नहीं हुआ", error);
        return false;
    }
}


/* Join an existing room */
async function joinRoom(roomCode, playerName) {
    if (!isFirebaseReady()) {
        notify("Online खेलने के लिए Firebase सेटअप जरूरी है।", "error");
        return { success: false, error: "Firebase unavailable" };
    }

    const code = String(roomCode || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
        notify("कृपया सही 6 अक्षरों वाला Room Code डालें।", "warning");
        return { success: false, error: "Invalid room code" };
    }

    try {
        await ensureAuthenticated();

        const roomRef = getRoomReference(code);
        const snapshot = await roomRef.once("value");

        if (!snapshot.exists()) {
            notify("यह Room नहीं मिला। Room Code जाँचें।", "error");
            return { success: false, error: "Room not found" };
        }

        const room = snapshot.val();

        if (!room || room.status !== "waiting") {
            notify("यह Room अब Join करने के लिए उपलब्ध नहीं है।", "warning");
            return { success: false, error: "Room unavailable" };
        }

        if (
            room.players &&
            room.players.white &&
            room.players.white.uid === state.auth.currentUser.uid
        ) {
            state.currentRoom = room;
            state.currentRoomCode = code;
            state.currentPlayerColor = "white";
            state.roomReference = roomRef;

            listenToRoom(code);

            return {
                success: true,
                roomCode: code,
                color: "white",
                room: room
            };
        }

        if (room.players && room.players.black) {
            notify("इस Room में दोनों खिलाड़ी पहले से मौजूद हैं।", "warning");
            return { success: false, error: "Room is full" };
        }

        const blackPlayer = createPlayerData(playerName);

        const transaction = await roomRef.transaction(function (currentRoom) {
            if (!currentRoom || currentRoom.status !== "waiting") {
                return;
            }

            if (
                currentRoom.players &&
                currentRoom.players.black
            ) {
                return;
            }

            currentRoom.players = currentRoom.players || {};
            currentRoom.players.black = blackPlayer;
            currentRoom.status = "playing";
            currentRoom.updatedAt = Date.now();

            if (!currentRoom.fen) {
                currentRoom.fen =
                    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            }

            return currentRoom;
        });

        if (!transaction.committed) {
            notify("Room Join नहीं हो पाया। शायद कोई दूसरा खिलाड़ी Join कर चुका है।", "error");
            return { success: false, error: "Join transaction failed" };
        }

        state.currentRoom = transaction.snapshot.val();
        state.currentRoomCode = code;
        state.currentPlayerColor = "black";
        state.roomReference = roomRef;

        setStatus("Connected — Black Player");

        listenToRoom(code);
        connectMultiplayer();

        notify("आप Room में Join हो गए हैं!", "success");

        return {
            success: true,
            roomCode: code,
            color: "black",
            room: state.currentRoom
        };

    } catch (error) {
        reportError("Room Join करने में समस्या हुई", error);

        return {
            success: false,
            error: error.message || "Join failed"
        };
    }
}


/* Connect multiplayer controller */
function connectMultiplayer() {
    if (state.multiplayerConnected) {
        return true;
    }

    if (!state.currentRoomCode || !state.currentPlayerColor) {
        return false;
    }

    if (!window.APPARA_MULTIPLAYER) {
        return false;
    }

    try {
        const multiplayer = window.APPARA_MULTIPLAYER;

        if (typeof multiplayer.connectOnlineRoom === "function") {
            multiplayer.connectOnlineRoom(
                state.currentRoom,
                state.currentRoomCode,
                state.currentPlayerColor
            );
        } else if (typeof multiplayer.startOnline === "function") {
            multiplayer.startOnline({
                room: state.currentRoom,
                roomCode: state.currentRoomCode,
                playerColor: state.currentPlayerColor
            });
        } else {
            return false;
        }

        state.multiplayerConnected = true;
        return true;

    } catch (error) {
        reportError("Multiplayer कनेक्शन शुरू नहीं हो पाया", error);
        return false;
    }
}


/* Register room update callback */
function setRoomUpdateHandler(callback) {
    state.roomUpdateHandler =
        typeof callback === "function" ? callback : null;
}


/* Listen for live room changes */
function listenToRoom(roomCode) {
    stopRoomListener();

    if (!state.database || !roomCode) {
        return false;
    }

    try {
        const roomRef = getRoomReference(roomCode);

        state.roomReference = roomRef;

        state.roomListener = roomRef.on(
            "value",
            function (snapshot) {
                if (!snapshot.exists()) {
                    notify("यह Online Room अब उपलब्ध नहीं है।", "warning");
                    stopRoomListener();
                    return;
                }

                const room = snapshot.val();

                state.currentRoom = room;
                state.currentRoomCode = roomCode;

                updateRoomDisplay(room);

                if (
                    room.status === "playing" &&
                    room.players &&
                    room.players.white &&
                    room.players.black
                ) {
                    connectMultiplayer();
                }

                if (
                    room.status === "finished" ||
                    room.status === "cancelled"
                ) {
                    setStatus("Game Finished");
                }

                if (state.roomUpdateHandler) {
                    try {
                        state.roomUpdateHandler(room);
                    } catch (callbackError) {
                        reportError(
                            "Room update callback में समस्या",
                            callbackError
                        );
                    }
                }
            },
            function (error) {
                reportError("Room अपडेट प्राप्त नहीं हो पाया", error);
            }
        );

        return true;

    } catch (error) {
        reportError("Room Listener शुरू नहीं हो पाया", error);
        return false;
    }
}


/* Update visible room information */
function updateRoomDisplay(room) {
    if (!room) return;

    const whiteName =
        room.players &&
        room.players.white &&
        room.players.white.name
            ? room.players.white.name
            : "Waiting for player...";

    const blackName =
        room.players &&
        room.players.black &&
        room.players.black.name
            ? room.players.black.name
            : "Waiting for player...";

    const whiteElement = getElement("online-white-player");
    const blackElement = getElement("online-black-player");

    if (whiteElement) {
        if ("value" in whiteElement && whiteElement.tagName === "INPUT") {
            whiteElement.value = whiteName;
        } else {
            whiteElement.textContent = whiteName;
        }
    }

    if (blackElement) {
        if ("value" in blackElement && blackElement.tagName === "INPUT") {
            blackElement.value = blackName;
        } else {
            blackElement.textContent = blackName;
        }
    }

    const codeElement = getElement("online-room-code");

    if (codeElement) {
        codeElement.textContent = state.currentRoomCode || "";
    }

    if (room.status === "waiting") {
        setStatus("Waiting for opponent...");
    } else if (room.status === "playing") {
        setStatus("Online Game Connected");
    } else if (room.status === "finished") {
        setStatus("Game Finished");
    }
}


/* Stop listening for room changes */
function stopRoomListener() {
    if (state.roomReference && state.roomListener) {
        try {
            state.roomReference.off("value", state.roomListener);
        } catch (error) {
            reportError("Room Listener बंद नहीं हो पाया", error);
        }
    }

    state.roomListener = null;
    return true;
}


/* Send a chess move to Firebase */
async function sendMove(move) {
    if (!state.roomReference || !state.currentRoomCode) {
        return {
            success: false,
            error: "No active room"
        };
    }

    if (state.submittingMove) {
        return {
            success: false,
            error: "Move already submitting"
        };
    }

    if (!move || !move.from || !move.to) {
        return {
            success: false,
            error: "Invalid move"
        };
    }

    if (typeof window.Chess !== "function") {
        notify("Online Move Validation के लिए Chess Engine उपलब्ध नहीं है।", "error");

        return {
            success: false,
            error: "Chess validation library unavailable"
        };
    }

    state.submittingMove = true;

    try {
        const roomSnapshot = await state.roomReference.once("value");

        if (!roomSnapshot.exists()) {
            throw new Error("Room अब मौजूद नहीं है।");
        }

        const room = roomSnapshot.val();

        if (room.status !== "playing") {
            throw new Error("यह Game अभी चाल चलने के लिए तैयार नहीं है।");
        }

        const expectedColor = state.currentPlayerColor;

        if (room.turn && room.turn !== expectedColor) {
            throw new Error("अभी आपकी बारी नहीं है।");
        }

        const currentFen =
            room.fen ||
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

        const validator = new window.Chess(currentFen);

        const moveResult = validator.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion || "q"
        });

        if (!moveResult) {
            throw new Error("यह Chess Move मान्य नहीं है।");
        }

        const nextFen = validator.fen();
        const nextTurn =
            validator.turn() === "w" ? "white" : "black";

        const moveData = {
            from: move.from,
            to: move.to,
            promotion: move.promotion || null,
            san: moveResult.san,
            color: expectedColor,
            timestamp: Date.now(),
            fen: nextFen
        };

        const transaction = await state.roomReference.transaction(
            function (currentRoom) {
                if (!currentRoom || currentRoom.status !== "playing") {
                    return;
                }

                const roomTurn = currentRoom.turn || "white";

                if (roomTurn !== expectedColor) {
                    return;
                }

                const latestFen =
                    currentRoom.fen ||
                    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

                if (latestFen !== currentFen) {
                    return;
                }

                currentRoom.moves = currentRoom.moves || [];
                currentRoom.moves.push(moveData);

                currentRoom.fen = nextFen;
                currentRoom.turn = nextTurn;
                currentRoom.updatedAt = Date.now();

                if (validator.isCheckmate()) {
                    currentRoom.status = "finished";
                    currentRoom.result =
                        expectedColor === "white" ? "white" : "black";
                    currentRoom.reason = "checkmate";
                } else if (
                    validator.isDraw() ||
                    validator.isStalemate() ||
                    validator.isThreefoldRepetition() ||
                    validator.isInsufficientMaterial()
                ) {
                    currentRoom.status = "finished";
                    currentRoom.result = "draw";
                    currentRoom.reason = "draw";
                }

                return currentRoom;
            }
        );

        if (!transaction.committed) {
            throw new Error(
                "Move सेव नहीं हुआ। Room की स्थिति बदल चुकी हो सकती है।"
            );
        }

        state.currentRoom = transaction.snapshot.val();

        return {
            success: true,
            move: moveData,
            room: state.currentRoom
        };

    } catch (error) {
        reportError("Move भेजने में समस्या हुई", error);

        return {
            success: false,
            error: error.message || "Move failed"
        };

    } finally {
        state.submittingMove = false;
    }
}


/* =========================================================
   APPARA CHESS — ONLINE SYSTEM
   PART 2/3 END
========================================================= */

        /* =========================================================
   APPARA CHESS — ONLINE SYSTEM
   PART 3/3 START
========================================================= */

/* Update player's online status */
async function setPlayerOnline(isOnline) {
    if (!state.roomReference || !state.currentPlayerColor) {
        return false;
    }

    try {
        const playerPath = "players/" + state.currentPlayerColor;

        const updates = {};
        updates[playerPath + "/online"] = Boolean(isOnline);
        updates.updatedAt = Date.now();

        await state.roomReference.update(updates);

        return true;
    } catch (error) {
        reportError("Player status अपडेट नहीं हुआ", error);
        return false;
    }
}


/* Resign current game */
async function resign() {
    if (!state.roomReference || !state.currentPlayerColor) {
        return false;
    }

    try {
        const resigningColor = state.currentPlayerColor;

        const transaction = await state.roomReference.transaction(
            function (room) {
                if (!room || room.status !== "playing") {
                    return;
                }

                room.status = "finished";
                room.result =
                    resigningColor === "white" ? "black" : "white";
                room.reason = "resignation";
                room.updatedAt = Date.now();

                return room;
            }
        );

        if (!transaction.committed) {
            notify("Resign Request पूरी नहीं हुई।", "warning");
            return false;
        }

        state.currentRoom = transaction.snapshot.val();
        notify("आपने Game Resign कर दिया।", "info");

        return true;

    } catch (error) {
        reportError("Resign करने में समस्या हुई", error);
        return false;
    }
}


/* Offer a draw */
async function offerDraw() {
    if (!state.roomReference || !state.currentPlayerColor) {
        return false;
    }

    try {
        const color = state.currentPlayerColor;

        const transaction = await state.roomReference.transaction(
            function (room) {
                if (!room || room.status !== "playing") {
                    return;
                }

                room.drawOffer = {
                    by: color,
                    status: "pending",
                    timestamp: Date.now()
                };

                room.updatedAt = Date.now();

                return room;
            }
        );

        if (!transaction.committed) {
            return false;
        }

        state.currentRoom = transaction.snapshot.val();
        notify("Draw Offer भेज दिया गया है।", "success");

        return true;

    } catch (error) {
        reportError("Draw Offer भेजने में समस्या हुई", error);
        return false;
    }
}


/* Accept or decline a draw offer */
async function respondToDraw(accept) {
    if (!state.roomReference || !state.currentPlayerColor) {
        return false;
    }

    try {
        const color = state.currentPlayerColor;

        const transaction = await state.roomReference.transaction(
            function (room) {
                if (!room || room.status !== "playing") {
                    return;
                }

                if (
                    !room.drawOffer ||
                    room.drawOffer.status !== "pending" ||
                    room.drawOffer.by === color
                ) {
                    return;
                }

                room.drawOffer.status = accept ? "accepted" : "declined";
                room.drawOffer.respondedBy = color;
                room.drawOffer.respondedAt = Date.now();

                if (accept) {
                    room.status = "finished";
                    room.result = "draw";
                    room.reason = "agreement";
                }

                room.updatedAt = Date.now();

                return room;
            }
        );

        if (!transaction.committed) {
            notify("कोई Pending Draw Offer उपलब्ध नहीं है।", "warning");
            return false;
        }

        state.currentRoom = transaction.snapshot.val();

        notify(
            accept ? "Draw स्वीकार कर लिया गया।" : "Draw Offer अस्वीकार कर दिया गया।",
            "info"
        );

        return true;

    } catch (error) {
        reportError("Draw Response भेजने में समस्या हुई", error);
        return false;
    }
}


/* Leave current room */
async function leaveRoom() {
    if (state.leavingRoom) {
        return false;
    }

    state.leavingRoom = true;

    try {
        stopRoomListener();

        if (state.roomReference && state.currentPlayerColor) {
            const color = state.currentPlayerColor;

            await state.roomReference.transaction(function (room) {
                if (!room) return;

                if (
                    room.players &&
                    room.players[color]
                ) {
                    room.players[color].online = false;
                    room.players[color].leftAt = Date.now();
                }

                room.updatedAt = Date.now();

                if (room.status === "waiting" && color === "white") {
                    room.status = "cancelled";
                    room.reason = "host_left";
                }

                return room;
            });
        }

        state.currentRoom = null;
        state.currentRoomCode = null;
        state.currentPlayerColor = null;
        state.roomReference = null;
        state.multiplayerConnected = false;
        state.submittingMove = false;

        setStatus("Disconnected");

        return true;

    } catch (error) {
        reportError("Room छोड़ने में समस्या हुई", error);
        return false;

    } finally {
        state.leavingRoom = false;
    }
}


/* Get current room */
function getRoom() {
    return state.currentRoom;
}


/* Get current room code */
function getRoomCode() {
    return state.currentRoomCode;
}


/* Get current player's color */
function getPlayerColor() {
    return state.currentPlayerColor;
}


/* Get connection state */
function isConnected() {
    return Boolean(state.connected);
}


/* Get current user */
function getCurrentUser() {
    return state.currentUser ||
        (state.auth && state.auth.currentUser) ||
        null;
}


/* Clean up online system */
function destroy() {
    stopRoomListener();

    if (state.database) {
        try {
            const connectionRef = state.database.ref(".info/connected");

            if (state.connectionListener) {
                connectionRef.off(
                    "value",
                    state.connectionListener
                );
            }
        } catch (error) {
            reportError("Connection Listener बंद नहीं हुआ", error);
        }
    }

    state.initialized = false;
    state.connected = false;
    state.authenticated = false;
    state.currentRoom = null;
    state.currentRoomCode = null;
    state.currentPlayerColor = null;
    state.roomReference = null;
    state.roomListener = null;
    state.roomUpdateHandler = null;
    state.multiplayerConnected = false;
    state.submittingMove = false;

    return true;
}


/* Public API */
return {
    init: init,
    createRoom: createRoom,
    joinRoom: joinRoom,
    copyRoomCode: copyRoomCode,

    listenToRoom: listenToRoom,
    stopRoomListener: stopRoomListener,
    setRoomUpdateHandler: setRoomUpdateHandler,

    sendMove: sendMove,
    setPlayerOnline: setPlayerOnline,

    resign: resign,
    offerDraw: offerDraw,
    respondToDraw: respondToDraw,
    leaveRoom: leaveRoom,

    getRoom: getRoom,
    getRoomCode: getRoomCode,
    getPlayerColor: getPlayerColor,
    getCurrentUser: getCurrentUser,

    isConnected: isConnected,
    connectMultiplayer: connectMultiplayer,

    destroy: destroy
};

})();

/* =========================================================
   APPARA CHESS — ONLINE SYSTEM
   PART 3/3 END
========================================================= */                
