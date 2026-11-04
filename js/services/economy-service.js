// ============================================================
// APPARA CHESS — ECONOMY SERVICE
// FILE 40 — COMPLETE
// ============================================================

export const ECONOMY_EVENTS = Object.freeze({
    COINS_CHANGED: "coinsChanged",
    DIAMONDS_CHANGED: "diamondsChanged",
    PURCHASE_COMPLETED: "purchaseCompleted",
    REWARD_CLAIMED: "rewardClaimed",
    TRANSACTION_FAILED: "transactionFailed"
});

export const CURRENCY_TYPES = Object.freeze({
    COINS: "coins",
    DIAMONDS: "diamonds"
});

export const ECONOMY_CONFIG = Object.freeze({
    startingCoins: 2500,
    startingDiamonds: 0,
    maxBalance: 999999999,
    dailyCoins: 100,
    dailyXP: 50
});

export class EconomyService {
    constructor(options = {}) {
        this.options = {
            ...ECONOMY_CONFIG,
            ...options
        };

        this.playerService = options.playerService || null;
        this.firebase = options.firebaseService || null;

        this.listeners = new Map();
        this.initialized = false;
        this.disposed = false;
        this.lastError = null;
    }

    // ========================================================
    // INITIALIZE
    // ========================================================

    initialize({
        playerService = this.playerService,
        firebaseService = this.firebase
    } = {}) {
        this.ensureActive();

        if (!playerService || !playerService.getProfile()) {
            throw new Error("Loaded PlayerService is required.");
        }

        this.playerService = playerService;
        this.firebase = firebaseService;
        this.initialized = true;

        return this.getBalance();
    }

    // ========================================================
    // GET BALANCE
    // ========================================================

    getBalance() {
        this.ensureInitialized();

        const profile = this.playerService.getProfile();

        return {
            coins: Number(profile.coins) || 0,
            diamonds: Number(profile.diamonds) || 0
        };
    }

    getCoins() {
        return this.getBalance().coins;
    }

    getDiamonds() {
        return this.getBalance().diamonds;
    }

    // ========================================================
    // VALIDATE CURRENCY
    // ========================================================

    validateCurrency(currency) {
        if (!Object.values(CURRENCY_TYPES).includes(currency)) {
            throw new Error("Invalid currency type.");
        }
    }

    // ========================================================
    // ADD CURRENCY
    // ========================================================

    async addCurrency(amount, currency = CURRENCY_TYPES.COINS, reason = "reward") {
        this.ensureInitialized();
        this.validateCurrency(currency);

        const value = Math.floor(Number(amount));

        if (!Number.isFinite(value) || value <= 0) {
            throw new Error("Amount must be a positive number.");
        }

        const profile = this.playerService.getProfile();
        const previous = Number(profile[currency]) || 0;

        const updated = Math.min(
            this.options.maxBalance,
            previous + value
        );

        profile[currency] = updated;

        await this.playerService.saveProfile();

        const payload = {
            currency,
            previous,
            current: updated,
            amount: updated - previous,
            reason
        };

        this.emit(
            currency === CURRENCY_TYPES.COINS
                ? ECONOMY_EVENTS.COINS_CHANGED
                : ECONOMY_EVENTS.DIAMONDS_CHANGED,
            payload
        );

        return payload;
    }

    // ========================================================
    // SPEND CURRENCY
    // ========================================================

    async spendCurrency(amount, currency = CURRENCY_TYPES.COINS, reason = "purchase") {
        this.ensureInitialized();
        this.validateCurrency(currency);

        const value = Math.floor(Number(amount));

        if (!Number.isFinite(value) || value <= 0) {
            throw new Error("Amount must be a positive number.");
        }

        const profile = this.playerService.getProfile();
        const previous = Number(profile[currency]) || 0;

        if (previous < value) {
            const error = new Error(`Not enough ${currency}.`);

            this.emit(ECONOMY_EVENTS.TRANSACTION_FAILED, {
                currency,
                amount: value,
                reason,
                message: error.message
            });

            throw error;
        }

        profile[currency] = previous - value;

        await this.playerService.saveProfile();

        const payload = {
            currency,
            previous,
            current: profile[currency],
            amount: value,
            reason
        };

        this.emit(
            currency === CURRENCY_TYPES.COINS
                ? ECONOMY_EVENTS.COINS_CHANGED
                : ECONOMY_EVENTS.DIAMONDS_CHANGED,
            payload
        );

        return payload;
    }

    // ========================================================
    // ADD COINS
    // ========================================================

    async addCoins(amount, reason = "reward") {
        return this.addCurrency(
            amount,
            CURRENCY_TYPES.COINS,
            reason
        );
    }

    // ========================================================
    // ADD DIAMONDS
    // ========================================================

    async addDiamonds(amount, reason = "reward") {
        return this.addCurrency(
            amount,
            CURRENCY_TYPES.DIAMONDS,
            reason
        );
    }

