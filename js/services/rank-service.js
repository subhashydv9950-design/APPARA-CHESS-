// ============================================================
// APPARA CHESS — RANK SERVICE
// FILE 62 — COMPLETE
// PATH: js/services/rank-service.js
// ============================================================

export const RANK_EVENTS = Object.freeze({
    RATING_UPDATED: "ratingUpdated",
    RANK_CHANGED: "rankChanged",
    SEASON_UPDATED: "seasonUpdated",
    ERROR: "rankError"
});

export const RANK_TIERS = Object.freeze([
    { id: "bronze", name: "Bronze", minRating: 0, maxRating: 799, color: "#CD7F32", divisions: ["III", "II", "I"] },
    { id: "silver", name: "Silver", minRating: 800, maxRating: 999, color: "#C0C0C0", divisions: ["III", "II", "I"] },
    { id: "gold", name: "Gold", minRating: 1000, maxRating: 1199, color: "#FFD700", divisions: ["III", "II", "I"] },
    { id: "platinum", name: "Platinum", minRating: 1200, maxRating: 1399, color: "#70D6CE", divisions: ["III", "II", "I"] },
    { id: "diamond", name: "Diamond", minRating: 1400, maxRating: 1599, color: "#55C9FF", divisions: ["III", "II", "I"] },
    { id: "master", name: "Master", minRating: 1600, maxRating: 1799, color: "#A78BFA", divisions: ["III", "II", "I"] },
    { id: "elite", name: "Elite", minRating: 1800, maxRating: 1999, color: "#FF6B9D", divisions: ["III", "II", "I"] },
    { id: "champion", name: "Champion", minRating: 2000, maxRating: 2199, color: "#FF9F43", divisions: ["III", "II", "I"] },
    { id: "mythic", name: "Mythic", minRating: 2200, maxRating: 2399, color: "#C084FC", divisions: ["III", "II", "I"] },
    { id: "royal_legend", name: "Royal Legend", minRating: 2400, maxRating: Infinity, color: "#F5D76E", divisions: ["LEGEND"] }
]);

export const RATING_MODES = Object.freeze([
    "bullet",
    "blitz",
    "rapid",
    "classical"
]);

export const RANK_CONFIG = Object.freeze({
    startingRating: 1000,
    minimumRating: 0,
    maximumRating: 4000,
    kFactor: 32,
    provisionalGames: 10,
    seasonLengthDays: 30
});

export class RankService {
    constructor(options = {}) {
        this.options = {
            ...RANK_CONFIG,
            ...options
        };

        this.playerService = options.playerService || null;

        // Optional provider can later connect a trusted
        // backend leaderboard without changing the screen.
        this.leaderboardProvider =
            typeof options.leaderboardProvider === "function"
                ? options.leaderboardProvider
                : null;

        this.listeners = new Map();
        this.initialized = false;
        this.disposed = false;
        this.lastError = null;
    }

    // --------------------------------------------------------
    // INITIALIZE
    // --------------------------------------------------------

    initialize(playerService = this.playerService) {
        this.ensureActive();

        if (
            !playerService ||
            typeof playerService.getProfile !== "function" ||
            !playerService.getProfile()
        ) {
            throw new Error("Loaded PlayerService is required.");
        }

        this.playerService = playerService;
        this.initialized = true;

        return this.getAllRankings();
    }

    // --------------------------------------------------------
    // RANK CALCULATION
    // --------------------------------------------------------

    getRank(rating) {
        const value = Math.max(
            0,
            Math.floor(Number(rating) || 0)
        );

        const tier = RANK_TIERS.find(item =>
            value >= item.minRating &&
            value <= item.maxRating
        ) || RANK_TIERS[0];

        const divisionIndex = tier.divisions.length === 1
            ? 0
            : Math.min(
                2,
                Math.floor(
                    ((value - tier.minRating) /
                    (tier.maxRating - tier.minRating + 1)) * 3
                )
            );

        return {
            id: tier.id,
            name: tier.name,
            division: tier.divisions[divisionIndex],
            color: tier.color,
            minRating: tier.minRating,
            maxRating: tier.maxRating,
            rating: value
        };
    }

    getCurrentRank(mode = "blitz") {
        this.ensureInitialized();

        return this.getRank(
            this.playerService.getRating(mode)
        );
    }

