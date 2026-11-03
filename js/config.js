/* =========================================
   APPARA CHESS — GLOBAL CONFIGURATION
   PART 06 START
========================================= */

"use strict";

window.APPARA_CONFIG = Object.freeze({

  /* APP INFORMATION */
  app: {
    name: "APPARA CHESS",
    version: "1.0.0",
    developer: "Subhash Yadav",
    founder: "Subhash Yadav",
    instagram: "iamsubhash177",
    email: "subhash.ydv9950@gmail.com",
    website: "",
    defaultLanguage: "en",
    defaultTheme: "purple"
  },

  /* STORAGE KEYS */
  storage: {
    settings: "appara_settings_v1",
    profile: "appara_profile_v1",
    statistics: "appara_statistics_v1",
    game: "appara_game_v1",
    puzzles: "appara_puzzles_v1",
    tournaments: "appara_tournaments_v1",
    sound: "appara_sound_v1",
    music: "appara_music_v1"
  },

  /* PAGE NAMES */
  pages: [
    "home",
    "game",
    "online",
    "training",
    "puzzles",
    "tournament",
    "leaderboard",
    "profile",
    "settings",
    "about"
  ],

  /* GAME MODES */
  modes: {
    OFFLINE: "offline",
    COMPUTER: "computer",
    ONLINE: "online",
    TRAINING: "training"
  },

  /* CHESS SETTINGS */
  chess: {
    initialFen: "start",
    defaultTime: 10,
    defaultIncrement: 0,
    defaultDifficulty: "medium",
    allowUndo: true,
    allowBoardFlip: true,
    showLegalMoves: true,
    showCoordinates: true
  },

  /* PIECE SYMBOLS */
  pieces: {
    white: {
      k: "♔",
      q: "♕",
      r: "♖",
      b: "♗",
      n: "♘",
      p: "♙"
    },

    black: {
      k: "♚",
      q: "♛",
      r: "♜",
      b: "♝",
      n: "♞",
      p: "♟"
    }
  },

  /* PLAYER DEFAULTS */
  player: {
    defaultName: "Guest Player",
    defaultAvatar: "♟",
    defaultRating: 1000,
    defaultIdPrefix: "AP",
    startingCoins: 2500
  },

  /* AI DIFFICULTY */
  ai: {
    levels: [
      {
        id: "easy",
        name: "Easy",
        depth: 1
      },
      {
        id: "medium",
        name: "Medium",
        depth: 2
      },
      {
        id: "hard",
        name: "Hard",
        depth: 3
      },
      {
        id: "expert",
        name: "Expert",
        depth: 4
      }
    ],
    defaultLevel: "medium",
    thinkDelay: 450
  },

  /* CLOCK OPTIONS — MINUTES */
  timeControls: [
    {
      id: "bullet",
      name: "Bullet",
      minutes: 1,
      increment: 0
    },
    {
      id: "bullet-plus",
      name: "Bullet +",
      minutes: 2,
      increment: 1
    },
    {
      id: "blitz",
      name: "Blitz",
      minutes: 3,
      increment: 0
    },
    {
      id: "blitz-plus",
      name: "Blitz +",
      minutes: 5,
      increment: 3
    },
    {
      id: "rapid",
      name: "Rapid",
      minutes: 10,
      increment: 0
    },
    {
      id: "rapid-plus",
      name: "Rapid +",
      minutes: 15,
      increment: 10
    },
    {
      id: "classic",
      name: "Classical",
      minutes: 30,
      increment: 0
    }
  ],

  /* BOARD THEMES */
  boardThemes: [
    {
      id: "purple",
      name: "Royal Purple"
    },
    {
      id: "classic",
      name: "Classic Wood"
    },
    {
      id: "blue",
      name: "Ocean Blue"
    },
    {
      id: "green",
      name: "Forest Green"
    },
    {
      id: "dark",
      name: "Dark Silver"
    }
  ],

  /* DEFAULT SETTINGS */
  defaultSettings: {
    sound: true,
    music: false,
    animations: true,
    coordinates: true,
    legalMoves: true,
    boardTheme: "purple",
    difficulty: "medium",
    autoQueen: false,
    confirmResign: true,
    confirmNewGame: true,
    showCapturedPieces: true,
    highlightLastMove: true,
    showMoveHistory: true
  },

  /* ONLINE SETTINGS */
  online: {
    roomCodeLength: 6,
    minimumRoomCodeLength: 4,
    maximumRoomCodeLength: 8,
    maximumPlayers: 2,
    reconnectAttempts: 5,
    reconnectDelay: 2000
  },

  /* PUZZLE SETTINGS */
  puzzles: {
    startingLevel: 1,
    totalLevels: 100,
    pointsPerSolve: 10,
    hintsAllowed: true
  },

  /* TOURNAMENT SETTINGS */
  tournament: {
    minimumPlayers: 2,
    maximumPlayers: 64,
    defaultCapacity: 8,
    formats: [
      {
        id: "knockout",
        name: "Knockout"
      },
      {
        id: "round-robin",
        name: "Round Robin"
      }
    ]
  },

  /* NOTIFICATIONS */
  notifications: {
    duration: 2800,
    maximumVisible: 4
  },

  /* SUPPORTED LANGUAGES */
  languages: [
    {
      code: "en",
      name: "English"
    },
    {
      code: "hi",
      name: "हिन्दी"
    },
    {
      code: "bn",
      name: "বাংলা"
    },
    {
      code: "ta",
      name: "தமிழ்"
    },
    {
      code: "te",
      name: "తెలుగు"
    },
    {
      code: "mr",
      name: "मराठी"
    },
    {
      code: "gu",
      name: "ગુજરાતી"
    },
    {
      code: "pa",
      name: "ਪੰਜਾਬੀ"
    },
    {
      code: "ur",
      name: "اردو"
    },
    {
      code: "de",
      name: "Deutsch"
    },
    {
      code: "fr",
      name: "Français"
    },
    {
      code: "es",
      name: "Español"
    },
    {
      code: "ru",
      name: "Русский"
    },
    {
      code: "ja",
      name: "日本語"
    },
    {
      code: "ko",
      name: "한국어"
    },
    {
      code: "zh",
      name: "中文"
    },
    {
      code: "uk",
      name: "Українська"
    }
  ]

});

/* =========================================
   APPARA CHESS — GLOBAL CONFIGURATION
   PART 06 END
========================================= */
