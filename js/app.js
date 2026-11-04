/* =========================================================
   APPARA CHESS — MAIN APPLICATION
   FILE 64: js/app.js
   PART 1/2
   ========================================================= */

import { EventBus, APP_EVENTS } from "./core/event-bus.js";
import { StorageService } from "./core/storage.js";

import { Navigation } from "./ui/navigation.js";
import { UIComponents } from "./ui/components.js";
import { ModalManager } from "./ui/modal-manager.js";

import { ProgressionService } from "./services/progression-service.js";
import { EconomyService } from "./services/economy-service.js";
import { InventoryService } from "./services/inventory-service.js";
import { SettingsService } from "./services/settings-service.js";
import { RankService } from "./services/rank-service.js";

import { HomeScreen } from "./screens/home-screen.js";
import { OnlineScreen } from "./screens/online-screen.js";
import { TrainingScreen } from "./screens/training-screen.js";
import { PuzzlesScreen } from "./screens/puzzles-screen.js";
import { TournamentScreen } from "./screens/tournament-screen.js";
import { WorldScreen } from "./screens/world-screen.js";
import { ShopScreen } from "./screens/shop-screen.js";
import { LeaderboardScreen } from "./screens/leaderboard-screen.js";
import { ProfileScreen } from "./screens/profile-screen.js";
import { SettingsScreen } from "./screens/settings-screen.js";
import { AboutScreen } from "./screens/about-screen.js";

const APP_VERSION = "1.0.0";

class GuestPlayerService {
  constructor() {
    this.profile = null;
    this.listeners = new Map();
  }

  initialize() {
    let saved = null;

    try {
      saved = StorageService.getGuestProfile();
    } catch (error) {
      console.warn("Guest profile could not be loaded:", error);
    }

    this.profile = saved || this.createProfile();
    this.profile.isGuest = true;

    StorageService.saveGuestProfile(this.profile);

    return this.profile;
  }

  createProfile() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    return {
      uid: "guest-" + code,
      playerId: "AC-" + code,
      displayName: "Guest Player",
      avatar: "",
      bio: "",
      country: "",
      level: 1,
      xp: 0,
      coins: 2500,
      diamonds: 0,
      trophies: 0,

      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0
      },

      ratings: {
        bullet: 1000,
        blitz: 1000,
        rapid: 1000,
        classical: 1000
      },

      inventory: {
        boards: ["royal-classic"],
        pieces: ["royal-classic"],
        tables: ["royal-classic"],
        environments: ["royal-palace"],
        lighting: [],
        effects: [],
        frames: [],
        avatars: []
      },

      equipped: {
        board: "royal-classic",
        pieces: "royal-classic",
        table: "royal-classic",
        environment: "royal-palace",
        lighting: "royal-default",
        effects: "royal-default",
        frame: "default",
        avatar: "default"
      },

      achievements: [],
      purchases: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isGuest: true
    };
  }

  getProfile() {
    return this.profile;
  }

  getProfileSnapshot() {
    return JSON.parse(JSON.stringify(this.profile));
  }

  getPlayerId() {
    return this.profile?.playerId || null;
  }

  getDisplayName() {
    return this.profile?.displayName || "Guest Player";
  }

  getLevel() {
    return Number(this.profile?.level) || 1;
  }

  getXP() {
    return Number(this.profile?.xp) || 0;
  }

  getRating(mode = "blitz") {
    return Number(this.profile?.ratings?.[mode]) || 1000;
  }

  getAllRatings() {
    return { ...(this.profile?.ratings || {}) };
  }

  async saveProfile() {
    if (!this.profile) return false;

    this.profile.updatedAt = Date.now();

    StorageService.saveGuestProfile(this.profile);

    this.emit("profileUpdated", {
      player: this.getProfileSnapshot()
    });

    return true;
  }

  async updateProfile(updates = {}) {
    Object.assign(this.profile, updates);
    await this.saveProfile();

    return this.getProfileSnapshot();
  }

  async updateDisplayName(name) {
    const value = String(name || "").trim().slice(0, 24);

    if (!value) {
      throw new Error("Display name cannot be empty.");
    }

    this.profile.displayName = value;
    return this.saveProfile();
  }

  async updateBio(bio) {
    this.profile.bio = String(bio || "").slice(0, 160);
    return this.saveProfile();
  }

  async updateCountry(country) {
    this.profile.country = String(country || "").slice(0, 60);
    return this.saveProfile();
  }

  async updateAvatar(avatar) {
    this.profile.avatar = String(avatar || "");
    return this.saveProfile();
  }

  async recordGameResult(result = {}) {
    const stats = this.profile.stats;

    stats.gamesPlayed++;

    if (result.result === "win") {
      stats.wins++;
    } else if (result.result === "loss") {
      stats.losses++;
    } else {
      stats.draws++;
    }

    return this.saveProfile();
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName).add(callback);

    return () => this.off(eventName, callback);
  }

  off(eventName, callback) {
    this.listeners.get(eventName)?.delete(callback);
  }

  emit(eventName, payload = {}) {
    for (const callback of this.listeners.get(eventName) || []) {
      try {
        callback(payload);
      } catch (error) {
        console.error(error);
      }
    }
  }

  dispose() {
    this.listeners.clear();
  }
}