    getAllRankings() {
        this.ensureInitialized();

        const ratings = this.playerService.getAllRatings();
        const result = {};

        for (const mode of RATING_MODES) {
            result[mode] = {
                rating: Number(ratings[mode]) || this.options.startingRating,
                rank: this.getRank(ratings[mode])
            };
        }

        return result;
    }

    // --------------------------------------------------------
    // LEADERBOARD
    // --------------------------------------------------------

    async getLeaderboard({
        mode = "overall",
        period = "all-time",
        limit = 100
    } = {}) {
        this.ensureInitialized();

        const validModes = [
            "overall",
            ...RATING_MODES
        ];

        const validPeriods = [
            "all-time",
            "monthly",
            "weekly"
        ];

        if (!validModes.includes(mode)) {
            throw new Error("Invalid leaderboard mode.");
        }

        if (!validPeriods.includes(period)) {
            throw new Error("Invalid leaderboard period.");
        }

        const safeLimit = Math.min(
            100,
            Math.max(1, Math.floor(Number(limit) || 100))
        );

        // A real global leaderboard must come from a
        // trusted backend. Use the provider when configured.
        if (this.leaderboardProvider) {
            const result = await this.leaderboardProvider({
                mode,
                period,
                limit: safeLimit
            });

            const players = Array.isArray(result)
                ? result
                : result?.players;

            if (!Array.isArray(players)) {
                throw new Error(
                    "Leaderboard provider returned invalid data."
                );
            }

            return players
                .map(player => this.normalizeLeaderboardPlayer(player, mode))
                .sort((a, b) => b.rating - a.rating)
                .slice(0, safeLimit);
        }

        // Offline fallback: show only the current player.
        // This is deliberately NOT presented as global data.
        const profile = this.playerService.getProfile();

        if (!profile) return [];

        const ratings = profile.ratings || {};

        const rating = mode === "overall"
            ? Math.round(
                RATING_MODES.reduce(
                    (sum, key) => sum + (Number(ratings[key]) || this.options.startingRating),
                    0
                ) / RATING_MODES.length
            )
            : Number(ratings[mode]) || this.options.startingRating;

        return [{
            playerId: profile.playerId || profile.uid || "local-player",
            displayName: profile.displayName || "Chess Player",
            rating,
            isCurrentPlayer: true,
            isLocalPreview: true,
            rank: this.getRank(rating)
        }];
    }

    normalizeLeaderboardPlayer(player = {}, mode = "blitz") {
        const ratings = player.ratings || {};

        const rating = mode === "overall"
            ? Number(
                player.rating ??
                RATING_MODES.reduce(
                    (sum, key) => sum + (Number(ratings[key]) || 0),
                    0
                ) / RATING_MODES.length
            )
            : Number(
                player.rating ??
                ratings[mode] ??
                player.elo ??
                0
            );

        return {
            playerId: String(
                player.playerId || player.uid || player.id || ""
            ),
            displayName: String(
                player.displayName || player.name || "Chess Player"
            ),
            rating: Math.max(0, Math.floor(rating || 0)),
            rank: this.getRank(rating),
            country: String(player.country || ""),
            avatar: String(player.avatar || "")
        };
    }

    // --------------------------------------------------------
    // ELO
    // --------------------------------------------------------

    getExpectedScore(playerRating, opponentRating) {
        return 1 / (
            1 + Math.pow(
                10,
                (opponentRating - playerRating) / 400
            )
        );
    }

    calculateNewRating(
        playerRating,
        opponentRating,
        score,
        kFactor = this.options.kFactor
    ) {
        const actualScore = Number(score);

        if (![0, 0.5, 1].includes(actualScore)) {
            throw new Error("Score must be 0, 0.5 or 1.");
        }

        const player = Number(playerRating);
        const opponent = Number(opponentRating);

        if (
            !Number.isFinite(player) ||
            !Number.isFinite(opponent)
        ) {
            throw new Error("Invalid rating values.");
        }

        const expected = this.getExpectedScore(
            player,
            opponent
        );

        const updated = Math.round(
            player + kFactor * (actualScore - expected)
        );

        return Math.max(
            this.options.minimumRating,
            Math.min(this.options.maximumRating, updated)
        );
    }

    // --------------------------------------------------------
    // APPLY GAME RESULT
    // --------------------------------------------------------

