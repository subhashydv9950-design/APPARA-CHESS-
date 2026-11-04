
/* =========================================
   APPARA CHESS
   FILE: config/app-config.js
   SECTION: CONFIG
========================================= */

export const APP_CONFIG = Object.freeze({
  name: "APPARA CHESS",
  shortName: "APPARA",
  tagline: "The Royal Chess Experience",

  version: "1.0.0",
  developer: "Subhash Yadav",

  appId: "apparachess",
  storagePrefix: "apparachess_",

  paths: Object.freeze({
    config: "./config/",
    javascript: "./js/",
    styles: "./css/",
    models: "./models/",
    textures: "./textures/",
    audio: "./audio/",
    icons: "./icons/"
  }),

  display: Object.freeze({
    preferredOrientation: "landscape",
    preferredMode: "fullscreen",
    defaultGraphics: "high",
    reduceMotion: false
  }),

  features: Object.freeze({
    offlineChess: true,
    computerOpponent: true,
    onlineMultiplayer: true,
    friends: true,
    tournaments: true,
    puzzles: true,
    training: true,
    chessReview: true,
    3dArena: true,
    itemUpgrades: true
  }),

  screens: Object.freeze([
    "home",
    "game",
    "online",
    "training",
    "puzzles",
    "tournaments",
    "world",
    "shop",
    "leaderboard",
    "profile",
    "settings",
    "about"
  ]),

  limits: Object.freeze({
    maxDisplayNameLength: 20,
    maxBioLength: 160,
    maxFriends: 200,
    maxRoomPlayers: 2
  })
});

export const APP_EVENTS = Object.freeze({
  APP_READY: "app:ready",
  SCREEN_CHANGE: "screen:change",
  GAME_START: "game:start",
  GAME_END: "game:end",
  SETTINGS_CHANGE: "settings:change",
  ERROR: "app:error"
});
