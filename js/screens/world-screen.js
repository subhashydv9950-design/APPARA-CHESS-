/* =========================================================
   APPARA CHESS — FILE 59
   PATH: js/screens/world-screen.js
   PART 1/2 — START
========================================================= */

const WORLD_REGIONS = [
  {
    id: "royal-palace",
    name: "Royal Palace",
    subtitle: "The Grand Royal Arena",
    description: "Play surrounded by royal architecture and golden elegance.",
    icon: "♛",
    theme: "gold",
    unlockLevel: 1,
    environment: "palace",
    background: 0x100b1d,
    fog: 0x100b1d
  },
  {
    id: "crystal-kingdom",
    name: "Crystal Kingdom",
    subtitle: "A world of shining crystals",
    description: "Discover a magical arena filled with crystal-inspired beauty.",
    icon: "💎",
    theme: "crystal",
    unlockLevel: 5,
    environment: "crystal",
    background: 0x101a35,
    fog: 0x101a35
  },
  {
    id: "ancient-temple",
    name: "Ancient Temple",
    subtitle: "Wisdom of the ages",
    description: "Enter a mysterious ancient chess sanctuary.",
    icon: "🏛",
    theme: "ancient",
    unlockLevel: 10,
    environment: "temple",
    background: 0x24170f,
    fog: 0x24170f
  },
  {
    id: "frozen-kingdom",
    name: "Frozen Kingdom",
    subtitle: "The icy battlefield",
    description: "Experience a beautiful frozen chess environment.",
    icon: "❄",
    theme: "ice",
    unlockLevel: 15,
    environment: "frozen",
    background: 0x102b42,
    fog: 0x102b42
  },
  {
    id: "royal-garden",
    name: "Royal Garden",
    subtitle: "Nature meets strategy",
    description: "Enjoy a peaceful garden-inspired chess arena.",
    icon: "🌿",
    theme: "nature",
    unlockLevel: 20,
    environment: "garden",
    background: 0x10251a,
    fog: 0x10251a
  },
  {
    id: "cosmic-arena",
    name: "Cosmic Arena",
    subtitle: "Beyond the stars",
    description: "Take your chess journey into a cosmic universe.",
    icon: "🌌",
    theme: "cosmic",
    unlockLevel: 30,
    environment: "cosmic",
    background: 0x100c2d,
    fog: 0x100c2d
  },
  {
    id: "dark-fortress",
    name: "Dark Fortress",
    subtitle: "The shadow kingdom",
    description: "A dramatic fortress with a mysterious atmosphere.",
    icon: "🏰",
    theme: "dark",
    unlockLevel: 40,
    environment: "fortress",
    background: 0x090a12,
    fog: 0x090a12
  },
  {
    id: "heavenly-arena",
    name: "Heavenly Arena",
    subtitle: "The ultimate royal experience",
    description: "A legendary arena reserved for dedicated players.",
    icon: "✨",
    theme: "heaven",
    unlockLevel: 50,
    environment: "heaven",
    background: 0x252044,
    fog: 0x252044
  }
];

export class WorldScreen {
  constructor(options = {}) {
    this.container = options.container || null;
    this.playerService = options.playerService || null;
    this.navigation = options.navigation || null;
    this.modalManager = options.modalManager || null;
    this.eventBus = options.eventBus || null;
    this.sceneManager = options.sceneManager || null;
    this.settingsService = options.settingsService || null;

    this.playerLevel = 1;
    this.selectedWorld = "royal-palace";
    this.unlockedWorlds = new Set(["royal-palace"]);

    this.destroyed = false;
    this.saving = false;
    this.elements = {};

    this.boundClickHandler = this.handleClick.bind(this);
  }

  mount(container = this.container) {
    if (!container) {
      throw new Error("WorldScreen requires a container.");
    }

    this.container = container;
    this.destroyed = false;

    this.loadPlayerData();
    this.render();
    this.cacheElements();
    this.bindEvents();

    return this;
  }

  initialize(container = this.container) {
    return this.mount(container);
  }

  loadPlayerData() {
    try {
      const profile = this.playerService?.getProfile?.();

      this.playerLevel = Math.max(
        1,
        Number(
          profile?.progression?.level ||
          profile?.level ||
          1
        )
      );

      const savedWorlds =
        profile?.worlds?.unlocked ||
        profile?.unlockedWorlds ||
        [];

      if (Array.isArray(savedWorlds)) {
        savedWorlds.forEach(id => {
          if (WORLD_REGIONS.some(world => world.id === id)) {
            this.unlockedWorlds.add(id);
          }
        });
      }

      const activeWorld =
        profile?.worlds?.selected ||
        profile?.selectedWorld;

      if (WORLD_REGIONS.some(world => world.id === activeWorld)) {
        this.selectedWorld = activeWorld;
      }

      WORLD_REGIONS.forEach(world => {
        if (this.playerLevel >= world.unlockLevel) {
          this.unlockedWorlds.add(world.id);
        }
      });
    } catch (error) {
      console.warn("Unable to load world profile:", error);
    }
  }

