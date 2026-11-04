/* =========================================================
   APPARA CHESS — FILE 60
   SHOP & THEMES SCREEN
   PATH: js/screens/shop-screen.js
   PART 1/2
========================================================= */

const SHOP_CATEGORIES = [
  { id: "pieces", label: "Chess Pieces", icon: "♟" },
  { id: "boards", label: "Chess Boards", icon: "▦" },
  { id: "tables", label: "Tables", icon: "▤" },
  { id: "environments", label: "Environments", icon: "🏛" },
  { id: "lighting", label: "Lighting", icon: "✦" },
  { id: "effects", label: "Move Effects", icon: "⚡" },
  { id: "victory", label: "Victory Effects", icon: "🏆" }
];

const SHOP_ITEMS = [
  {
    id: "royal-gold-pieces",
    name: "Royal Gold Pieces",
    category: "pieces",
    description: "Elegant golden chess pieces.",
    icon: "♛",
    price: 0,
    currency: "coins",
    level: 1,
    rarity: "Common",
    preview: "gold"
  },
  {
    id: "crystal-pieces",
    name: "Crystal Collection",
    category: "pieces",
    description: "A brilliant crystal-inspired piece set.",
    icon: "💎",
    price: 2500,
    currency: "coins",
    level: 3,
    rarity: "Rare",
    preview: "crystal"
  },
  {
    id: "royal-marble-board",
    name: "Royal Marble Board",
    category: "boards",
    description: "Premium marble chessboard.",
    icon: "▦",
    price: 0,
    currency: "coins",
    level: 1,
    rarity: "Common",
    preview: "marble"
  },
  {
    id: "midnight-board",
    name: "Midnight Board",
    category: "boards",
    description: "A dark and luxurious chessboard.",
    icon: "◈",
    price: 1800,
    currency: "coins",
    level: 4,
    rarity: "Rare",
    preview: "midnight"
  },
  {
    id: "imperial-table",
    name: "Imperial Table",
    category: "tables",
    description: "A royal table with premium detailing.",
    icon: "♜",
    price: 3000,
    currency: "coins",
    level: 5,
    rarity: "Epic",
    preview: "imperial"
  },
  {
    id: "royal-palace",
    name: "Royal Palace",
    category: "environments",
    description: "The grand royal chess environment.",
    icon: "🏰",
    price: 0,
    currency: "coins",
    level: 1,
    rarity: "Common",
    preview: "palace"
  },
  {
    id: "crystal-kingdom",
    name: "Crystal Kingdom",
    category: "environments",
    description: "A magical world of shining crystals.",
    icon: "💠",
    price: 5000,
    currency: "coins",
    level: 8,
    rarity: "Epic",
    preview: "crystal"
  },
  {
    id: "golden-lighting",
    name: "Golden Lighting",
    category: "lighting",
    description: "Warm golden arena lighting.",
    icon: "☀",
    price: 1200,
    currency: "coins",
    level: 2,
    rarity: "Rare",
    preview: "gold"
  },
  {
    id: "royal-move-effect",
    name: "Royal Move Effect",
    category: "effects",
    description: "A special visual effect for piece movement.",
    icon: "⚡",
    price: 1600,
    currency: "coins",
    level: 4,
    rarity: "Rare",
    preview: "royal"
  },
  {
    id: "victory-crown",
    name: "Victory Crown",
    category: "victory",
    description: "A royal celebration after victory.",
    icon: "👑",
    price: 3500,
    currency: "coins",
    level: 7,
    rarity: "Epic",
    preview: "crown"
  }
];

const SHOP_INVENTORY_CATEGORY = Object.freeze({
  pieces: "pieces",
  boards: "boards",
  tables: "tables",
  environments: "environments",
  lighting: "lighting",
  effects: "effects",
  victory: "effects"
});

export class ShopScreen {
  constructor(options = {}) {
    this.container = options.container || null;
    this.playerService = options.playerService || null;
    this.economyService = options.economyService || null;
    this.inventoryService = options.inventoryService || null;
    this.navigation = options.navigation || null;
    this.modalManager = options.modalManager || null;
    this.eventBus = options.eventBus || null;

    this.selectedCategory = "pieces";
    this.selectedItem = null;

    this.coins = 0;
    this.diamonds = 0;
    this.playerLevel = 1;

    this.ownedItems = new Set();
    this.equippedItems = new Set();

    this.purchasing = false;
    this.loading = false;
    this.destroyed = false;

    this.elements = {};
    this.boundClickHandler = this.handleClick.bind(this);
  }

