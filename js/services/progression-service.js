// ============================================================
// APPARA CHESS — PROGRESSION SERVICE
// FILE 38 — COMPLETE
// ============================================================

export const PROGRESSION_EVENTS = Object.freeze({
    XP_ADDED: "xpAdded",
    LEVEL_UP: "levelUp",
    PROGRESS_UPDATED: "progressUpdated",
    ACHIEVEMENT_UNLOCKED: "achievementUnlocked",
    DAILY_REWARD_CLAIMED: "dailyRewardClaimed",
    ERROR: "progressionError"
});

export const PROGRESSION_CONFIG = Object.freeze({
    maxLevel: 100,
    baseXP: 100,
    growthRate: 1.22,
    maxLevelXP: 1000000
});

export const ACHIEVEMENTS = Object.freeze([
    {
        id: "first_game",
        name: "First Move",
        description: "Complete your first chess game.",
        xp: 50
    },
    {
        id: "first_win",
        name: "First Victory",
        description: "Win your first chess game.",
        xp: 100
    },
    {
        id: "ten_wins",
        name: "Rising Champion",
        description: "Win 10 chess games.",
        xp: 250
    },
    {
        id: "fifty_games",
        name: "Dedicated Player",
        description: "Play 50 chess games.",
        xp: 500
    },
    {
        id: "hundred_games",
        name: "Chess Enthusiast",
        description: "Play 100 chess games.",
        xp: 1000
    },
    {
        id: "win_streak_5",
        name: "Unstoppable",
        description: "Win 5 games in a row.",
        xp: 300
    },
    {
        id: "win_streak_10",
        name: "Legendary Streak",
        description: "Win 10 games in a row.",
        xp: 750
    },
    {
        id: "level_10",
        name: "Experienced",
        description: "Reach player level 10.",
        xp: 250
    },
    {
        id: "level_25",
        name: "Master Explorer",
        description: "Reach player level 25.",
        xp: 500
    },
    {
        id: "level_50",
        name: "Royal Master",
        description: "Reach player level 50.",
        xp: 1000
    },
    {
        id: "level_100",
        name: "Royal Legend",
        description: "Reach player level 100.",
        xp: 5000
    }
]);

export class ProgressionService {
    constructor(options = {}) {
        this.options = {
            maxLevel: PROGRESSION_CONFIG.maxLevel,
            baseXP: PROGRESSION_CONFIG.baseXP,
            growthRate: PROGRESSION_CONFIG.growthRate,
            ...options
        };

        this.playerService = options.playerService || null;

        this.listeners = new Map();
        this.achievements = new Set();

        this.initialized = false;
        this.disposed = false;

        this.lastError = null;
    }

    // ========================================================
    // INITIALIZE
    // ========================================================

    initialize(playerService = this.playerService) {
        this.ensureActive();

        if (!playerService) {
            throw new Error("PlayerService is required.");
        }

        if (!playerService.getProfile()) {
            throw new Error("Player profile must be loaded first.");
        }

        this.playerService = playerService;
        this.initialized = true;

        return this.getProgress();
    }

    // ========================================================
    // XP REQUIRED FOR LEVEL
    // ========================================================

    getXPRequired(level) {
        const safeLevel = Math.max(
            1,
            Math.min(this.options.maxLevel, Number(level) || 1)
        );

        return Math.floor(
            this.options.baseXP *
            Math.pow(this.options.growthRate, safeLevel - 1)
        );
    }

    // ========================================================
    // XP TO NEXT LEVEL
    // ========================================================

    getXPToNextLevel() {
        this.ensureInitialized();

        const profile = this.playerService.getProfile();

        if (profile.level >= this.options.maxLevel) {
            return 0;
        }

        return Math.max(
            0,
            this.getXPRequired(profile.level) - profile.xp
        );
    }

    // ========================================================
    // ADD XP
    // ========================================================

