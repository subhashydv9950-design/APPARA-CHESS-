
/* =========================================
   APPARA CHESS
   FILE: config/progression-config.js
   SECTION: CONFIG
========================================= */

export const PROGRESSION_CONFIG = Object.freeze({

  playerLevel: Object.freeze({
    minimumLevel: 1,
    maximumLevel: 100,
    startingLevel: 1,
    startingXP: 0,

    xpFormula: Object.freeze({
      baseXP: 100,
      growthPerLevel: 35,
      growthFactor: 1.12
    }),

    levelRewards: Object.freeze({
      coinsPerLevel: 100,
      bonusDiamonds: 0,
      specialRewards: true
    })
  }),

  xpRewards: Object.freeze({
    completedGame: 20,
    win: 40,
    draw: 20,
    loss: 10,
    puzzleSolved: 15,
    trainingCompleted: 25,
    dailyChallenge: 30,
    tournamentParticipation: 30,
    tournamentWin: 100
  }),

  dailyGoals: Object.freeze([
    {
      id: "play-one",
      title: "First Match",
      description: "Complete 1 chess game",
      target: 1,
      rewardXP: 25,
      rewardCoins: 50
    },
    {
      id: "play-three",
      title: "Chess Enthusiast",
      description: "Complete 3 chess games",
      target: 3,
      rewardXP: 50,
      rewardCoins: 100
    },
    {
      id: "solve-puzzles",
      title: "Puzzle Master",
      description: "Solve 3 chess puzzles",
      target: 3,
      rewardXP: 40,
      rewardCoins: 75
    },
    {
      id: "win-one",
      title: "Victory",
      description: "Win 1 chess game",
      target: 1,
      rewardXP: 50,
      rewardCoins: 100
    }
  ]),

  achievements: Object.freeze([
    {
      id: "first-game",
      title: "First Move",
      description: "Complete your first chess game",
      category: "games",
      target: 1,
      rewardXP: 50,
      rewardCoins: 100
    },
    {
      id: "first-win",
      title: "First Victory",
      description: "Win your first chess game",
      category: "wins",
      target: 1,
      rewardXP: 75,
      rewardCoins: 150
    },
    {
      id: "ten-wins",
      title: "Rising Champion",
      description: "Win 10 chess games",
      category: "wins",
      target: 10,
      rewardXP: 150,
      rewardCoins: 300
    },
    {
      id: "hundred-games",
      title: "Dedicated Player",
      description: "Complete 100 chess games",
      category: "games",
      target: 100,
      rewardXP: 300,
      rewardCoins: 500
    },
    {
      id: "puzzle-expert",
      title: "Puzzle Explorer",
      description: "Solve 50 chess puzzles",
      category: "puzzles",
      target: 50,
      rewardXP: 200,
      rewardCoins: 350
    },
    {
      id: "tournament-winner",
      title: "Royal Champion",
      description: "Win a tournament",
      category: "tournaments",
      target: 1,
      rewardXP: 500,
      rewardCoins: 1000
    }
  ]),

  streaks: Object.freeze({
    enabled: true,
    dailyLogin: true,
    dailyGoal: true,
    maximumTrackedDays: 365
  }),

  antiAbuse: Object.freeze({
    preventDuplicateRewards: true,
    validateRewardsOnServer: true,
    rejectNegativeXP: true,
    rejectNegativeLevel: true
  })

});

/**
 * XP required to move from the given level
 * to the next level.
 *
 * Level 1 -> 2 uses level 1.
 */
export function getXPRequiredForNextLevel(level) {
  const safeLevel = Math.floor(Number(level));

  if (
    !Number.isFinite(safeLevel) ||
    safeLevel < PROGRESSION_CONFIG.playerLevel.minimumLevel ||
    safeLevel >= PROGRESSION_CONFIG.playerLevel.maximumLevel
  ) {
    return 0;
  }

  const formula = PROGRESSION_CONFIG.playerLevel.xpFormula;

  const requiredXP =
    formula.baseXP *
    Math.pow(formula.growthFactor, safeLevel - 1) +
    formula.growthPerLevel * (safeLevel - 1);

  return Math.ceil(requiredXP);
}

/* =========================================
   FILE END: config/progression-config.js
========================================= */
