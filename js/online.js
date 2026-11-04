/* =========================================================
   APPARA CHESS — ONLINE MULTIPLAYER SYSTEM
   FILE: js/online.js
   COMPLETE REBUILD — PART 1/3
========================================================= */

window.APPARA_ONLINE = (function () {
    "use strict";

    const INITIAL_FEN =
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

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
        connectionReference: null,
        connectionListener: null,

        roomUpdateHandler: null,

        auth: null,
        database: null,

        submittingMove: false,
        leavingRoom: false,
        multiplayerConnected: false,

        lastError: null
    };


    /* =====================================================
       01. COMMON HELPERS
    ===================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }

    function notify(message, type) {
        const app = window.APPARA_APP;

        if (app && typeof app.notify === "function") {
            app.notify(message, type || "info");
        } else {
            console.log("[APPARA ONLINE]", message);
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

    function reportError(error, message) {
        state.lastError = error || null;

        console.error(
            "[APPARA ONLINE]",
            message || "Online service error",
            error || ""
        );

        notify(
            message || "Online service error",
            "error"
        );
    }

    function normalizeColor(color) {
        const value = String(color || "").toLowerCase();

        if (value === "w" || value === "white") {
            return "white";
        }

        if (value === "b" || value === "black") {
            return "black";
        }

        return null;
    }

    function colorToTurn(color) {
        return normalizeColor(color) === "white" ? "w" : "b";
    }

    function getOpponentColor(color) {
        return normalizeColor(color) === "white"
            ? "black"
            : "white";
    }

    function getPlayerName() {
        const profile = window.APPARA_PROFILE;

        if (profile && typeof profile.getProfile === "function") {
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

    function createPlayerData(color, suppliedName) {
        return {
            uid: state.currentUser ? state.currentUser.uid : null,
            name: String(suppliedName || getPlayerName())
                .trim()
                .slice(0, 24) || "Guest Player",
            color: normalizeColor(color),
            online: true,
            joinedAt: Date.now()
        };
    }


    /* =====================================================
       02. FIREBASE CONNECTION
    ===================================================== */

    function getFirebaseModule() {
        return window.APPARA_FIREBASE || null;
    }

    function isFirebaseReady() {
        const firebaseModule = getFirebaseModule();

        if (!firebaseModule) return false;

        if (
            typeof firebaseModule.isConfigured === "function" &&
            !firebaseModule.isConfigured()
        ) {
            return false;
        }

        if (
            typeof firebaseModule.initialize === "function" &&
            !firebaseModule.initialize()
        ) {
            return false;
        }

        if (
            typeof firebaseModule.isAvailable === "function" &&
            !firebaseModule.isAvailable()
        ) {
            return false;
        }

        return Boolean(
            firebaseModule.getAuth &&
            firebaseModule.getDatabase
        );
    }

    function init() {
        if (state.initialized) {
            return Boolean(state.auth && state.database);
        }

        const firebaseModule = getFirebaseModule();

        if (!firebaseModule || !isFirebaseReady()) {
            setStatus(false, "Firebase setup required");
            return false;
        }

        try {
            state.auth = firebaseModule.getAuth();
            state.database = firebaseModule.getDatabase();

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

    function monitorConnection() {
        if (!state.database) return false;

        try {
            state.connectionReference =
                state.database.ref(".info/connected");

            state.connectionListener = function (snapshot) {
                const connected = snapshot.val() === true;

                setStatus(
                    connected,
                    connected
                        ? "Connected to Firebase"
                        : "Connection unavailable"
                );
            };

            state.connectionReference.on(
                "value",
                state.connectionListener
            );

            return true;

        } catch (error) {
            reportError(error, "Connection monitoring failed");
            return false;
        }
    }

    async function ensureAuthenticated() {
        if (!init()) {
            throw new Error(
                "Firebase setup is incomplete. Configure Firebase first."
            );
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
                    if (unsubscribe) {
                        unsubscribe();
                        unsubscribe = null;
                    }

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
                    if (unsubscribe) {
                        unsubscribe();
                        unsubscribe = null;
                    }

                    reportError(error, "Authentication failed");
                    reject(error);
                }
            );
        });
    }


    /* =====================================================
       03. ROOM HELPERS
    ===================================================== */

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

    function normalizeRoomCode(roomCode) {
        return String(roomCode || "")
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "");
    }

    function getRoomReference(roomCode) {
        if (!state.database || !roomCode) {
            return null;
        }

        return state.database
            .ref("rooms")
            .child(normalizeRoomCode(roomCode));
    }

    function createRoomData(roomCode) {
        const now = Date.now();

        return {
            code: roomCode,
            status: "waiting",

            createdAt: now,
            updatedAt: now,

            hostUid: state.currentUser.uid,

            players: {
                white: createPlayerData("white"),
                black: null
            },

            fen: INITIAL_FEN,
            turn: "w",

            moves: {},

            drawOffer: null,

            result: null,
            reason: null
        };
    }

    function saveRoomState(room, roomCode, color, roomReference) {
        state.currentRoom = room || null;
        state.currentRoomCode = roomCode || null;
        state.currentPlayerColor = normalizeColor(color);
        state.roomReference = roomReference || null;

        state.multiplayerConnected = false;
    }


    /* =====================================================
       04. ROOM DISPLAY
    ===================================================== */

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

    function hideCreatedRoom() {
        const container = getElement("created-room-container");
        const codeElement = getElement("created-room-code");

        if (container) {
            container.classList.add("hidden");
            container.style.display = "none";
        }

        if (codeElement) {
            codeElement.textContent = "";
        }
    }

    function updateRoomDisplay(room) {
        if (!room) return;

        const whitePlayer =
            room.players && room.players.white;

        const blackPlayer =
            room.players && room.players.black;

        const whiteElement = getElement("online-white-player");
        const blackElement = getElement("online-black-player");

        if (whiteElement) {
            const name = whitePlayer
                ? whitePlayer.name
                : "Waiting for player...";

            if (whiteElement.tagName === "INPUT") {
                whiteElement.value = name;
            } else {
                whiteElement.textContent = name;
            }
        }

        if (blackElement) {
            const name = blackPlayer
                ? blackPlayer.name
                : "Waiting for player...";

            if (blackElement.tagName === "INPUT") {
                blackElement.value = name;
            } else {
                blackElement.textContent = name;
            }
        }
    }


    /* =====================================================
       05. CREATE ROOM
    ===================================================== */

    async function createRoom() {
        if (state.currentRoomCode) {
            notify("You are already in a room.", "warning");
            return false;
        }

        try {
            await ensureAuthenticated();

            let roomCode = null;
            let roomReference = null;
            let transaction = null;

            for (let attempt = 0; attempt < 8; attempt++) {
                roomCode = generateRoomCode();
                roomReference = getRoomReference(roomCode);

                if (!roomReference) {
                    throw new Error("Room reference unavailable.");
                }

                transaction = await roomReference.transaction(
                    function (currentRoom) {
                        if (currentRoom !== null) {
                            return;
                        }

                        return createRoomData(roomCode);
                    },
                    undefined,
                    false
                );

                if (transaction.committed) {
                    break;
                }
            }

            if (!transaction || !transaction.committed) {
                throw new Error("Could not create a unique room.");
            }

            const room = transaction.snapshot.val();

            saveRoomState(
                room,
                roomCode,
                "white",
                roomReference
            );

            showCreatedRoom(roomCode);

            listenToRoom(roomCode);

            notify(
                "Room created. Share the code with your friend.",
                "success"
            );

            return {
                success: true,
                roomCode: roomCode,
                code: roomCode,
                color: "white",
                room: room
            };

        } catch (error) {
            reportError(error, "Could not create room");
            return false;
        }
    }


    /* =====================================================
       PART 1/3 END
       PART 2/3 इसी फाइल के नीचे जोड़ना है।
       अभी Commit नहीं करना है।
    ===================================================== */