class App {
  constructor() {
    this.document = document;

    this.eventBus = EventBus;
    this.playerService = new GuestPlayerService();

    this.navigation = null;
    this.components = null;
    this.modalManager = null;

    this.progressionService = null;
    this.economyService = null;
    this.inventoryService = null;
    this.settingsService = null;
    this.rankService = null;

    this.screenInstances = new Map();

    this.initialized = false;
    this.destroyed = false;
    this.loadingElement = null;
  }

  async initialize() {
    if (this.initialized) return this;

    this.showLoading("Preparing the Royal Chess World...");

    try {
      this.playerService.initialize();

      this.components = new UIComponents({
        eventBus: this.eventBus,
        document: this.document
      });

      this.modalManager = new ModalManager({
        eventBus: this.eventBus,
        document: this.document
      });

      this.modalManager.initialize();

      this.progressionService = new ProgressionService({
        playerService: this.playerService
      });

      this.progressionService.initialize(this.playerService);

      this.economyService = new EconomyService({
        playerService: this.playerService
      });

      this.economyService.initialize({
        playerService: this.playerService
      });

      this.inventoryService = new InventoryService({
        playerService: this.playerService,
        economyService: this.economyService
      });

      this.inventoryService.initialize({
        playerService: this.playerService,
        economyService: this.economyService
      });

      this.settingsService = new SettingsService({
        playerService: this.playerService,
        eventBus: this.eventBus
      });

      this.settingsService.initialize();

      this.rankService = new RankService({
        playerService: this.playerService
      });

      this.rankService.initialize(this.playerService);

      this.navigation = new Navigation({
        document: this.document,
        eventBus: this.eventBus
      });

      const container = this.document.getElementById("screen-container");

      if (!container) {
        throw new Error("Screen container was not found.");
      }

      this.navigation.initialize(container);

      this.registerRoutes();

      await this.navigation.navigate("home", {}, {
        skipHistory: true,
        force: true
      });

      this.initialized = true;
      this.hideLoading();

      this.eventBus.emit(APP_EVENTS.APP.READY, {
        version: APP_VERSION
      });

      return this;
    } catch (error) {
      console.error("[APPARA CHESS] Startup failed:", error);
      this.showFatalError(error);
      throw error;
    }
  }

  getScreenOptions(container, extra = {}) {
    return {
      container,
      navigation: this.navigation,
      playerService: this.playerService,
      progressionService: this.progressionService,
      economyService: this.economyService,
      inventoryService: this.inventoryService,
      settingsService: this.settingsService,
      rankService: this.rankService,
      components: this.components,
      modalManager: this.modalManager,
      eventBus: this.eventBus,
      ...extra
    };
  }

/* =========================================================
   FILE 64 — PART 1 END
   PART 2 इसी के तुरंत बाद पेस्ट करें।
   ========================================================= */