    // ========================================================
    // SPEND COINS
    // ========================================================

    async spendCoins(amount, reason = "purchase") {
        return this.spendCurrency(
            amount,
            CURRENCY_TYPES.COINS,
            reason
        );
    }

    // ========================================================
    // SPEND DIAMONDS
    // ========================================================

    async spendDiamonds(amount, reason = "purchase") {
        return this.spendCurrency(
            amount,
            CURRENCY_TYPES.DIAMONDS,
            reason
        );
    }

    // ========================================================
    // PURCHASE ITEM
    // ========================================================

    async purchaseItem({
        itemId,
        price,
        currency = CURRENCY_TYPES.COINS,
        category = "general"
    } = {}) {
        this.ensureInitialized();

        if (!itemId || typeof itemId !== "string") {
            throw new Error("Valid item ID is required.");
        }

        this.validateCurrency(currency);

        const cost = Math.floor(Number(price));

        if (!Number.isFinite(cost) || cost <= 0) {
            throw new Error("Invalid item price.");
        }

        const profile = this.playerService.getProfile();

        if (!profile.purchases) {
            profile.purchases = [];
        }

        const alreadyOwned = profile.purchases.some(
            item => item.itemId === itemId
        );

        if (alreadyOwned) {
            throw new Error("This item is already owned.");
        }

        const balance = Number(profile[currency]) || 0;

        if (balance < cost) {
            throw new Error(`Not enough ${currency}.`);
        }

        // Client-side prototype only.
        // Production purchases must be verified by a trusted backend.

        profile[currency] = balance - cost;

        profile.purchases.push({
            itemId,
            category,
            purchasedAt: Date.now(),
            currency,
            price: cost
        });

        await this.playerService.saveProfile();

        const payload = {
            itemId,
            category,
            currency,
            price: cost,
            balance: profile[currency]
        };

        this.emit(ECONOMY_EVENTS.PURCHASE_COMPLETED, payload);

        this.emit(
            currency === CURRENCY_TYPES.COINS
                ? ECONOMY_EVENTS.COINS_CHANGED
                : ECONOMY_EVENTS.DIAMONDS_CHANGED,
            {
                currency,
                current: profile[currency],
                amount: -cost,
                reason: "purchase"
            }
        );

        return payload;
    }

    // ========================================================
    // DAILY REWARD
    // ========================================================

    async claimDailyReward() {
        this.ensureInitialized();

        const profile = this.playerService.getProfile();
        const today = new Date().toISOString().slice(0, 10);

        if (profile.dailyEconomyRewardDate === today) {
            throw new Error("Daily reward already claimed.");
        }

        const previous = Number(profile.coins) || 0;

        profile.coins = Math.min(
            this.options.maxBalance,
            previous + this.options.dailyCoins
        );

        profile.dailyEconomyRewardDate = today;

        await this.playerService.saveProfile();

        const payload = {
            coins: profile.coins - previous,
            date: today
        };

        this.emit(ECONOMY_EVENTS.REWARD_CLAIMED, payload);

        this.emit(ECONOMY_EVENTS.COINS_CHANGED, {
            previous,
            current: profile.coins,
            amount: payload.coins,
            reason: "daily_reward"
        });

        return payload;
    }

    // ========================================================
    // TRANSACTION HISTORY
    // ========================================================

    getPurchaseHistory() {
        this.ensureInitialized();

        const profile = this.playerService.getProfile();

        return [...(profile.purchases || [])]
            .sort((a, b) => b.purchasedAt - a.purchasedAt);
    }

    // ========================================================
    // CHECK AFFORDABILITY
    // ========================================================

    canAfford(amount, currency = CURRENCY_TYPES.COINS) {
        this.ensureInitialized();
        this.validateCurrency(currency);

        const value = Number(amount);

        if (!Number.isFinite(value) || value < 0) {
            return false;
        }

        return this.getBalance()[currency] >= value;
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
                    `[EconomyService] ${eventName}:`,
                    error
                );
            }
        }
    }

    // ========================================================
    // GUARDS
    // ========================================================

    ensureActive() {
        if (this.disposed) {
            throw new Error("EconomyService has been disposed.");
        }
    }

    ensureInitialized() {
        this.ensureActive();

        if (!this.initialized || !this.playerService) {
            throw new Error("EconomyService is not initialized.");
        }
    }

    // ========================================================
    // DISPOSE
    // ========================================================

    dispose() {
        if (this.disposed) return;

        this.listeners.clear();
        this.playerService = null;
        this.firebase = null;
        this.initialized = false;
        this.disposed = true;
    }
}

// ============================================================
// FACTORY
// ============================================================

export function createEconomyService(options = {}) {
    return new EconomyService(options);
}

// ============================================================
// FILE 40 END — COMPLETE
// ============================================================