  mount(container = this.container) {
    if (!container) {
      throw new Error("ShopScreen requires a container.");
    }

    this.container = container;
    this.destroyed = false;

    this.loadPlayerData();
    this.render();
    this.cacheElements();
    this.bindEvents();
    this.renderItems();
    this.loadInventory();

    return this;
  }

  loadPlayerData() {
    try {
      const profile = this.playerService?.getProfile?.();

      this.coins = Math.max(0, Number(profile?.coins) || 0);
      this.diamonds = Math.max(0, Number(profile?.diamonds) || 0);

      this.playerLevel = Math.max(
        1,
        Number(profile?.level || profile?.progression?.level || 1)
      );

      const inventory = profile?.inventory || {};

      for (const category of Object.values(inventory)) {
        if (Array.isArray(category)) {
          category.forEach(id => {
            if (typeof id === "string") {
              this.ownedItems.add(id);
            } else if (id?.id) {
              this.ownedItems.add(id.id);
            }
          });
        }
      }

      const equipped = profile?.equipped || {};

      Object.values(equipped).forEach(id => {
        if (typeof id === "string") {
          this.equippedItems.add(id);
        }
      });

      (profile?.purchases || []).forEach(purchase => {
        if (purchase?.itemId) {
          this.ownedItems.add(purchase.itemId);
        }
      });
    } catch (error) {
      console.warn("Shop profile loading failed:", error);
    }

    this.ownedItems.add("royal-gold-pieces");
    this.ownedItems.add("royal-marble-board");
    this.ownedItems.add("royal-palace");
  }