   /* =========================================================
   APPARA CHESS — MAIN APPLICATION
   FILE 64: js/app.js
   PART 2/2
   ========================================================= */

  createScreen(container, ScreenClass, extra = {}) {
    const screen = new ScreenClass(
      this.getScreenOptions(container, extra)
    );

    this.screenInstances.set(
      this.navigation.getCurrentRoute() || "pending",
      screen
    );

    return screen;
  }

  async renderScreen(ScreenClass, extra = {}) {
    const container = this.document.createElement("div");

    container.className = "ac-screen-content";

    const screen = this.createScreen(
      container,
      ScreenClass,
      extra
    );

    if (typeof screen.mount === "function") {
      await screen.mount(container);
    } else if (typeof screen.initialize === "function") {
      await screen.initialize(container);
    } else {
      throw new Error("Screen has no mount or initialize method.");
    }

    return container;
  }

  registerRoutes() {
    const routes = [
      {
        name: "home",
        title: "Home",
        Screen: HomeScreen,
        method: "initialize"
      },
      {
        name: "online",
        title: "Online Arena",
        Screen: OnlineScreen,
        method: "mount"
      },
      {
        name: "training",
        title: "Training",
        Screen: TrainingScreen,
        method: "mount"
      },
      {
        name: "puzzles",
        title: "Puzzles",
        Screen: PuzzlesScreen,
        method: "mount"
      },
      {
        name: "tournaments",
        title: "Tournaments",
        Screen: TournamentScreen,
        method: "mount"
      },
      {
        name: "world",
        title: "Chess World",
        Screen: WorldScreen,
        method: "mount"
      },
      {
        name: "shop",
        title: "Royal Shop",
        Screen: ShopScreen,
        method: "mount"
      },
      {
        name: "leaderboard",
        title: "Leaderboard",
        Screen: LeaderboardScreen,
        method: "mount"
      },
      {
        name: "profile",
        title: "Player Profile",
        Screen: ProfileScreen,
        method: "mount"
      },
      {
        name: "settings",
        title: "Settings",
        Screen: SettingsScreen,
        method: "mount"
      },
      {
        name: "about",
        title: "About APPARA CHESS",
        Screen: AboutScreen,
        method: "mount"
      }
    ];

    for (const route of routes) {
      this.navigation.register(route.name, {
        title: route.title,

        render: async ({ params }) => {
          const screenContainer = this.document.createElement("div");

          screenContainer.className = "ac-screen-content";

          const screen = this.createScreen(
            screenContainer,
            route.Screen,
            {
              routeParams: params
            }
          );

          if (typeof screen[route.method] !== "function") {
            throw new Error(
              `${route.name} screen is missing ${route.method}().`
            );
          }

          await screen[route.method](screenContainer);

          return screenContainer;
        }
      });
    }

    this.navigation.register("game", {
      title: "Chess Game",

      render: async () => {
        const container = this.document.createElement("section");

        container.className = "ac-screen-content ac-screen-placeholder";

        container.innerHTML = `
          <div class="ac-feature-placeholder">
            <div class="ac-feature-placeholder__icon">♟</div>
            <h1>Chess Arena</h1>
            <p>The game arena is being connected.</p>
            <button type="button" data-app-home>
              Back to Home
            </button>
          </div>
        `;

        container.querySelector("[data-app-home]")
          ?.addEventListener("click", () => {
            this.navigation.navigate("home");
          });

        return container;
      }
    });

    this.navigation.register("auth", {
      title: "Player Account",

      render: async () => {
        const container = this.document.createElement("section");

        container.className = "ac-screen-content ac-screen-placeholder";

        container.innerHTML = `
          <div class="ac-feature-placeholder">
            <div class="ac-feature-placeholder__icon">♔</div>
            <h1>Player Account</h1>
            <p>Guest mode is active. Account sign-in will be connected separately.</p>
            <button type="button" data-app-home>
              Continue as Guest
            </button>
          </div>
        `;

        container.querySelector("[data-app-home]")
          ?.addEventListener("click", () => {
            this.navigation.navigate("home");
          });

        return container;
      }
    });

    this.navigation.register("review", {
      title: "Game Review",

      render: async () => {
        const container = this.document.createElement("section");

        container.className = "ac-screen-content ac-screen-placeholder";

        container.innerHTML = `
          <div class="ac-feature-placeholder">
            <div class="ac-feature-placeholder__icon">♜</div>
            <h1>Game Review</h1>
            <p>Game review will be available after the game arena integration.</p>
            <button type="button" data-app-home>
              Back to Home
            </button>
          </div>
        `;

        container.querySelector("[data-app-home]")
          ?.addEventListener("click", () => {
            this.navigation.navigate("home");
          });

        return container;
      }
    });
  }