/* =========================================================
   APPARA CHESS — ONLINE MULTIPLAYER SYSTEM
   PART 2/3 START
========================================================= */


/* =====================================================
   06. COPY ROOM CODE
===================================================== */

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
                throw new Error("Copy command failed.");
            }
        }

        notify("Room Code कॉपी हो गया: " + code, "success");
        return true;

    } catch (error) {
        reportError(error, "Room Code कॉपी नहीं हुआ");
        return false;
    }
}


/* =====================================================
   07. JOIN ROOM
===================================================== */

async function joinRoom(roomCode, playerName) {
    if (state.currentRoomCode) {
        notify("आप पहले से एक Room में हैं।", "warning");
        return { success: false, error: "Already in a room" };
    }

    const code = normalizeRoomCode(roomCode);

    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
        notify("सही 6 अक्षरों वाला Room Code डालें।", "warning");

        return {
            success: false,
            error: "Invalid room code"
        };
    }

    try {
        await ensureAuthenticated();

        const roomReference = getRoomReference(code);

        if (!roomReference) {
            throw new Error("Room reference unavailable.");
        }

        const transaction = await roomReference.transaction(
            function (room) {
                if (!room || room.status !== "waiting") {
                    return;
                }

                room.players = room.players || {};

                const whitePlayer = room.players.white;

                /* Same player can reconnect as White */
                if (
                    whitePlayer &&
                    whitePlayer.uid === state.currentUser.uid
                ) {
                    return room;
                }

                if (room.players.black) {
                    return;
                }

                room.players.black = createPlayerData(
                    "black",
                    playerName
                );

                room.status = "playing";
                room.updatedAt = Date.now();

                if (!room.fen) {
                    room.fen = INITIAL_FEN;
                }

                if (!room.turn) {
                    room.turn = "w";
                }

                return room;
            },
            undefined,
            false
        );

        if (!transaction.committed) {
            notify(
                "Room उपलब्ध नहीं है या पहले से भर चुका है।",
                "warning"
            );

            return {
                success: false,
                error: "Room unavailable or full"
            };
        }

        const room = transaction.snapshot.val();

        const color =
            room.players &&
            room.players.white &&
            room.players.white.uid === state.currentUser.uid
                ? "white"
                : "black";

        saveRoomState(
            room,
            code,
            color,
            roomReference
        );

        listenToRoom(code);

        connectMultiplayer();

        notify(
            color === "white"
                ? "आप White Player के रूप में वापस आ गए हैं।"
                : "आप Room में Black Player के रूप में Join हो गए हैं!",
            "success"
        );

        return {
            success: true,
            roomCode: code,
            color: color,
            room: room
        };

    } catch (error) {
        reportError(error, "Room Join करने में समस्या हुई");

        return {
            success: false,
            error: error.message || "Join failed"
        };
    }
}


