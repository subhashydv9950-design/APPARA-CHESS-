
/* =========================================
   APPARA CHESS
   FILE: config/economy-config.js
   SECTION: CONFIG
========================================= */

export const ECONOMY_CONFIG = Object.freeze({

  currencies: Object.freeze({
    coins: {
      id: "coins",
      name: "Coins",
      symbol: "🪙",
      startingBalance: 2500
    },

    diamonds: {
      id: "diamonds",
      name: "Diamonds",
      symbol: "💎",
      startingBalance: 10
    }
  }),

  rewards: Object.freeze({
    dailyLogin: {
      enabled: true,
      coins: 100,
      diamonds: 0
    },

    dailyStreak: [
      { day: 1, coins: 100, diamonds: 0 },
      { day: 2, coins: 150, diamonds: 0 },
      { day: 3, coins: 200, diamonds: 1 },
      { day: 4, coins: 250, diamonds: 0 },
      { day: 5, coins: 350, diamonds: 1 },
      { day: 6, coins: 450, diamonds: 1 },
      { day: 7, coins: 700, diamonds: 3 }
    ],

    matchCompletion: {
      coins: 25,
      diamonds: 0
    },

    matchVictory: {
      coins: 50,
      diamonds: 0
    },

    puzzleCompletion: {
      coins: 20,
      diamonds: 0
    },

    tournamentVictory: {
      coins: 500,
      diamonds: 5
    }
  }),

  shop: Object.freeze({
    enabled: true,
    requirePurchaseConfirmation: true,
    allowItemPreview: true,
    allowOwnedItemEquip: true,
    allowDuplicatePurchase: false,

    categories: Object.freeze([
      "piece-collections",
      "board-collections",
      "tables",
      "environments",
      "lighting",
      "move-effects",
      "victory-effects",
      "special-items"
    ])
  }),

  upgrades: Object.freeze({
    minimumLevel: 1,
    maximumLevel: 7,

    defaultCurrency: "coins",

    levelPrices: [
      0,
      500,
      1000,
      2000,
      3500,
      5500,
      8000
    ],

    diamondUpgradeEnabled: false
  }),

  startingInventory: Object.freeze({
    pieceCollection: "classic-heritage",
    boardCollection: "classic-heritage",
    table: "royal-starter-table",
    environment: "royal-starter-room",
    lighting: "classic-lighting"
  }),

  purchaseRules: Object.freeze({
    preventNegativeBalance: true,
    verifyItemOwnership: true,
    verifyItemPrice: true,
    preventDuplicateTransactions: true,
    serverAuthoritative: true,
    requireTransactionId: true
  }),

  economyLimits: Object.freeze({
    maximumCoins: 999999999,
    maximumDiamonds: 999999,
    maximumDailyLoginClaims: 1
  })

});

/* =========================================
   FILE END: config/economy-config.js
========================================= */
