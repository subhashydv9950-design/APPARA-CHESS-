
/* =========================================
   APPARA CHESS
   FILE: config/rank-config.js
   SECTION: CONFIG
========================================= */

export const RANK_CONFIG = Object.freeze({

  divisions: Object.freeze([
    "III",
    "II",
    "I"
  ]),

  tiers: Object.freeze([
    {
      id: "bronze",
      name: "Bronze",
      minRating: 0,
      maxRating: 799,
      color: "#CD7F32",
      divisions: true
    },
    {
      id: "silver",
      name: "Silver",
      minRating: 800,
      maxRating: 999,
      color: "#C0C0C0",
      divisions: true
    },
    {
      id: "gold",
      name: "Gold",
      minRating: 1000,
      maxRating: 1199,
      color: "#FFD700",
      divisions: true
    },
    {
      id: "platinum",
      name: "Platinum",
      minRating: 1200,
      maxRating: 1399,
      color: "#8DE0E8",
      divisions: true
    },
    {
      id: "diamond",
      name: "Diamond",
      minRating: 1400,
      maxRating: 1599,
      color: "#55C8FF",
      divisions: true
    },
    {
      id: "master",
      name: "Master",
      minRating: 1600,
      maxRating: 1799,
      color: "#9B7BFF",
      divisions: true
    },
    {
      id: "elite",
      name: "Elite",
      minRating: 1800,
      maxRating: 1999,
      color: "#FF65C5",
      divisions: true
    },
    {
      id: "champion",
      name: "Champion",
      minRating: 2000,
      maxRating: 2199,
      color: "#FF754F",
      divisions: true
    },
    {
      id: "mythic",
      name: "Mythic",
      minRating: 2200,
      maxRating: 2399,
      color: "#B58CFF",
      divisions: true
    },
    {
      id: "royal-legend",
      name: "Royal Legend",
      minRating: 2400,
      maxRating: null,
      color: "#FFE7A0",
      divisions: false
    }
  ]),

  rating: Object.freeze({
    startingRating: 1000,
    minimumRating: 0,
    provisional: true,
    provisionalGames: null,
    kFactor: Object.freeze({
      provisional: 40,
      normal: 24,
      highRating: 16
    })
  }),

  gameModes: Object.freeze([
    {
      id: "bullet",
      name: "Bullet",
      separateRating: true
    },
    {
      id: "blitz",
      name: "Blitz",
      separateRating: true
    },
    {
      id: "rapid",
      name: "Rapid",
      separateRating: true
    },
    {
      id: "classical",
      name: "Classical",
      separateRating: true
    }
  ]),

  matchmaking: Object.freeze({
    initialRatingRange: 100,
    ratingRangeExpansion: 50,
    expansionIntervalSeconds: 10,
    maximumSearchSeconds: 90,
    preferSameRegion: true,
    requireSameGameMode: true
  }),

  results: Object.freeze({
    win: 1,
    draw: 0.5,
    loss: 0
  }),

  leaderboard: Object.freeze({
    categories: [
      "global",
      "friends",
      "weekly",
      "monthly"
    ],
    defaultCategory: "global",
    pageSize: 50
  })

});

/* =========================================
   FILE END: config/rank-config.js
========================================= */