/* =====================================================
   08. CONNECT MULTIPLAYER CONTROLLER
===================================================== */

function connectMultiplayer() {
    if (state.multiplayerConnected) {
        return true;
    }

    if (
        !state.currentRoom ||
        !state.currentRoomCode ||
        !state.currentPlayerColor
    ) {
        return false;
    }

    const multiplayer = window.APPARA_MULTIPLAYER;

    if (!multiplayer) {
        return false;
    }

    try {
        let connected = false;

        if (typeof multiplayer.connectOnlineRoom === "function") {
            connected = multiplayer.connectOnlineRoom(
                state.currentRoom,
                state.currentRoomCode,
                state.currentPlayerColor
            );
        } else if (typeof multiplayer.startOnline === "function") {
            connected = multiplayer.startOnline({
                room: state.currentRoom,
                roomCode: state.currentRoomCode,
                playerColor: state.currentPlayerColor,
                fen: state.currentRoom.fen || INITIAL_FEN
            });
        }

        if (connected === false) {
            return false;
        }

        state.multiplayerConnected = true;
        return true;

    } catch (error) {
        reportError(error, "Multiplayer connection failed");
        return false;
    }
}


/* =====================================================
   09. ROOM UPDATE CALLBACK
===================================================== */

function setRoomUpdateHandler(callback) {
    state.roomUpdateHandler =
        typeof callback === "function"
            ? callback
            : null;

    return true;
}