  showLoading(message = "Loading...") {
    const loading = this.document.getElementById("loading-screen");

    if (!loading) return;

    this.loadingElement = loading;
    loading.style.display = "flex";
    loading.setAttribute("aria-hidden", "false");

    const status = loading.querySelector(".loading-status");

    if (status) {
      status.textContent = message;
    }
  }

  hideLoading() {
    const loading = this.loadingElement ||
      this.document.getElementById("loading-screen");

    if (!loading) return;

    loading.style.display = "none";
    loading.setAttribute("aria-hidden", "true");
  }

  showFatalError(error) {
    this.hideLoading();

    const container = this.document.getElementById("screen-container");

    if (!container) return;

    const message = String(
      error?.message || "An unexpected startup error occurred."
    );

    const section = this.document.createElement("section");

    section.className = "ac-fatal-error";

    const heading = this.document.createElement("h1");
    heading.textContent = "APPARA CHESS";

    const title = this.document.createElement("h2");
    title.textContent = "Unable to start the game";

    const description = this.document.createElement("p");
    description.textContent = message;

    const retry = this.document.createElement("button");
    retry.type = "button";
    retry.textContent = "Try Again";

    retry.addEventListener("click", () => {
      window.location.reload();
    });

    section.append(heading, title, description, retry);

    container.replaceChildren(section);
  }

  async destroy() {
    if (this.destroyed) return;

    this.destroyed = true;

    for (const screen of this.screenInstances.values()) {
      try {
        if (typeof screen.destroy === "function") {
          screen.destroy();
        } else if (typeof screen.dispose === "function") {
          screen.dispose();
        }
      } catch (error) {
        console.warn("Screen cleanup failed:", error);
      }
    }

    this.screenInstances.clear();

    const services = [
      this.rankService,
      this.inventoryService,
      this.economyService,
      this.progressionService,
      this.settingsService,
      this.components,
      this.modalManager,
      this.navigation,
      this.playerService
    ];

    for (const service of services) {
      try {
        if (typeof service?.dispose === "function") {
          service.dispose();
        }
      } catch (error) {
        console.warn("Service cleanup failed:", error);
      }
    }

    this.initialized = false;
  }
}

/* =========================================================
   APPLICATION STARTUP
   ========================================================= */

let appInstance = null;

export function getApp() {
  return appInstance;
}

export async function startApp() {
  if (appInstance?.initialized) {
    return appInstance;
  }

  appInstance = new App();

  await appInstance.initialize();

  return appInstance;
}

export async function stopApp() {
  if (!appInstance) return;

  await appInstance.destroy();

  appInstance = null;
}

/* =========================================================
   GLOBAL ERROR HANDLING
   ========================================================= */

window.addEventListener("error", event => {
  console.error("[APPARA CHESS] Runtime error:", event.error || event.message);
});

window.addEventListener("unhandledrejection", event => {
  console.error("[APPARA CHESS] Unhandled promise:", event.reason);
});

/* =========================================================
   START APPLICATION WHEN DOM IS READY
   ========================================================= */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      startApp().catch(error => {
        console.error("[APPARA CHESS] Could not start:", error);
      });
    },
    { once: true }
  );
} else {
  startApp().catch(error => {
    console.error("[APPARA CHESS] Could not start:", error);
  });
}

/* =========================================================
   FILE 64 COMPLETE
   PATH: js/app.js
   ========================================================= */
