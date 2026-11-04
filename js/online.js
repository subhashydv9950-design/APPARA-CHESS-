/* =========================================================
   APPARA CHESS — ONLINE MULTIPLAYER
   PART 21I — FIREBASE INTEGRATION REPAIR
   FILE: js/online.js
   PART 1/3 — CORE, FIREBASE & ROOM CREATION
========================================================= */

window.APPARA_ONLINE = (function () {
    "use strict";

    /* =====================================================
       1. STATE
    ===================================================== */

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

        playerName: "Guest Player",
        lastError: null,

        submittingMove: false,
        leavingRoom: false
    };


    /* =====================================================
       2. DOM HELPERS
    ===================================================== */

    function getElement(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const element = getElement(id);

        if (element) {
            element.textContent = value;
        }
    }


    /* =====================================================
       3. NOTIFICATION
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
        } else {
            console.log("[APPARA ONLINE]", message);
        }
    }


    /* =====================================================
       4. FIREBASE MODULE
    ===================================================== */

    function getFirebaseModule() {
        return window.APPARA_FIREBASE || null;
    }

    function isFirebaseReady() {
        const firebaseModule = getFirebaseModule();

        if (!firebaseModule) {
            return false;
        }

        if (
            typeof firebaseModule.isAvailable === "function" &&
            !firebaseModule.isAvailable()
        ) {
            return false;
        }

        if (
            typeof firebaseModule.isConfigured === "function" &&
            !firebaseModule.isConfigured()
        ) {
            return false;
        }

        return true;
    }


    /* =====================================================
       5. INITIALIZATION
    ===================================================== */

    function init() {
        if (state.initialized) {
            return true;
        }

        const firebaseModule = getFirebaseModule();

        if (!firebaseModule) {
            setStatus(false, "Firebase module unavailable");
            return false;
        }

        if (!isFirebaseReady()) {
            setStatus(false, "Firebase setup required");

            console.warn(
                "APPARA CHESS: Add your Firebase project configuration."
            );

            return false;
        }

        try {
            if (
                typeof firebaseModule.initialize === "function"
            ) {
                firebaseModule.initialize();
            }

            state.auth =
                typeof firebaseModule.getAuth === "function"
                    ? firebaseModule.getAuth()
                    : null;

            state.database =
                typeof firebaseModule.getDatabase === "function"
                    ? firebaseModule.getDatabase()
                    : null;

            if (!state.auth || !state.database) {
                setStatus(false, "Firebase services unavailable");
                return false;
            }

            state.initialized = true;

            monitorConnection();

            setStatus(true, "Firebase ready");

            return true;

        } catch (error) {
            reportError(error, "Firebase initialization failed");
            return false;
        }
    }


    /* =====================================================
       6. CONNECTION STATUS
    ===================================================== */

    function setStatus(connected, message) {
        state.connected = Boolean(connected);

        const indicator = getElement("connection-indicator");
        const statusText = getElement("online-connection-status");

        if (indicator) {
            indicator.classList.toggle(
                "connected",
                state.connected
            );

            indicator.classList.toggle(
                "disconnected",
                !state.connected
            );
        }

        if (statusText) {
            statusText.textContent =
                message ||
                (state.connected ? "Connected" : "Disconnected");
        }
    }


    /* =====================================================
       7. CONNECTION MONITOR
    ===================================================== */

    function monitorConnection() {
        if (!state.database) {
            return;
        }

        try {
            const connectedRef =
                state.database.ref(".info/connected");

            connectedRef.on("value", function (snapshot) {
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


    /* =====================================================
       8. ERROR HANDLING
    ===================================================== */

    function reportError(error, message) {
        state.lastError = error || null;

        console.error(
            "[APPARA ONLINE]",
            message || "Online error",
            error || ""
        );

        setStatus(false, message || "Online error");

        notify(
            message || "Online service error.",
            "error"
        );
    }


    /* =====================================================
       9. AUTHENTICATION
    ===================================================== */

    function ensureAuthenticated() {
        return new Promise(function (resolve, reject) {
            if (!init()) {
                reject(
                    new Error("Firebase is not configured.")
                );

                return;
            }

            if (state.auth.currentUser) {
                state.currentUser = state.auth.currentUser;
                state.authenticated = true;

                resolve(state.currentUser);
                return;
            }

            const unsubscribe = state.auth.onAuthStateChanged(
                function (user) {
                    unsubscribe();

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
                            reportError(
                                error,
                                "Anonymous sign-in failed"
                            );

                            reject(error);
                        });
                },
                function (error) {
                    unsubscribe();

                    reportError(
                        error,
                        "Authentication failed"
                    );

                    reject(error);
                }
            );
        });
    }


    /* =====================================================
       10. PLAYER NAME
    ===================================================== */

    function getPlayerName() {
        const profile = window.APPARA_PROFILE;

        if (
            profile &&
            typeof profile.getProfile === "function"
        ) {
            const data = profile.getProfile();

            if (data && data.name) {
                return String(data.name).slice(0, 24);
            }
        }

        const input = getElement("online-player-name");

        if (input && input.value.trim()) {
            return input.value.trim().slice(0, 24);
        }

        return state.playerName;
    }


    /* =====================================================
       11. PLAYER DATA
    ===================================================== */

    function createPlayerData(color) {
        const user = state.currentUser;

        return {
            uid: user ? user.uid : null,
            name: getPlayerName(),
            color: color,
            online: true,
            joinedAt: Date.now()
        };
    }


    /* =====================================================
       12. ROOM CODE GENERATOR
    ===================================================== */

    function generateRoomCode() {
        const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

        let code = "";

        for (let i = 0; i < 6; i++) {
            const index = Math.floor(
                Math.random() * characters.length
            );

            code += characters[index];
        }

        return code;
    }


    /* =====================================================
       13. DATABASE ROOM REFERENCE
    ===================================================== */

    function getRoomReference(roomCode) {
        if (!state.database || !roomCode) {
            return null;
        }

        return state.database
            .ref("rooms")
            .child(String(roomCode).toUpperCase());
    }


    /* =====================================================
       14. CREATE ROOM
    ===================================================== */

    async function createRoom() {
        if (state.currentRoomCode) {
            notify("You are already in a room.", "warning");
            return false;
        }

        try {
            await ensureAuthenticated();

            const roomCode = generateRoomCode();

            const roomRef = getRoomReference(roomCode);

            if (!roomRef) {
                throw new Error("Room database reference unavailable.");
            }

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

            const transaction = await roomRef.transaction(
                function (currentData) {
                    if (currentData !== null) {
                        return;
                    }

                    return roomData;
                },
                undefined,
                false
            );

            if (!transaction.committed) {
                throw new Error(
                    "Could not reserve a unique room code."
                );
            }

            state.currentRoom = transaction.snapshot.val();
            state.currentRoomCode = roomCode;
            state.currentPlayerColor = "w";
            state.roomReference = roomRef;

            showCreatedRoom(roomCode);

            listenToRoom(roomCode);

            notify(
                "Room created. Share the code with your friend.",
                "success"
            );

            return roomCode;

        } catch (error) {
            reportError(error, "Could not create room");
            return false;
        }
    }


    /* =====================================================
       15. SHOW CREATED ROOM
    ===================================================== */

    function showCreatedRoom(roomCode) {
        const container =
            getElement("created-room-container");

        const codeElement =
            getElement("created-room-code");

        if (codeElement) {
            codeElement.textContent = roomCode;
        }

        if (container) {
            container.classList.remove("hidden");
            container.style.display = "";
        }
    }


    /* =====================================================
       16. COPY ROOM CODE
    ===================================================== */

    async function copyRoomCode() {
        if (!state.currentRoomCode) {
            notify("No room code available.", "warning");
            return false;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(
                    state.currentRoomCode
                );
            } else {
                const input = document.createElement("textarea");

                input.value = state.currentRoomCode;

                document.body.appendChild(input);

                input.select();

                const copied =
                    document.execCommand("copy");

                input.remove();

                if (!copied) {
                    throw new Error("Copy command failed.");
                }
            }

            notify("Room code copied.", "success");

            return true;

        } catch (error) {
            reportError(error, "Could not copy room code");
            return false;
        }
    }


    /* =====================================================
       PART 1/3 END
       CONTINUE PART 2/3 BELOW THIS LINE
    ===================================================== */

       /* =========================================================
   APPARA CHESS — ONLINE MULTIPLAYER
   PART 21I — FIREBASE INTEGRATION REPAIR
   FILE: js/online.js
   PART 2/3 — JOIN ROOM, ROOM LISTENER & MOVE SYNC
========================================================= */


/* =====================================================
   17. JOIN ROOM
===================================================== */

async function joinRoom(roomCode) {
    if (state.currentRoomCode) {
        notify("Leave your current room first.", "warning");
        return false;
    }

    const code = String(roomCode || "")
        .trim()
        .toUpperCase();

    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
        notify("Enter a valid 6-character room code.", "warning");
        return false;
    }

    try {
        await ensureAuthenticated();

        const roomRef = getRoomReference(code);

        if (!roomRef) {
            throw new Error("Room reference unavailable.");
        }

        const joinResult = await roomRef.transaction(
            function (room) {
                if (!room || room.status !== "waiting") {
                    return;
                }

                if (
                    !room.players ||
                    room.players.black !== null
                ) {
                    return;
                }

                room.players.black = createPlayerData("b");
                room.status = "playing";
                room.updatedAt = Date.now();

                return room;
            },
            undefined,
            false
        );

        if (!joinResult.committed) {
            notify(
                "Room is unavailable or already full.",
                "warning"
            );

            return false;
        }

        state.currentRoom = joinResult.snapshot.val();
        state.currentRoomCode = code;
        state.currentPlayerColor = "b";
        state.roomReference = roomRef;

        listenToRoom(code);

        const fen = state.currentRoom.fen;

        if (fen && window.APPARA_ENGINE) {
            window.APPARA_ENGINE.load(fen);
        }

        connectMultiplayer(code, "b");

        notify("Joined room successfully.", "success");

        return true;

    } catch (error) {
        reportError(error, "Could not join room");
        return false;
    }
}


/* =====================================================
   18. CONNECT MULTIPLAYER CONTROLLER
===================================================== */

function connectMultiplayer(roomCode, playerColor) {
    const multiplayer = window.APPARA_MULTIPLAYER;

    if (
        !multiplayer ||
        typeof multiplayer.startOnline !== "function"
    ) {
        console.warn("Multiplayer controller unavailable.");
        return false;
    }

    multiplayer.startOnline({
        roomCode: roomCode,
        playerColor: playerColor
    });

    return true;
}


/* =====================================================
   19. SET ROOM UPDATE HANDLER
===================================================== */

function setRoomUpdateHandler(callback) {
    state.roomUpdateHandler =
        typeof callback === "function"
            ? callback
            : null;

    return true;
}


/* =====================================================
   20. LISTEN TO ROOM
===================================================== */

function listenToRoom(roomCode) {
    const code = String(
        roomCode || state.currentRoomCode || ""
    ).toUpperCase();

    const roomRef = getRoomReference(code);

    if (!roomRef) {
        return false;
    }

    stopRoomListener();

    state.roomReference = roomRef;

    state.roomListener = roomRef.on(
        "value",
        function (snapshot) {
            if (!snapshot.exists()) {
                notify("The room no longer exists.", "warning");
                return;
            }

            const roomData = snapshot.val();

            state.currentRoom = roomData;

            updateRoomDisplay(roomData);

            if (typeof state.roomUpdateHandler === "function") {
                state.roomUpdateHandler(roomData);
            }

            /*
             * A room created by this player must also connect
             * its multiplayer controller when the opponent joins.
             */

            if (
                roomData.status === "playing" &&
                !state.multiplayerConnected
            ) {
                state.multiplayerConnected = true;

                connectMultiplayer(
                    code,
                    state.currentPlayerColor
                );
            }

            if (roomData.status === "finished") {
                state.multiplayerConnected = false;
            }
        },
        function (error) {
            reportError(error, "Room listener failed");
        }
    );

    return true;
}


/* =====================================================
   21. STOP ROOM LISTENER
===================================================== */

function stopRoomListener() {
    if (
        state.roomReference &&
        state.roomListener
    ) {
        state.roomReference.off(
            "value",
            state.roomListener
        );
    }

    state.roomListener = null;

    return true;
}


/* =====================================================
   22. UPDATE ROOM DISPLAY
===================================================== */

function updateRoomDisplay(roomData) {
    if (!roomData) {
        return;
    }

    const whitePlayer =
        roomData.players && roomData.players.white;

    const blackPlayer =
        roomData.players && roomData.players.black;

    setText(
        "online-player-name",
        whitePlayer ? whitePlayer.name : "Waiting for player"
    );

    const blackName = document.getElementById("black-player-name");

    if (blackName) {
        blackName.textContent =
            blackPlayer ? blackPlayer.name : "Waiting for player";
    }

    const statusText = document.getElementById(
        "online-connection-status"
    );

    if (statusText) {
        statusText.textContent =
            roomData.status === "playing"
                ? "Match in progress"
                : roomData.status === "finished"
                    ? "Match finished"
                    : "Waiting for opponent";
    }
}


/* =====================================================
   23. SEND MOVE
===================================================== */

async function sendMove(move) {
    if (
        state.submittingMove ||
        !state.currentRoomCode ||
        !state.currentRoom ||
        !state.currentPlayerColor
    ) {
        return false;
    }

    if (!move || !move.from || !move.to) {
        return false;
    }

    const engine = window.APPARA_ENGINE;

    if (!engine) {
        return false;
    }

    state.submittingMove = true;

    try {
        const roomRef = state.roomReference ||
            getRoomReference(state.currentRoomCode);

        if (!roomRef) {
            throw new Error("Room reference unavailable.");
        }

        const expectedFen =
            move.expectedFen ||
            engine.getFEN();

        const currentMove = {
            from: move.from,
            to: move.to,
            promotion: move.promotion || "q"
        };

        /*
         * Read the latest room state before committing.
         * The move is validated against a temporary chess
         * instance, then committed with a transaction.
         */

        const snapshot = await roomRef.once("value");
        const room = snapshot.val();

        if (!room || room.status !== "playing") {
            throw new Error("Room is not accepting moves.");
        }

        const turn = room.turn || "w";

        if (turn !== state.currentPlayerColor) {
            throw new Error("It is not your turn.");
        }

        if (
            room.fen &&
            expectedFen !== room.fen
        ) {
            throw new Error("Board position is out of date.");
        }

        const validator = new Chess();

        const position = room.fen || expectedFen;

        if (!validator.load(position)) {
            throw new Error("Invalid room position.");
        }

        const validatedMove = validator.move(currentMove);

        if (!validatedMove) {
            throw new Error("Illegal chess move.");
        }

        const nextFen = validator.fen();

        const moveData = {
            from: validatedMove.from,
            to: validatedMove.to,
            promotion: validatedMove.promotion || null,
            san: validatedMove.san,
            color: validatedMove.color,
            timestamp: Date.now()
        };

        const moveKey = roomRef.child("moves").push().key;

        const transaction = await roomRef.transaction(
            function (latestRoom) {
                if (!latestRoom || latestRoom.status !== "playing") {
                    return;
                }

                if (
                    latestRoom.turn !== state.currentPlayerColor
                ) {
                    return;
                }

                if (
                    latestRoom.fen &&
                    latestRoom.fen !== position
                ) {
                    return;
                }

                latestRoom.fen = nextFen;

                latestRoom.turn =
                    validatedMove.color === "w" ? "b" : "w";

                latestRoom.updatedAt = Date.now();

                latestRoom.moves =
                    latestRoom.moves || {};

                latestRoom.moves[moveKey] = moveData;

                return latestRoom;
            },
            undefined,
            false
        );

        if (!transaction.committed) {
            throw new Error(
                "Move was rejected because the room changed."
            );
        }

        state.currentRoom = transaction.snapshot.val();

        return true;

    } catch (error) {
        console.error("Online move submission failed:", error);

        notify(
            error.message || "Could not submit move.",
            "warning"
        );

        return false;

    } finally {
        state.submittingMove = false;
    }
}


/* =====================================================
   24. UPDATE PLAYER ONLINE STATUS
===================================================== */

async function setPlayerOnline(isOnline) {
    if (
        !state.currentRoomCode ||
        !state.currentPlayerColor ||
        !state.roomReference
    ) {
        return false;
    }

    try {
        const playerKey =
            state.currentPlayerColor === "w"
                ? "white"
                : "black";

        await state.roomReference
            .child("players")
            .child(playerKey)
            .update({
                online: Boolean(isOnline),
                lastSeen: Date.now()
            });

        return true;

    } catch (error) {
        console.error("Player status update failed:", error);
        return false;
    }
}


/* =====================================================
   PART 2/3 END
   CONTINUE PART 3/3 BELOW THIS LINE
========================================================= */   
   /* =========================================================
   APPARA CHESS — ONLINE MULTIPLAYER
   PART 21I — FINAL ROOM CONTROLS & PUBLIC API
   FILE: js/online.js
   PART 3/3
========================================================= */


/* =====================================================
   25. RESIGN GAME
===================================================== */

async function resign() {
    if (
        !state.currentRoomCode ||
        !state.currentRoom ||
        !state.currentPlayerColor
    ) {
        return false;
    }

    try {
        const roomRef = state.roomReference;

        const winner =
            state.currentPlayerColor === "w" ? "b" : "w";

        const result = await roomRef.transaction(
            function (room) {
                if (!room || room.status !== "playing") {
                    return;
                }

                room.status = "finished";
                room.result = winner;
                room.reason = "resignation";
                room.updatedAt = Date.now();

                return room;
            },
            undefined,
            false
        );

        if (!result.committed) {
            notify("Could not resign this game.", "warning");
            return false;
        }

        state.currentRoom = result.snapshot.val();

        notify("You resigned the game.", "info");

        return true;

    } catch (error) {
        reportError(error, "Resignation failed");
        return false;
    }
}


/* =====================================================
   26. OFFER DRAW
===================================================== */

async function offerDraw() {
    if (
        !state.currentRoomCode ||
        !state.currentRoom ||
        !state.currentPlayerColor
    ) {
        return false;
    }

    try {
        const roomRef = state.roomReference;

        const result = await roomRef.transaction(
            function (room) {
                if (!room || room.status !== "playing") {
                    return;
                }

                if (room.drawOfferBy) {
                    return;
                }

                room.drawOfferBy = state.currentPlayerColor;
                room.updatedAt = Date.now();

                return room;
            },
            undefined,
            false
        );

        if (!result.committed) {
            notify(
                "A draw offer is already pending or the game ended.",
                "warning"
            );

            return false;
        }

        state.currentRoom = result.snapshot.val();

        notify("Draw offer sent to your opponent.", "success");

        return true;

    } catch (error) {
        reportError(error, "Could not offer a draw");
        return false;
    }
}


/* =====================================================
   27. RESPOND TO DRAW OFFER
===================================================== */

async function respondToDraw(accept) {
    if (
        !state.currentRoomCode ||
        !state.currentRoom ||
        !state.currentPlayerColor
    ) {
        return false;
    }

    try {
        const roomRef = state.roomReference;

        const result = await roomRef.transaction(
            function (room) {
                if (!room || room.status !== "playing") {
                    return;
                }

                if (
                    !room.drawOfferBy ||
                    room.drawOfferBy === state.currentPlayerColor
                ) {
                    return;
                }

                if (accept) {
                    room.status = "finished";
                    room.result = "draw";
                    room.reason = "agreement";
                }

                room.drawOfferBy = null;
                room.updatedAt = Date.now();

                return room;
            },
            undefined,
            false
        );

        if (!result.committed) {
            notify("No opponent draw offer is pending.", "info");
            return false;
        }

        state.currentRoom = result.snapshot.val();

        notify(
            accept ? "Draw accepted." : "Draw declined.",
            "success"
        );

        return true;

    } catch (error) {
        reportError(error, "Could not respond to draw offer");
        return false;
    }
}


/* =====================================================
   28. LEAVE ROOM
===================================================== */

async function leaveRoom() {
    if (!state.currentRoomCode) {
        return true;
    }

    if (state.leavingRoom) {
        return false;
    }

    state.leavingRoom = true;

    const roomRef = state.roomReference;
    const color = state.currentPlayerColor;

    try {
        stopRoomListener();

        if (roomRef && color) {
            const playerKey =
                color === "w" ? "white" : "black";

            await roomRef.child("players")
                .child(playerKey)
                .update({
                    online: false,
                    lastSeen: Date.now()
                });

            /*
             * Do not delete the room when leaving.
             * This preserves the opponent's game record.
             */
        }

        state.currentRoom = null;
        state.currentRoomCode = null;
        state.currentPlayerColor = null;
        state.roomReference = null;
        state.roomUpdateHandler = null;
        state.multiplayerConnected = false;
        state.submittingMove = false;

        const createdContainer = getElement(
            "created-room-container"
        );

        if (createdContainer) {
            createdContainer.style.display = "none";
        }

        notify("You left the room.", "info");

        return true;

    } catch (error) {
        reportError(error, "Could not leave room");
        return false;

    } finally {
        state.leavingRoom = false;
    }
}


/* =====================================================
   29. ROOM INFORMATION
===================================================== */

function getRoom() {
    return state.currentRoom
        ? JSON.parse(JSON.stringify(state.currentRoom))
        : null;
}

function getRoomCode() {
    return state.currentRoomCode;
}

function getPlayerColor() {
    return state.currentPlayerColor;
}

function getCurrentUser() {
    return state.currentUser;
}

function isConnected() {
    return Boolean(state.connected);
}

function isAuthenticated() {
    return Boolean(state.authenticated);
}

function getLastError() {
    return state.lastError;
}


/* =====================================================
   30. RESET ONLINE STATE
===================================================== */

function resetOnlineState() {
    stopRoomListener();

    state.currentRoom = null;
    state.currentRoomCode = null;
    state.currentPlayerColor = null;
    state.roomReference = null;
    state.roomUpdateHandler = null;
    state.multiplayerConnected = false;
    state.submittingMove = false;
    state.leavingRoom = false;

    return true;
}


/* =====================================================
   31. DESTROY CONTROLLER
===================================================== */

function destroy() {
    stopRoomListener();

    if (database) {
        try {
            database.ref(".info/connected").off();
        } catch (error) {
            console.warn(error);
        }
    }

    resetOnlineState();

    state.initialized = false;
    state.connected = false;
    state.authenticated = false;

    return true;
}


/* =====================================================
   32. PUBLIC API
===================================================== */

window.APPARA_ONLINE = {
    init: init,
    setStatus: setStatus,
    reportError: reportError,

    ensureAuthenticated: ensureAuthenticated,

    createRoom: createRoom,
    joinRoom: joinRoom,
    listenToRoom: listenToRoom,
    stopRoomListener: stopRoomListener,

    setRoomUpdateHandler: setRoomUpdateHandler,
    updateRoomDisplay: updateRoomDisplay,

    sendMove: sendMove,
    setPlayerOnline: setPlayerOnline,

    resign: resign,
    offerDraw: offerDraw,
    respondToDraw: respondToDraw,

    leaveRoom: leaveRoom,
    resetOnlineState: resetOnlineState,

    getRoom: getRoom,
    getRoomCode: getRoomCode,
    getPlayerColor: getPlayerColor,
    getCurrentUser: getCurrentUser,

    isConnected: isConnected,
    isAuthenticated: isAuthenticated,
    getLastError: getLastError,

    copyRoomCode: copyRoomCode,
    destroy: destroy
};


/* =========================================================
   APPARA CHESS — ONLINE MULTIPLAYER CONTROLLER
   PART 21I COMPLETE
========================================================= */