/* =====================================================
   10. LISTEN TO ROOM
===================================================== */

function stopRoomListener() {
    if (
        state.roomReference &&
        state.roomListener
    ) {
        try {
            state.roomReference.off(
                "value",
                state.roomListener
            );
        } catch (error) {
            console.warn(
                "[APPARA ONLINE] Listener cleanup failed:",
                error
            );
        }
    }

    state.roomListener = null;

    return true;
}


function listenToRoom(roomCode) {
    stopRoomListener();

    const roomReference = getRoomReference(roomCode);

    if (!roomReference) {
        return false;
    }

    state.roomReference = roomReference;

    state.roomListener = function (snapshot) {
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
            state.multiplayerConnected = false;
            setStatus(true, "Game Finished");
        }

        if (state.roomUpdateHandler) {
            try {
                state.roomUpdateHandler(room);
            } catch (error) {
                reportError(error, "Room update callback failed");
            }
        }
    };

    try {
        roomReference.on(
            "value",
            state.roomListener,
            function (error) {
                reportError(error, "Room update listener failed");
            }
        );

        return true;

    } catch (error) {
        reportError(error, "Could not start room listener");
        return false;
    }
}


/* =====================================================
   11. SEND MOVE
===================================================== */

async function sendMove(moveData) {
    if (
        !state.currentRoomCode ||
        !state.roomReference ||
        !state.currentPlayerColor
    ) {
        return {
            success: false,
            error: "Not connected to a room"
        };
    }

    if (state.submittingMove) {
        return {
            success: false,
            error: "Move already submitting"
        };
    }

    if (!moveData || !moveData.from || !moveData.to) {
        return {
            success: false,
            error: "Invalid move data"
        };
    }

    state.submittingMove = true;

    try {
        const roomReference = state.roomReference;
        const playerColor = state.currentPlayerColor;

        const transaction = await roomReference.transaction(
            function (room) {
                if (!room || room.status !== "playing") {
                    return;
                }

                const expectedTurn = colorToTurn(playerColor);

                if (room.turn !== expectedTurn) {
                    return;
                }

                const player =
                    room.players &&
                    room.players[playerColor];

                if (
                    !player ||
                    player.uid !== state.currentUser.uid
                ) {
                    return;
                }

                const game = new window.Chess(
                    room.fen || INITIAL_FEN
                );

                const move = game.move({
                    from: String(moveData.from),
                    to: String(moveData.to),
                    promotion: moveData.promotion || "q"
                });

                if (!move) {
                    return;
                }

                const moveId = String(
                    Number(room.moveCount || 0) + 1
                );

                room.moves = room.moves || {};

                room.moves[moveId] = {
                    from: move.from,
                    to: move.to,
                    san: move.san,
                    color: move.color,
                    promotion: move.promotion || null,
                    playerUid: state.currentUser.uid,
                    createdAt: Date.now()
                };

                room.moveCount = Number(room.moveCount || 0) + 1;

                room.fen = game.fen();
                room.turn = game.turn();
                room.updatedAt = Date.now();

                if (game.isGameOver()) {
                    room.status = "finished";

                    room.result = game.isCheckmate()
                        ? (game.turn() === "w" ? "black" : "white")
                        : "draw";

                    room.reason = game.isCheckmate()
                        ? "checkmate"
                        : "draw";
                }

                return room;
            },
            undefined,
            false
        );

        if (!transaction.committed) {
            return {
                success: false,
                error: "Move rejected by room state"
            };
        }

        state.currentRoom = transaction.snapshot.val();

        return {
            success: true,
            room: state.currentRoom
        };

    } catch (error) {
        reportError(error, "Move send failed");

        return {
            success: false,
            error: error.message || "Move failed"
        };

    } finally {
        state.submittingMove = false;
    }
}