  render() {
    this.container.innerHTML = `
      <section class="world-screen">

        <header class="world-header">
          <button
            type="button"
            class="world-back-button"
            data-action="back"
            aria-label="Go back"
          >←</button>

          <div class="world-heading">
            <span class="world-eyebrow">EXPLORE THE UNIVERSE</span>
            <h1>Chess World</h1>
            <p>Discover extraordinary chess environments.</p>
          </div>

          <div class="world-header-icon" aria-hidden="true">
            🌍
          </div>
        </header>

        <section class="world-player-card">
          <div class="world-player-info">
            <span>Your Journey</span>
            <strong>Level ${this.playerLevel}</strong>
          </div>

          <div class="world-level-track">
            <div class="world-level-fill"></div>
          </div>

          <p>
            ${this.unlockedWorlds.size} of
            ${WORLD_REGIONS.length} worlds unlocked.
            Explore new destinations as you level up.
          </p>
        </section>

        <section class="world-featured">
          <div class="world-featured-content">
            <span class="world-eyebrow">FEATURED ENVIRONMENT</span>
            <h2>The Royal Palace</h2>
            <p>
              Begin your journey in the grand royal chess arena.
            </p>

            <button
              type="button"
              data-action="select"
              data-world="royal-palace"
              class="world-featured-button"
            >
              Explore Royal Palace
            </button>
          </div>

          <div class="world-featured-art" aria-hidden="true">
            <span>♔</span>
            <span>♛</span>
            <span>♜</span>
          </div>
        </section>

        <section class="world-collection">
          <div class="world-section-heading">
            <div>
              <span class="world-eyebrow">YOUR DESTINATIONS</span>
              <h2>Explore Worlds</h2>
            </div>

            <span class="world-count">
              ${this.unlockedWorlds.size}/${WORLD_REGIONS.length}
              Unlocked
            </span>
          </div>

          <div class="world-grid">
            ${WORLD_REGIONS.map(world =>
              this.renderWorldCard(world)
            ).join("")}
          </div>
        </section>

        <section
          class="world-selected-panel"
          id="world-selected-panel"
          hidden
        ></section>

      </section>
    `;
  }

  renderWorldCard(world) {
    const unlocked = this.isWorldUnlocked(world);
    const selected = this.selectedWorld === world.id;

    return `
      <article
        class="world-card world-theme-${this.escapeHTML(world.theme)}
        ${unlocked ? "unlocked" : "locked"}
        ${selected ? "selected" : ""}"
        data-world-card="${this.escapeHTML(world.id)}"
      >
        <div class="world-card-art">
          <span class="world-card-icon">
            ${world.icon}
          </span>

          ${
            unlocked
              ? `<span class="world-unlocked-mark">✓</span>`
              : `<span class="world-lock-mark">🔒</span>`
          }
        </div>

        <div class="world-card-content">
          <h3>${this.escapeHTML(world.name)}</h3>
          <p>${this.escapeHTML(world.subtitle)}</p>

          ${
            unlocked
              ? `<span class="world-card-status">AVAILABLE</span>`
              : `<span class="world-card-status locked">
                   Unlock at Level ${world.unlockLevel}
                 </span>`
          }

          <button
            type="button"
            data-action="select"
            data-world="${this.escapeHTML(world.id)}"
            ${unlocked ? "" : "disabled"}
          >
            ${
              selected
                ? "Selected"
                : unlocked
                  ? "Explore"
                  : "Locked"
            }
          </button>
        </div>
      </article>
    `;
  }

  cacheElements() {
    this.elements = {
      grid: this.container.querySelector(".world-grid"),
      selectedPanel: this.container.querySelector(
        "#world-selected-panel"
      ),
      worldCount: this.container.querySelector(".world-count")
    };
  }

  bindEvents() {
    this.container.removeEventListener(
      "click",
      this.boundClickHandler
    );

    this.container.addEventListener(
      "click",
      this.boundClickHandler
    );
  }

  handleClick(event) {
    const button = event.target.closest("[data-action]");

    if (!button || !this.container.contains(button)) return;

    const action = button.dataset.action;

    if (action === "back") {
      this.goBack();
      return;
    }

    if (action === "select") {
      this.selectWorld(button.dataset.world);
      return;
    }

    if (action === "enter") {
      this.enterWorld(button.dataset.world);
      return;
    }

    if (action === "close-panel") {
      this.closeSelectedPanel();
    }
  }

  isWorldUnlocked(world) {
    return Boolean(
      world &&
      (
        this.unlockedWorlds.has(world.id) ||
        this.playerLevel >= world.unlockLevel
      )
    );
  }

