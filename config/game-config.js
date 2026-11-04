
/* =========================================
   APPARA CHESS
   FILE: config/game-config.js
   SECTION: CONFIG
========================================= */

export const CHESS_CONFIG = Object.freeze({
  board: Object.freeze({
    files: 8,
    ranks: 8,
    totalSquares: 64,
    defaultOrientation: "white",
    coordinates: true,
    showLegalMoves: true,
    highlightLastMove: true,
    highlightCheck: true
  }),

  rules: Object.freeze({
    standardChess: true,
    castling: true,
    enPassant: true,
    pawnPromotion: true,
    checkDetection: true,
    checkmateDetection: true,
    stalemateDetection: true,
    threefoldRepetition: true,
    fivefoldRepetition: true,
    fiftyMoveRule: true,
    seventyFiveMoveRule: true,
    insufficientMaterial: true,
    drawAgreement: true,
    resignation: true,
    timeout: true
  }),

  modes: Object.freeze({
    offline: true,
    computer: true,
    online: true,
    privateRoom: true,
    friendChallenge: true,
    training: true,
    puzzle: true,
    tournament: true,
    review: true
  }),

  timeControls: Object.freeze({
    bullet: [
      { name: "1 + 0", minutes: 1, increment: 0 },
      { name: "2 + 1", minutes: 2, increment: 1 }
    ],

    blitz: [
      { name: "3 + 0", minutes: 3, increment: 0 },
      { name: "3 + 2", minutes: 3, increment: 2 },
      { name: "5 + 0", minutes: 5, increment: 0 },
      { name: "5 + 3", minutes: 5, increment: 3 }
    ],

    rapid: [
      { name: "10 + 0", minutes: 10, increment: 0 },
      { name: "10 + 5", minutes: 10, increment: 5 },
      { name: "15 + 10", minutes: 15, increment: 10 }
    ],

    classical: [
      { name: "30 + 0", minutes: 30, increment: 0 },
      { name: "30 + 20", minutes: 30, increment: 20 }
    ]
  }),

  difficulty: Object.freeze([
    { id: "beginner", name: "Beginner", depth: 1 },
    { id: "easy", name: "Easy", depth: 2 },
    { id: "medium", name: "Medium", depth: 3 },
    { id: "hard", name: "Hard", depth: 4 },
    { id: "expert", name: "Expert", depth: 5 },
    { id: "master", name: "Master", depth: 6 }
  ]),

  playerColors: Object.freeze([
    "white",
    "black",
    "random"
  ]),

  gameDefaults: Object.freeze({
    playerColor: "white",
    opponent: "computer",
    difficulty: "medium",
    timeControl: "10 + 0",
    allowUndo: true,
    autoQueenPromotion: false,
    soundEnabled: true,
    animationsEnabled: true
  }),

  review: Object.freeze({
    enabled: true,
    allowMoveNavigation: true,
    allowAutoReplay: true,
    allowSpeedControl: true,
    allowPositionJump: true,
    allowPGNExport: true,
    allowFENCopy: true
  })
});

/* =========================================
   FILE END: config/game-config.js
========================================= */
