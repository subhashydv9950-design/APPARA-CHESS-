// ============================================================
// APPARA CHESS — INVENTORY SERVICE
// FILE 41 — COMPLETE
// ============================================================

export const INVENTORY_EVENTS = Object.freeze({
    ITEM_UNLOCKED: "itemUnlocked",
    ITEM_EQUIPPED: "itemEquipped",
    ITEM_UPGRADED: "itemUpgraded",
    INVENTORY_UPDATED: "inventoryUpdated",
    ERROR: "inventoryError"
});

export const INVENTORY_CATEGORIES = Object.freeze([
    "boards",
    "pieces",
    "tables",
    "environments",
    "lighting",
    "effects",
    "frames",
    "avatars"
]);

export const UPGRADE_CONFIG = Object.freeze({
    maxLevel: 7,
    costMultiplier: 1.8
});

export class InventoryService {
    constructor(options = {}) {
        this.options = {
            ...UPGRADE_CONFIG,
            ...options
        };

        this.playerService = options.playerService || null;
        this.economyService = options.economyService || null;

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
        economyService = this.economyService
    } = {}) {
        this.ensureActive();

        if (!playerService || !playerService.getProfile()) {
            throw new Error("Loaded PlayerService is required.");
        }

        if (!economyService) {
            throw new Error("EconomyService is required.");
        }

        this.playerService = playerService;
        this.economyService = economyService;
        this.initialized = true;

        this.ensureInventoryStructure();

        return this.getInventory();
    }

    // ========================================================
    // INVENTORY STRUCTURE
    // ========================================================

    ensureInventoryStructure() {
        const profile = this.playerService.getProfile();

        if (!profile.inventory) {
            profile.inventory = {};
        }

        for (const category of INVENTORY_CATEGORIES) {
            if (!Array.isArray(profile.inventory[category])) {
                profile.inventory[category] = [];
            }
        }

        if (!profile.equipped) {
            profile.equipped = {
                board: "royal-classic",
                pieces: "royal-classic",
                table: "royal-classic",
                environment: "royal-palace",
                lighting: "royal-default",
                effects: "royal-default",
                frame: "default",
                avatar: "default"
            };
        }

        if (!profile.itemLevels) {
            profile.itemLevels = {};
        }
    }

    // ========================================================
    // GET INVENTORY
    // ========================================================

    getInventory() {
        this.ensureInitialized();

        const profile = this.playerService.getProfile();

        return structuredClone(profile.inventory);
    }

    getEquippedItems() {
        this.ensureInitialized();

        const profile = this.playerService.getProfile();

        return { ...profile.equipped };
    }

    // ========================================================
    // CHECK OWNERSHIP
    // ========================================================

    ownsItem(category, itemId) {
        this.ensureInitialized();
        this.validateCategory(category);

        const profile = this.playerService.getProfile();

        return profile.inventory[category].includes(itemId);
    }

    // ========================================================
    // UNLOCK ITEM
    // ========================================================

    async unlockItem(category, itemId, price, currency = "coins") {
        this.ensureInitialized();
        this.validateCategory(category);

        if (!itemId || typeof itemId !== "string") {
            throw new Error("Valid item ID is required.");
        }

        if (this.ownsItem(category, itemId)) {
            throw new Error("Item is already unlocked.");
        }

        const profile = this.playerService.getProfile();

        await this.economyService.purchaseItem({
            itemId,
            price,
            currency,
            category
        });

        profile.inventory[category].push(itemId);

        await this.playerService.saveProfile();

        this.emit(INVENTORY_EVENTS.ITEM_UNLOCKED, {
            category,
            itemId
        });

        this.emit(INVENTORY_EVENTS.INVENTORY_UPDATED, {
            inventory: this.getInventory()
        });

        return true;
    }

    // ========================================================
    // EQUIP ITEM
    // ========================================================

    async equipItem(category, itemId) {
        this.ensureInitialized();
        this.validateCategory(category);

        if (!this.ownsItem(category, itemId)) {
            throw new Error("You do not own this item.");
        }

        const profile = this.playerService.getProfile();

        const equippedKey = {
            boards: "board",
            pieces: "pieces",
            tables: "table",
            environments: "environment",
            lighting: "lighting",
            effects: "effects",
            frames: "frame",
            avatars: "avatar"
        }[category];

        profile.equipped[equippedKey] = itemId;

        await this.playerService.saveProfile();

        this.emit(INVENTORY_EVENTS.ITEM_EQUIPPED, {
            category,
            itemId,
            equippedKey
        });

        return {
            category,
            itemId
        };
    }

    // ========================================================
    // GET ITEM LEVEL
    // ========================================================

    getItemLevel(itemId) {
        this.ensureInitialized();

        const profile = this.playerService.getProfile();

        return profile.itemLevels[itemId] || 1;
    }

    // ========================================================
    // UPGRADE PRICE
    // ========================================================

    getUpgradePrice(basePrice, currentLevel) {
        const base = Number(basePrice);
        const level = Number(currentLevel);

        if (
            !Number.isFinite(base) ||
            base <= 0 ||
            !Number.isInteger(level) ||
            level < 1
        ) {
            throw new Error("Invalid upgrade price information.");
        }

        return Math.floor(
            base * Math.pow(this.options.costMultiplier, level - 1)
        );
    }

    // ========================================================
    // UPGRADE ITEM
    // ========================================================

    async upgradeItem(itemId, basePrice, currency = "coins") {
        this.ensureInitialized();

        const profile = this.playerService.getProfile();

        const owned = INVENTORY_CATEGORIES.some(
            category => profile.inventory[category].includes(itemId)
        );

        if (!owned) {
            throw new Error("You must unlock this item first.");
        }

        const currentLevel = this.getItemLevel(itemId);

        if (currentLevel >= this.options.maxLevel) {
            throw new Error("This item has reached maximum level.");
        }

        const price = this.getUpgradePrice(
            basePrice,
            currentLevel
        );

        await this.economyService.spendCurrency(
            price,
            currency,
            `upgrade_${itemId}`
        );

        profile.itemLevels[itemId] = currentLevel + 1;

        await this.playerService.saveProfile();

        const payload = {
            itemId,
            previousLevel: currentLevel,
            currentLevel: currentLevel + 1,
            price,
            currency
        };

        this.emit(INVENTORY_EVENTS.ITEM_UPGRADED, payload);

        return payload;
    }

    // ========================================================
    // CHECK UPGRADE AVAILABILITY
    // ========================================================

    canUpgrade(itemId) {
        this.ensureInitialized();

        return this.getItemLevel(itemId) < this.options.maxLevel;
    }

    // ========================================================
    // REMOVE ITEM
    // ========================================================

    async removeItem(category, itemId) {
        this.ensureInitialized();
        this.validateCategory(category);

        const profile = this.playerService.getProfile();
        const items = profile.inventory[category];

        const index = items.indexOf(itemId);

        if (index === -1) {
            return false;
        }

        const equippedKey = {
            boards: "board",
            pieces: "pieces",
            tables: "table",
            environments: "environment",
            lighting: "lighting",
            effects: "effects",
            frames: "frame",
            avatars: "avatar"
        }[category];

        if (profile.equipped[equippedKey] === itemId) {
            throw new Error("Unequip this item before removing it.");
        }

        items.splice(index, 1);

        await this.playerService.saveProfile();

        this.emit(INVENTORY_EVENTS.INVENTORY_UPDATED, {
            inventory: this.getInventory()
        });

        return true;
    }

    // ========================================================
    // CATEGORY VALIDATION
    // ========================================================

    validateCategory(category) {
        if (!INVENTORY_CATEGORIES.includes(category)) {
            throw new Error(`Invalid inventory category: ${category}`);
        }
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
                    `[InventoryService] ${eventName}:`,
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
            message: error?.message || "Inventory error.",
            timestamp: Date.now()
        };

        this.emit(INVENTORY_EVENTS.ERROR, {
            error: this.lastError
        });

        return error;
    }

    // ========================================================
    // GUARDS
    // ========================================================

    ensureActive() {
        if (this.disposed) {
            throw new Error("InventoryService has been disposed.");
        }
    }

    ensureInitialized() {
        this.ensureActive();

        if (!this.initialized || !this.playerService || !this.economyService) {
            throw new Error("InventoryService is not initialized.");
        }
    }

    // ========================================================
    // DISPOSE
    // ========================================================

    dispose() {
        if (this.disposed) return;

        this.listeners.clear();

        this.playerService = null;
        this.economyService = null;

        this.initialized = false;
        this.disposed = true;
    }
}

// ============================================================
// FACTORY
// ============================================================

export function createInventoryService(options = {}) {
    return new InventoryService(options);
}

// ============================================================
// FILE 41 END — COMPLETE
// ============================================================