  render() {
    this.container.innerHTML = `
      <section class="shop-screen">

        <header class="shop-header">
          <button
            type="button"
            class="shop-back-button"
            data-action="back"
            aria-label="Go back"
          >←</button>

          <div class="shop-heading">
            <span class="shop-eyebrow">THE ROYAL COLLECTION</span>
            <h1>Shop & Themes</h1>
            <p>Customize your ultimate chess experience.</p>
          </div>

          <div class="shop-header-icon">♛</div>
        </header>

        <section class="shop-wallet">
          <div class="shop-wallet-item">
            <span>🪙</span>
            <div>
              <small>Coins</small>
              <strong id="shop-coins">${this.formatNumber(this.coins)}</strong>
            </div>
          </div>

          <div class="shop-wallet-item">
            <span>💎</span>
            <div>
              <small>Diamonds</small>
              <strong id="shop-diamonds">${this.formatNumber(this.diamonds)}</strong>
            </div>
          </div>

          <div class="shop-wallet-level">
            <small>PLAYER LEVEL</small>
            <strong id="shop-level">${this.playerLevel}</strong>
          </div>
        </section>

        <section class="shop-feature">
          <div class="shop-feature-content">
            <span class="shop-eyebrow">EXCLUSIVE COLLECTION</span>
            <h2>Build Your Royal Arena</h2>
            <p>
              Discover premium pieces, beautiful boards,
              environments and special effects.
            </p>
          </div>

          <div class="shop-feature-art" aria-hidden="true">♔</div>
        </section>

        <section class="shop-catalog">
          <div class="shop-section-heading">
            <div>
              <span class="shop-eyebrow">COLLECTIONS</span>
              <h2>Browse Categories</h2>
            </div>
          </div>

          <nav class="shop-categories" aria-label="Shop categories">
            ${SHOP_CATEGORIES.map(category => `
              <button
                type="button"
                class="shop-category ${
                  category.id === this.selectedCategory ? "active" : ""
                }"
                data-action="category"
                data-category="${category.id}"
                aria-pressed="${category.id === this.selectedCategory}"
              >
                <span>${category.icon}</span>
                ${this.escapeHTML(category.label)}
              </button>
            `).join("")}
          </nav>

          <div class="shop-item-grid" id="shop-item-grid"></div>
        </section>

        <section
          class="shop-preview-panel"
          id="shop-preview-panel"
          hidden
        ></section>

      </section>
    `;
  }

  cacheElements() {
    this.elements = {
      grid: this.container.querySelector("#shop-item-grid"),
      coins: this.container.querySelector("#shop-coins"),
      diamonds: this.container.querySelector("#shop-diamonds"),
      level: this.container.querySelector("#shop-level"),
      preview: this.container.querySelector("#shop-preview-panel")
    };
  }

  bindEvents() {
    this.container.removeEventListener("click", this.boundClickHandler);
    this.container.addEventListener("click", this.boundClickHandler);
  }

  handleClick(event) {
    const button = event.target.closest("[data-action]");

    if (!button || !this.container.contains(button)) return;

    const action = button.dataset.action;

    if (action === "back") {
      this.goBack();
    } else if (action === "category") {
      this.selectCategory(button.dataset.category);
    } else if (action === "preview") {
      this.showItemPreview(button.dataset.id);
    } else if (action === "purchase") {
      this.purchaseItem(button.dataset.id);
    } else if (action === "equip") {
      this.equipItem(button.dataset.id);
    } else if (action === "close-preview") {
      this.closePreview();
    }
  }

  async loadInventory() {
    if (this.loading || !this.inventoryService) {
      this.renderItems();
      return;
    }

    this.loading = true;

    try {
      const result = await this.inventoryService.getInventory();

      if (this.destroyed) return;

      if (result && typeof result === "object") {
        Object.values(result).forEach(category => {
          if (!Array.isArray(category)) return;

          category.forEach(id => {
            if (typeof id === "string") {
              this.ownedItems.add(id);
            }
          });
        });
      }

      const equipped =
        this.inventoryService.getEquippedItems?.() || {};

      Object.values(equipped).forEach(id => {
        if (typeof id === "string") {
          this.equippedItems.add(id);
        }
      });

      this.renderItems();
    } catch (error) {
      console.warn("Inventory loading failed:", error);
      this.renderItems();
    } finally {
      this.loading = false;
    }
  }

  selectCategory(categoryId) {
    if (!SHOP_CATEGORIES.some(item => item.id === categoryId)) {
      return;
    }

    this.selectedCategory = categoryId;

    this.container.querySelectorAll(".shop-category").forEach(button => {
      const active = button.dataset.category === categoryId;

      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    this.closePreview();
    this.renderItems();
  }

  renderItems() {
    if (!this.elements.grid) return;

    const items = SHOP_ITEMS.filter(
      item => item.category === this.selectedCategory
    );

    if (!items.length) {
      this.elements.grid.innerHTML = `
        <div class="shop-empty">
          <h3>More items coming soon</h3>
          <p>This collection will be expanded in a future update.</p>
        </div>
      `;
      return;
    }

    this.elements.grid.innerHTML = items.map(item => {
      const owned = this.ownedItems.has(item.id);
      const unlocked = this.playerLevel >= item.level;

      return `
        <article class="shop-item-card">
          <div class="shop-item-art preview-${this.escapeHTML(item.preview)}">
            <span>${item.icon}</span>
            <small class="shop-rarity ${this.escapeHTML(item.rarity.toLowerCase())}">
              ${this.escapeHTML(item.rarity)}
            </small>
            ${owned ? `<span class="shop-owned-mark">✓</span>` : ""}
          </div>

          <div class="shop-item-content">
            <h3>${this.escapeHTML(item.name)}</h3>
            <p>${this.escapeHTML(item.description)}</p>

            <span class="shop-item-level">
              ${unlocked ? "Available" : `Unlock at Level ${item.level}`}
            </span>

            <div class="shop-item-footer">
              ${
                owned
                  ? `<strong class="shop-owned-label">Owned</strong>`
                  : `<strong class="shop-price">
                       ${item.currency === "diamonds" ? "💎" : "🪙"}
                       ${this.formatNumber(item.price)}
                     </strong>`
              }

              <button
                type="button"
                data-action="preview"
                data-id="${this.escapeHTML(item.id)}"
              >Preview</button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

/* =========================================================
   FILE 60 — PART 1/2 END
   PART 2 CONTINUES INSIDE ShopScreen CLASS
========================================================= */
   
  showItemPreview(itemId) {
    const item = SHOP_ITEMS.find(product => product.id === itemId);

    if (!item || !this.elements.preview) return;

    this.selectedItem = item;

    const owned = this.ownedItems.has(item.id);
    const unlocked = this.playerLevel >= item.level;
    const equipped = this.equippedItems.has(item.id);

    let actionButton = "";

    if (owned) {
      actionButton = `
        <button
          type="button"
          class="shop-equip-button"
          data-action="equip"
          data-id="${this.escapeHTML(item.id)}"
          ${equipped ? "disabled" : ""}
        >
          ${equipped ? "Equipped" : "Equip"}
        </button>
      `;
    } else if (unlocked) {
      actionButton = `
        <button
          type="button"
          class="shop-purchase-button"
          data-action="purchase"
          data-id="${this.escapeHTML(item.id)}"
          ${this.purchasing ? "disabled" : ""}
        >
          ${this.purchasing ? "Processing..." : "Purchase"}
        </button>
      `;
    } else {
      actionButton = `
        <p class="shop-locked-message">
          Reach Level ${item.level} to unlock this item.
        </p>
      `;
    }

    this.elements.preview.hidden = false;

    this.elements.preview.innerHTML = `
      <div class="shop-preview-content">
        <button
          type="button"
          class="shop-preview-close"
          data-action="close-preview"
          aria-label="Close preview"
        >×</button>

        <span class="shop-eyebrow">COLLECTION PREVIEW</span>

        <div class="shop-large-preview preview-${this.escapeHTML(item.preview)}">
          <span>${item.icon}</span>
        </div>

        <h2>${this.escapeHTML(item.name)}</h2>
        <p>${this.escapeHTML(item.description)}</p>

        <div class="shop-preview-info">
          <span>Rarity: ${this.escapeHTML(item.rarity)}</span>
          <span>Required Level: ${item.level}</span>
        </div>

        ${
          owned
            ? `<p class="shop-owned-note">This item is in your collection.</p>`
            : `<p class="shop-preview-price">
                 Price: ${item.currency === "diamonds" ? "💎" : "🪙"}
                 ${this.formatNumber(item.price)}
               </p>`
        }

        ${actionButton}
      </div>
    `;

    this.elements.preview.scrollIntoView?.({
      behavior: "smooth",
      block: "nearest"
    });
  }

  async purchaseItem(itemId) {
    if (this.purchasing || this.destroyed) return;

    const item = SHOP_ITEMS.find(product => product.id === itemId);

    if (!item || this.ownedItems.has(item.id)) return;

    if (this.playerLevel < item.level) {
      this.showMessage(`You need Level ${item.level} to unlock this item.`);
      return;
    }

    if (item.price <= 0) {
      this.showMessage("This item is already available for free.");
      return;
    }

    if (typeof this.economyService?.purchaseItem !== "function") {
      this.showMessage("Shop service is not connected.");
      return;
    }

    const balance = item.currency === "diamonds"
      ? this.diamonds
      : this.coins;

    if (balance < item.price) {
      this.showMessage("You do not have enough currency.");
      return;
    }

    const confirmed = await this.confirmPurchase(item);

    if (!confirmed || this.destroyed) return;

    this.purchasing = true;
    this.showItemPreview(item.id);

    try {
      const result = await this.economyService.purchaseItem({
        itemId: item.id,
        price: item.price,
        currency: item.currency,
        category: item.category
      });

      if (this.destroyed) return;

      if (result?.success === false) {
        throw new Error(result.message || "Purchase failed.");
      }

      const inventoryCategory = SHOP_INVENTORY_CATEGORY[item.category];

      if (
        inventoryCategory &&
        typeof this.inventoryService?.unlockItem === "function"
      ) {
        // EconomyService purchase has already charged the player.
        // Add the purchased item directly to inventory without charging twice.
        const profile = this.playerService?.getProfile?.();

        if (profile?.inventory &&
            Array.isArray(profile.inventory[inventoryCategory])) {
          if (!profile.inventory[inventoryCategory].includes(item.id)) {
            profile.inventory[inventoryCategory].push(item.id);
          }

          await this.playerService.saveProfile();
        }
      }

      this.ownedItems.add(item.id);

      const latestProfile = this.playerService?.getProfile?.();

      if (latestProfile) {
        this.coins = Number(latestProfile.coins) || 0;
        this.diamonds = Number(latestProfile.diamonds) || 0;
      } else if (item.currency === "coins") {
        this.coins = Math.max(0, this.coins - item.price);
      } else {
        this.diamonds = Math.max(0, this.diamonds - item.price);
      }

      this.updateWallet();
      this.renderItems();
      this.showItemPreview(item.id);

      this.showMessage(`${item.name} purchased successfully.`);

      this.eventBus?.emit?.("shop:item-purchased", {
        itemId: item.id,
        category: item.category
      });
    } catch (error) {
      console.error("Shop purchase failed:", error);
      this.showMessage(error?.message || "Unable to complete purchase.");
    } finally {
      this.purchasing = false;

      if (!this.destroyed && this.selectedItem) {
        this.showItemPreview(this.selectedItem.id);
      }
    }
  }

  async confirmPurchase(item) {
    const message =
      `Purchase ${item.name} for ${this.formatNumber(item.price)} ${item.currency}?`;

    if (typeof this.modalManager?.confirm === "function") {
      return Boolean(await this.modalManager.confirm(message));
    }

    return false;
  }

  async equipItem(itemId) {
    if (this.destroyed) return;

    const item = SHOP_ITEMS.find(product => product.id === itemId);

    if (!item || !this.ownedItems.has(item.id)) return;

    const category = SHOP_INVENTORY_CATEGORY[item.category];

    if (!category) {
      this.showMessage("This item category cannot be equipped yet.");
      return;
    }

    if (typeof this.inventoryService?.equipItem !== "function") {
      this.showMessage("Inventory service is not connected.");
      return;
    }

    try {
      // InventoryService signature: equipItem(category, itemId)
      await this.inventoryService.equipItem(category, item.id);

      const profile = this.playerService?.getProfile?.();
      const equipped = profile?.equipped || {};

      this.equippedItems.clear();

      Object.values(equipped).forEach(id => {
        if (typeof id === "string") {
          this.equippedItems.add(id);
        }
      });

      this.renderItems();
      this.showItemPreview(item.id);

      this.eventBus?.emit?.("shop:item-equipped", {
        itemId: item.id,
        category: item.category
      });

      this.showMessage(`${item.name} equipped.`);
    } catch (error) {
      console.error("Equip failed:", error);
      this.showMessage(error?.message || "Unable to equip this item.");
    }
  }

  updateWallet() {
    if (this.elements.coins) {
      this.elements.coins.textContent = this.formatNumber(this.coins);
    }

    if (this.elements.diamonds) {
      this.elements.diamonds.textContent = this.formatNumber(this.diamonds);
    }

    if (this.elements.level) {
      this.elements.level.textContent = String(this.playerLevel);
    }
  }

  closePreview() {
    if (!this.elements.preview) return;

    this.elements.preview.hidden = true;
    this.elements.preview.innerHTML = "";
    this.selectedItem = null;
  }

  showMessage(message) {
    if (typeof this.modalManager?.alert === "function") {
      this.modalManager.alert(message);
      return;
    }

    console.info(message);
  }

  formatNumber(value) {
    return new Intl.NumberFormat().format(
      Math.max(0, Number(value) || 0)
    );
  }

  goBack() {
    if (typeof this.navigation?.back === "function") {
      this.navigation.back();
    } else {
      this.navigation?.navigate?.("home");
    }
  }

  escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  destroy() {
    this.destroyed = true;
    this.purchasing = false;
    this.loading = false;

    if (this.container) {
      this.container.removeEventListener(
        "click",
        this.boundClickHandler
      );
      this.container.innerHTML = "";
    }

    this.ownedItems.clear();
    this.equippedItems.clear();

    this.selectedItem = null;
    this.elements = {};
  }
}

export function createShopScreen(options = {}) {
  return new ShopScreen(options);
}

/* =========================================================
   FILE 60 END
   SHOP & THEMES SCREEN COMPLETE
========================================================= */
       
