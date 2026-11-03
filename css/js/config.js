
/* =========================================================
   APPARA CHESS — CONFIGURATION
   FILE: js/config.js
   PART 06
========================================================= */

"use strict";

window.APPARA_CONFIG = Object.freeze({

    /* APP INFORMATION */
    app: {
        name: "APPARA CHESS",
        version: "1.0.0",
        developer: "Subhash Yadav",
        instagram: "iamsubhash177",
        email: "subhash.ydv9950@gmail.com",
        defaultLanguage: "en",
        supportedLanguages: ["en", "hi"]
    },

    /* BOARD SETTINGS */
    board: {
        rows: 8,
        columns: 8,
        defaultTheme: "classic",
        defaultOrientation: "white",
        showCoordinates: true,
        highlightLastMove: true,
        highlightLegalMoves: true,
        highlightCheck: true,
        animationDuration: 220
    },

    /* CHESS PIECES */
    pieces: {
        white: {
            king: "♔",
            queen: "♕",
            rook: "♖",
            bishop: "♗",
            knight: "♘",
            pawn: "♙"
        },

        black: {
            king: "♚",
            queen: "♛",
            rook: "♜",
            bishop: "♝",
            knight: "♞",
            pawn: "♟"
        }
    },

    /* GAME MODES */
    modes: {
        offline: {
            id: "offline",
            name: "Local Chess",
            description: "Play with another player on the same device",
            enabled: true
        },

        computer: {
            id: "computer",
            name: "Play vs Computer",
            description: "Challenge the computer",
            enabled: true
        },

        online: {
            id: "online",
            name: "Online Chess",
            description: "Play with other players online",
            enabled: true
        },

        training: {
            id: "training",
            name: "Training",
            description: "Practice chess skills",
            enabled: true
        }
    },

    /* AI DIFFICULTY */
    difficulty: {
        beginner: {
            id: "beginner",
            name: "Beginner",
            level: 1,
            searchDepth: 1
        },

        easy: {
            id: "easy",
            name: "Easy",
            level: 2,
            searchDepth: 2
        },

        medium: {
            id: "medium",
            name: "Medium",
            level: 3,
            searchDepth: 3
        },

        hard: {
            id: "hard",
            name: "Hard",
            level: 4,
            searchDepth: 4
        },

        expert: {
            id: "expert",
            name: "Expert",
            level: 5,
            searchDepth: 5
        }
    },

    /* BOARD THEMES */
    themes: {
        classic: {
            name: "Classic",
            light: "#f0d9b5",
            dark: "#b58863"
        },

        purple: {
            name: "Royal Purple",
            light: "#d9c2ff",
            dark: "#7041a6"
        },

        blue: {
            name: "Ocean Blue",
            light: "#d7e9ff",
            dark: "#477bb5"
        },

        green: {
            name: "Forest Green",
            light: "#eeeed2",
            dark: "#769656"
        },

        wood: {
            name: "Wood",
            light: "#e8c99b",
            dark: "#9b633d"
        }
    },

    /* CHESS CLOCK PRESETS (SECONDS) */
    clocks: {
        bullet: {
            name: "Bullet",
            minutes: 1,
            increment: 0
        },

        blitz: {
            name: "Blitz",
            minutes: 3,
            increment: 2
        },

        rapid: {
            name: "Rapid",
            minutes: 10,
            increment: 0
        },

        classical: {
            name: "Classical",
            minutes: 30,
            increment: 0
        },

        unlimited: {
            name: "Unlimited",
            minutes: 0,
            increment: 0
        }
    },

    /* SOUND SETTINGS */
    sound: {
        enabled: true,
        musicEnabled: true,
        effectsEnabled: true,
        volume: 0.65
    },

    /* GAME SETTINGS */
    game: {
        defaultMode: "offline",
        defaultDifficulty: "medium",
        defaultClock: "rapid",
        allowUndo: true,
        allowBoardFlip: true,
        allowMoveHistory: true,
        autoQueenPromotion: false,
        confirmResign: true
    },

    /* ONLINE SETTINGS */
    online: {
        enabled: true,
        maxRoomPlayers: 2,
        privateRooms: true,
        friendMatches: true,
        requiresBackend: true
    },

    /* PLAYER PROFILE */
    profile: {
        defaultName: "Guest Player",
        defaultRating: 1000,
        startingWins: 0,
        startingLosses: 0,
        startingDraws: 0
    },

    /* STORAGE KEYS */
    storage: {
        settings: "appara_chess_settings",
        profile: "appara_chess_profile",
        statistics: "appara_chess_statistics",
        games: "appara_chess_games"
    }

});


/* =========================================================
   CONFIGURATION HELPERS
========================================================= */

window.APPARA_UTILS = {

    getPieceSymbol(color, piece) {
        const side = window.APPARA_CONFIG.pieces[color];
        return side && side[piece] ? side[piece] : "";
    },

    getTheme(themeName) {
        return window.APPARA_CONFIG.themes[themeName]
            || window.APPARA_CONFIG.themes.classic;
    },

    getDifficulty(level) {
        return window.APPARA_CONFIG.difficulty[level]
            || window.APPARA_CONFIG.difficulty.medium;
    },

    getClock(clockName) {
        return window.APPARA_CONFIG.clocks[clockName]
            || window.APPARA_CONFIG.clocks.rapid;
    },

    formatTime(seconds) {
        const safeSeconds = Math.max(0, Math.floor(seconds));
        const minutes = Math.floor(safeSeconds / 60);
        const remainingSeconds = safeSeconds % 60;

        return (
            String(minutes).padStart(2, "0") +
            ":" +
            String(remainingSeconds).padStart(2, "0")
        );
    },

    createId(prefix = "appara") {
        return (
            prefix +
            "_" +
            Date.now().toString(36) +
            "_" +
            Math.random().toString(36).slice(2, 9)
        );
    },

    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error("APPARA save error:", error);
            return false;
        }
    },

    loadData(key, fallback = null) {
        try {
            const saved = localStorage.getItem(key);

            if (saved === null) {
                return fallback;
            }

            return JSON.parse(saved);

        } catch (error) {
            console.error("APPARA load error:", error);
            return fallback;
        }
    }

};

console.log("APPARA CHESS configuration loaded successfully.");