/* =====================================================
   PART 2/3 END
   PART 3/3 इसी फाइल के नीचे जोड़ना है।
   अभी Commit नहीं करना है।
===================================================== */

    // ==========================================
// APPARA CHESS — ONLINE SYSTEM
// PART 3/3 — DRAW, RESIGN, LEAVE & PUBLIC API
// ==========================================

    async function offerDraw() {
        try {
            if (!state.roomRef || !state.currentUser || !state.color) {
                return { success: false, error: "आप किसी ऑनलाइन रूम में नहीं हैं।" };
            }

            let result = { success: false, error: "ड्रॉ ऑफर नहीं भेजा जा सका।" };

            await state.roomRef.transaction(function (room) {
                if (!room || room.status !== "playing") return;

                if (room.drawOffer) {
                    result.error = "पहले से एक ड्रॉ ऑफर मौजूद है।";
                    return;
                }

                const player = room.players && room.players[state.color];

                if (!player || player.uid !== state.currentUser.uid) return;

                room.drawOffer = {
                    uid: state.currentUser.uid,
                    color: state.color,
                    name: player.name || "Player",
                    createdAt: Date.now()
                };

                room.updatedAt = Date.now();
                result = { success: true };
                return room;
            });

            return result;
        } catch (error) {
            reportError(error, "ड्रॉ ऑफर भेजने में समस्या हुई।");
            return { success: false, error: error.message };
        }
    }

    async function respondToDraw(accept) {
        try {
            if (!state.roomRef || !state.currentUser) {
                return { success: false, error: "ऑनलाइन रूम उपलब्ध नहीं है।" };
            }

            let result = { success: false, error: "ड्रॉ ऑफर का जवाब नहीं दिया जा सका।" };

            await state.roomRef.transaction(function (room) {
                if (!room || !room.drawOffer) {
                    result.error = "कोई ड्रॉ ऑफर मौजूद नहीं है।";
                    return;
                }

                if (room.drawOffer.uid === state.currentUser.uid) {
                    result.error = "आप अपने ही ड्रॉ ऑफर का जवाब नहीं दे सकते।";
                    return;
                }

                if (room.status !== "playing") return;

                const player = room.players && room.players[state.color];

                if (!player || player.uid !== state.currentUser.uid) return;

                if (accept) {
                    room.status = "finished";
                    room.result = "draw";
                    room.reason = "agreement";
                }

                room.drawOffer = null;
                room.updatedAt = Date.now();

                result = {
                    success: true,
                    accepted: !!accept
                };

                return room;
            });

            return result;
        } catch (error) {
            reportError(error, "ड्रॉ का जवाब देने में समस्या हुई।");
            return { success: false, error: error.message };
        }
    }

    async function resign() {
        try {
            if (!state.roomRef || !state.currentUser || !state.color) {
                return { success: false, error: "ऑनलाइन रूम उपलब्ध नहीं है।" };
            }

            let result = { success: false, error: "गेम छोड़ने में समस्या हुई।" };

            await state.roomRef.transaction(function (room) {
                if (!room || room.status !== "playing") return;

                const player = room.players && room.players[state.color];

                if (!player || player.uid !== state.currentUser.uid) return;

                const winner = getOpponentColor(state.color);

                room.status = "finished";
                room.result = winner;
                room.reason = "resignation";
                room.drawOffer = null;
                room.updatedAt = Date.now();

                result = {
                    success: true,
                    winner: winner
                };

                return room;
            });

            return result;
        } catch (error) {
            reportError(error, "गेम छोड़ने में समस्या हुई।");
            return { success: false, error: error.message };
        }
    }

    async function setPlayerOnline(online) {
        try {
            if (!state.roomRef || !state.currentUser || !state.color) {
                return false;
            }

            let updated = false;

            await state.roomRef.transaction(function (room) {
                if (!room || !room.players || !room.players[state.color]) {
                    return;
                }

                const player = room.players[state.color];

                if (player.uid !== state.currentUser.uid) return;

                player.online = !!online;
                player.lastSeen = Date.now();

                room.updatedAt = Date.now();
                updated = true;

                return room;
            });

            return updated;
        } catch (error) {
            reportError(error, "प्लेयर स्टेटस अपडेट नहीं हो सका।");
            return false;
        }
    }

    async function leaveRoom() {
        try {
            const roomReference = state.roomRef;
            const currentColor = state.color;
            const currentUser = state.currentUser;

            stopRoomListener();

            if (roomReference && currentColor && currentUser) {
                await roomReference.transaction(function (room) {
                    if (!room || !room.players || !room.players[currentColor]) {
                        return;
                    }

                    const player = room.players[currentColor];

                    if (player.uid !== currentUser.uid) return;

                    player.online = false;
                    player.lastSeen = Date.now();

                    if (room.status === "playing") {
                        room.status = "finished";
                        room.result = getOpponentColor(currentColor);
                        room.reason = "player_left";
                        room.drawOffer = null;
                    } else if (room.status === "waiting") {
                        room.status = "cancelled";
                        room.reason = "host_left";
                    }

                    room.updatedAt = Date.now();
                    return room;
                });
            }
        } catch (error) {
            reportError(error, "रूम छोड़ते समय समस्या हुई।");
        }

        state.room = null;
        state.roomRef = null;
        state.roomCode = null;
        state.color = null;
        state.multiplayerConnected = false;

        hideCreatedRoom();
        setStatus(false, "ऑनलाइन रूम से डिस्कनेक्ट हो गए।");

        return { success: true };
    }

    function getRoom() {
        return state.room || null;
    }

    function getRoomCode() {
        return state.roomCode || "";
    }

    function getPlayerColor() {
        return state.color || null;
    }

    function getCurrentUser() {
        return state.currentUser || null;
    }

    function isConnected() {
        return !!state.multiplayerConnected;
    }

    function getLastError() {
        return state.lastError || null;
    }

    function destroy() {
        stopRoomListener();

        if (state.connectionRef && state.connectionListener) {
            state.connectionRef.off("value", state.connectionListener);
        }

        state.connectionRef = null;
        state.connectionListener = null;
        state.multiplayerConnected = false;
        state.room = null;
        state.roomRef = null;
        state.roomCode = null;
        state.color = null;
    }

    // ==========================================
    // PUBLIC API
    // ==========================================

    return Object.freeze({
        init: init,
        isFirebaseReady: isFirebaseReady,
        ensureAuthenticated: ensureAuthenticated,

        createRoom: createRoom,
        joinRoom: joinRoom,
        copyRoomCode: copyRoomCode,

        listenToRoom: listenToRoom,
        stopRoomListener: stopRoomListener,
        setRoomUpdateHandler: setRoomUpdateHandler,

        sendMove: sendMove,
        connectMultiplayer: connectMultiplayer,

        offerDraw: offerDraw,
        respondToDraw: respondToDraw,
        resign: resign,
        leaveRoom: leaveRoom,
        setPlayerOnline: setPlayerOnline,

        getRoom: getRoom,
        getRoomCode: getRoomCode,
        getPlayerColor: getPlayerColor,
        getCurrentUser: getCurrentUser,
        isConnected: isConnected,
        getLastError: getLastError,

        destroy: destroy
    });

})();                    