    async applyGameResult({
        mode = "blitz",
        opponentRating,
        result
    } = {}) {
        this.ensureInitialized();

        if (!RATING_MODES.includes(mode)) {
            throw new Error("Invalid rating mode.");
        }

        if (!["win", "draw", "loss"].includes(result)) {
            throw new Error("Invalid match result.");
        }

        const opponent = Number(opponentRating);

        if (!Number.isFinite(opponent) || opponent < 0) {
            throw new Error("Invalid opponent rating.");
        }

        const profile = this.playerService.getProfile();
        const oldRating = this.playerService.getRating(mode);

        const score = result === "win"
            ? 1
            : result === "draw"
                ? 0.5
                : 0;

        if (!profile.ratingGames) {
            profile.ratingGames = {};
        }

        const gamesPlayed = Number(
            profile.ratingGames[mode] || 0
        );

        const kFactor = gamesPlayed < this.options.provisionalGames
            ? 40
            : this.options.kFactor;

        const newRating = this.calculateNewRating(
            oldRating,
            opponent,
            score,
            kFactor
        );

        const oldRank = this.getRank(oldRating);
        const newRank = this.getRank(newRating);

        if (!profile.ratings) {
            profile.ratings = {};
        }

        profile.ratings[mode] = newRating;
        profile.ratingGames[mode] = gamesPlayed + 1;

        await this.playerService.saveProfile();

        const payload = {
            mode,
            result,
            oldRating,
            newRating,
            ratingChange: newRating - oldRating,
            oldRank,
            newRank,
            gamesPlayed: gamesPlayed + 1
        };

        this.emit(RANK_EVENTS.RATING_UPDATED, payload);

        if (
            oldRank.id !== newRank.id ||
            oldRank.division !== newRank.division
        ) {
            this.emit(RANK_EVENTS.RANK_CHANGED, payload);
        }

        return payload;
    }

    // --------------------------------------------------------
    // RANK PROGRESS
    // --------------------------------------------------------

    getRankProgress(mode = "blitz") {
        this.ensureInitialized();

        const rating = this.playerService.getRating(mode);
        const current = this.getRank(rating);

        const nextTier = RANK_TIERS.find(
            tier => tier.minRating > rating
        );

        if (!nextTier) {
            return {
                current,
                nextRank: null,
                pointsRemaining: 0,
                percentage: 100
            };
        }

        const range = nextTier.minRating - current.minRating;
        const progress = rating - current.minRating;

        return {
            current,
            nextRank: {
                id: nextTier.id,
                name: nextTier.name,
                minRating: nextTier.minRating,
                color: nextTier.color
            },
            pointsRemaining: nextTier.minRating - rating,
            percentage: Math.max(
                0,
                Math.min(100, (progress / range) * 100)
            )
        };
    }

    // --------------------------------------------------------
    // SEASON
    // --------------------------------------------------------

    getSeasonInfo() {
        const now = new Date();
        const length = this.options.seasonLengthDays;
        const duration = length * 24 * 60 * 60 * 1000;

        const seasonNumber = Math.floor(
            now.getTime() / duration
        );

        const start = new Date(seasonNumber * duration);
        const end = new Date(start.getTime() + duration);

        return {
            seasonId: `season-${seasonNumber}`,
            seasonNumber,
            startAt: start.getTime(),
            endAt: end.getTime(),
            remainingMilliseconds: Math.max(
                0,
                end.getTime() - now.getTime()
            )
        };
    }

    // --------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------

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

        if (!group) return false;

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
                    `[RankService] ${eventName}:`,
                    error
                );
            }
        }
    }

    // --------------------------------------------------------
    // GUARDS
    // --------------------------------------------------------

    ensureActive() {
        if (this.disposed) {
            throw new Error("RankService has been disposed.");
        }
    }

    ensureInitialized() {
        this.ensureActive();

        if (!this.initialized || !this.playerService) {
            throw new Error("RankService is not initialized.");
        }
    }

    // --------------------------------------------------------
    // DISPOSE
    // --------------------------------------------------------

    dispose() {
        if (this.disposed) return;

        this.listeners.clear();
        this.playerService = null;
        this.leaderboardProvider = null;
        this.initialized = false;
        this.disposed = true;
    }
}

// ------------------------------------------------------------
// FACTORY
// ------------------------------------------------------------

export function createRankService(options = {}) {
    return new RankService(options);
}

// ============================================================
// FILE 62 END — COMPLETE
// ============================================================