    async addXP(amount, reason = "game_reward") {
        this.ensureInitialized();

        const xp = Math.floor(Number(amount));

        if (!Number.isFinite(xp) || xp <= 0) {
            throw new Error("XP amount must be a positive number.");
        }

        const profile = this.playerService.getProfile();

        if (profile.level >= this.options.maxLevel) {
            return {
                added: 0,
                level: profile.level,
                maxLevelReached: true
            };
        }

        const previousLevel = profile.level;

        profile.xp += xp;

        let levelsGained = 0;

        while (
            profile.level < this.options.maxLevel &&
            profile.xp >= this.getXPRequired(profile.level)
        ) {
            profile.xp -= this.getXPRequired(profile.level);
            profile.level += 1;
            levelsGained += 1;
        }

        if (profile.level >= this.options.maxLevel) {
            profile.level = this.options.maxLevel;
            profile.xp = Math.min(
                profile.xp,
                PROGRESSION_CONFIG.maxLevelXP
            );
        }

        await this.playerService.saveProfile();

        const result = {
            added: xp,
            reason,
            previousLevel,
            currentLevel: profile.level,
            levelsGained,
            remainingXP: profile.xp,
            nextLevelXP: this.getXPRequired(profile.level)
        };

        this.emit(PROGRESSION_EVENTS.XP_ADDED, result);

        this.emit(PROGRESSION_EVENTS.PROGRESS_UPDATED, {
            progress: this.getProgress()
        });

        if (levelsGained > 0) {
            this.emit(PROGRESSION_EVENTS.LEVEL_UP, result);

            await this.checkLevelAchievements(profile.level);
        }

        return result;
    }

    // ========================================================
    // PROGRESS INFORMATION
    // ========================================================

    getProgress() {
        this.ensureInitialized();

        const profile = this.playerService.getProfile();

        const requiredXP = profile.level >= this.options.maxLevel
            ? 0
            : this.getXPRequired(profile.level);

        const percentage = requiredXP > 0
            ? Math.min(100, (profile.xp / requiredXP) * 100)
            : 100;

        return {
            level: profile.level,
            xp: profile.xp,
            requiredXP,
            xpToNextLevel: Math.max(0, requiredXP - profile.xp),
            percentage: Number(percentage.toFixed(2)),
            maxLevel: this.options.maxLevel,
            isMaxLevel: profile.level >= this.options.maxLevel
        };
    }

    // ========================================================
    // GAME REWARD
    // ========================================================

    async rewardGame(result, options = {}) {
        this.ensureInitialized();

        const rewards = {
            win: 50,
            draw: 25,
            loss: 10
        };

        if (!Object.prototype.hasOwnProperty.call(rewards, result)) {
            throw new Error("Invalid game result.");
        }

        const multiplier = Math.max(
            1,
            Math.min(3, Number(options.multiplier) || 1)
        );

        const xp = Math.floor(rewards[result] * multiplier);

        const rewardResult = await this.addXP(
            xp,
            `game_${result}`
        );

        await this.checkGameAchievements();

        return rewardResult;
    }

    // ========================================================
    // ACHIEVEMENT CHECKS
    // ========================================================

    async checkGameAchievements() {
        this.ensureInitialized();

        const profile = this.playerService.getProfile();
        const stats = profile.stats;

        const checks = {
            first_game: stats.gamesPlayed >= 1,
            first_win: stats.wins >= 1,
            ten_wins: stats.wins >= 10,
            fifty_games: stats.gamesPlayed >= 50,
            hundred_games: stats.gamesPlayed >= 100,
            win_streak_5: stats.currentWinStreak >= 5,
            win_streak_10: stats.currentWinStreak >= 10
        };

        for (const achievement of ACHIEVEMENTS) {
            if (checks[achievement.id]) {
                await this.unlockAchievement(achievement.id);
            }
        }
    }

    async checkLevelAchievements(level) {
        const checks = {
            level_10: level >= 10,
            level_25: level >= 25,
            level_50: level >= 50,
            level_100: level >= 100
        };

        for (const achievement of ACHIEVEMENTS) {
            if (checks[achievement.id]) {
                await this.unlockAchievement(achievement.id);
            }
        }
    }