  selectWorld(worldId) {
    const world = WORLD_REGIONS.find(
      item => item.id === worldId
    );

    if (!world) return;

    if (!this.isWorldUnlocked(world)) {
      this.showMessage(
        `Reach Level ${world.unlockLevel} to unlock ${world.name}.`
      );
      return;
    }

    this.selectedWorld = worldId;

    this.container
      .querySelectorAll(".world-card")
      .forEach(card => {
        const selected =
          card.dataset.worldCard === worldId;

        card.classList.toggle("selected", selected);

        const cardButton = card.querySelector(
          '[data-action="select"]'
        );

        if (cardButton) {
          cardButton.textContent =
            selected ? "Selected" : "Explore";
        }
      });

    this.showSelectedWorld(world);
  }

/* =========================================================
   FILE 59 — PART 1/2 END
   PART 2/2 CONTINUES INSIDE WorldScreen CLASS
========================================================= */
   
/* =========================================================
   FILE 59 — PART 2/2 — START
   CONTINUES INSIDE WorldScreen CLASS
========================================================= */

  showSelectedWorld(world) {
    if (!this.elements.selectedPanel) return;

    this.elements.selectedPanel.hidden = false;

    this.elements.selectedPanel.innerHTML = `
      <div class="world-selected-content">
        <button
          type="button"
          class="world-panel-close"
          data-action="close-panel"
          aria-label="Close"
        >×</button>

        <span class="world-eyebrow">SELECTED ENVIRONMENT</span>

        <div class="world-selected-icon">
          ${world.icon}
        </div>

        <h2>${this.escapeHTML(world.name)}</h2>
        <h3>${this.escapeHTML(world.subtitle)}</h3>
        <p>${this.escapeHTML(world.description)}</p>

        <button
          type="button"
          class="world-enter-button"
          data-action="enter"
          data-world="${this.escapeHTML(world.id)}"
          ${this.saving ? "disabled" : ""}
        >
          Enter This World
        </button>
      </div>
    `;

    this.elements.selectedPanel.scrollIntoView?.({
      behavior: "smooth",
      block: "nearest"
    });
  }

  async enterWorld(worldId) {
    if (this.saving || this.destroyed) return;

    const world = WORLD_REGIONS.find(
      item => item.id === worldId
    );

    if (!world || !this.isWorldUnlocked(world)) {
      this.showMessage("This world is locked.");
      return;
    }

    this.saving = true;

    try {
      if (
        typeof this.playerService?.updateProfile === "function"
      ) {
        await this.playerService.updateProfile(profile => {
          profile.worlds = profile.worlds || {};
          profile.worlds.selected = world.id;
        });
      }

      if (this.destroyed) return;

      this.selectedWorld = world.id;

      /*
       * SceneManager.setEnvironment() accepts colors,
       * not environment ID strings.
       */
      if (
        typeof this.sceneManager?.setEnvironment === "function"
      ) {
        this.sceneManager.setEnvironment(
          world.background,
          world.fog
        );
      }

      this.eventBus?.emit?.("world:selected", {
        worldId: world.id,
        environment: world.environment,
        theme: world.theme,
        background: world.background,
        fog: world.fog
      });

      /*
       * SettingsService is not assumed to have a generic
       * set() method. The selected world is saved in profile.
       */

      this.updateWorldCards();
      this.showSelectedWorld(world);
      this.showMessage(`${world.name} selected.`);
    } catch (error) {
      console.error("Unable to enter world:", error);

      this.showMessage(
        error?.message || "Unable to select this world."
      );
    } finally {
      this.saving = false;
    }
  }

  updateWorldCards() {
    if (!this.elements.grid) return;

    this.elements.grid.innerHTML =
      WORLD_REGIONS.map(world =>
        this.renderWorldCard(world)
      ).join("");

    if (this.elements.worldCount) {
      this.elements.worldCount.textContent =
        `${this.unlockedWorlds.size}/${WORLD_REGIONS.length} Unlocked`;
    }
  }

  closeSelectedPanel() {
    if (!this.elements.selectedPanel) return;

    this.elements.selectedPanel.hidden = true;
    this.elements.selectedPanel.innerHTML = "";
  }

  showMessage(message) {
    if (typeof this.modalManager?.alert === "function") {
      this.modalManager.alert(message);
      return;
    }

    if (this.elements.selectedPanel) {
      this.elements.selectedPanel.hidden = false;
      this.elements.selectedPanel.innerHTML = `
        <div class="world-selected-content">
          <p>${this.escapeHTML(message)}</p>
          <button
            type="button"
            data-action="close-panel"
            class="world-panel-close"
            aria-label="Close"
          >×</button>
        </div>
      `;
    }
  }

  goBack() {
    if (typeof this.navigation?.back === "function") {
      this.navigation.back();
    } else if (
      typeof this.navigation?.navigate === "function"
    ) {
      this.navigation.navigate("home");
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
    this.saving = false;

    if (this.container) {
      this.container.removeEventListener(
        "click",
        this.boundClickHandler
      );

      this.container.innerHTML = "";
    }

    this.selectedWorld = null;
    this.elements = {};
  }
}

export function createWorldScreen(options = {}) {
  return new WorldScreen(options);
}

/* =========================================================
   FILE 59 END
   WORLD SCREEN COMPLETE
========================================================= */