    // ========================================================
    // UNLOCK ACHIEVEMENT
    // ========================================================

    async unlockAchievement(achievementId) {
        this.ensureInitialized();

        const achievement = ACHIEVEMENTS.find(
            item => item.id === achievementId
        );

        if (!achievement) {
            throw new Error("Achievement not found.");
        }

        const profile = this.playerService.getProfile();

        if (!profile.achievements) {
            profile.achievements = [];
        }

        const alreadyUnlocked = profile.achievements.some(
            item => item.id === achievementId
        );

        if (alreadyUnlocked) {
            return false;
        }

        profile.achievements.push({
            id: achievement.id,
            name: achievement.name,
            unlockedAt: Date.now()
        });

        this.achievements.add(achievementId);

        await this.playerService.saveProfile();

        this.emit(PROGRESSION_EVENTS.ACHIEVEMENT_UNLOCKED, {
            achievement
        });

        return true;
    }

    // ========================================================
    // ACHIEVEMENT LIST
    // ========================================================

    getAchievements() {
        this.ensureInitialized();

        const profile = this.playerService.getProfile();
        const unlocked = profile.achievements || [];

        return ACHIEVEMENTS.map(item => ({
            ...item,
            unlocked: unlocked.some(
                achievement => achievement.id === item.id
            )
        }));
    }

    // ========================================================
    // DAILY REWARD
    // ========================================================

    async claimDailyReward() {
        this.ensureInitialized();

        const profile = this.playerService.getProfile();

        const today = new Date().toISOString().slice(0, 10);

        if (profile.dailyRewardDate === today) {
            throw new Error("Today's reward has already been claimed.");
        }

        const reward = {
            xp: 50,
            coins: 100
        };

        await this.addXP(reward.xp, "daily_reward");

        profile.coins += reward.coins;
        profile.dailyRewardDate = today;

        await this.playerService.saveProfile();

        this.emit(PROGRESSION_EVENTS.DAILY_REWARD_CLAIMED, {
            reward,
            date: today
        });

        return reward;
    }

    // ========================================================
    // EVENT SYSTEM
    // ========================================================

    on(eventName, callback) {
        this.ensureActive();

        if (typeof callback !== "function") {
            throw new TypeError("Callback must be a function.");
        }

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }

        this.listeners.get(eventName).add(callback);

        return () => this.off(eventName, callback);
    }

    off(eventName, callback) {
        const group = this.listeners.get(eventName);

        if (!group) {
            return false;
        }

        const removed = group.delete(callback);

        if (group.size === 0) {
            this.listeners.delete(eventName);
        }

        return removed;
    }

    emit(eventName, payload = {}) {
        const group = this.listeners.get(eventName);

        if (!group) return;

        for (const callback of [...group]) {
            try {
                callback(payload);
            } catch (error) {
                console.error(
                    `[ProgressionService] ${eventName}:`,
                    error
                );
            }
        }
    }

    // ========================================================
    // ERROR HANDLING
    // ========================================================

    handleError(error) {
        this.lastError = {
            message: error?.message || "Progression error.",
            timestamp: Date.now()
        };

        this.emit(PROGRESSION_EVENTS.ERROR, {
            error: this.lastError
        });

        return error;
    }

    // ========================================================
    // GUARDS
    // ========================================================

    ensureActive() {
        if (this.disposed) {
            throw new Error("ProgressionService has been disposed.");
        }
    }

    ensureInitialized() {
        this.ensureActive();

        if (!this.initialized || !this.playerService) {
            throw new Error("ProgressionService is not initialized.");
        }
    }

    // ========================================================
    // DISPOSE
    // ========================================================

    dispose() {
        if (this.disposed) return;

        this.listeners.clear();
        this.achievements.clear();

        this.playerService = null;
        this.initialized = false;
        this.disposed = true;
    }
}

// ============================================================
// FACTORY
// ============================================================

export function createProgressionService(options = {}) {
    return new ProgressionService(options);
}

// ============================================================
// FILE 38 END — COMPLETE
// ============================================================
