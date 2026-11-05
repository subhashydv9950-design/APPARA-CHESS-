/* =========================================================
   APPARA CHESS
   CORRECTION 19 — PART 1/2
   FILE: js/app.js
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

import { FirebaseBootstrap } from "./services/firebase-bootstrap.js";
import { AuthScreen } from "./screens/auth-screen.js";

import { HomeScreen } from "./screens/home-screen.js";
import { GameScreen } from "./screens/game-screen.js";
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

import { createGameSession } from "./chess/game-session.js";

const APP_VERSION = "1.2.0";

/* ---------------------------------------------------------
   OFFLINE GUEST PLAYER
   --------------------------------------------------------- */

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
      console.warn("Guest profile load failed:", error);
    }

    this.profile = saved || this.createProfile();
    this.profile.isGuest = true;

    this.profile.stats ||= {
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: 0
    };

    this.profile.ratings ||= {
      bullet: 1000,
      blitz: 1000,
      rapid: 1000,
      classical: 1000
    };

    this.profile.coins ??= 2500;
    this.profile.diamonds ??= 0;
    this.profile.level ??= 1;
    this.profile.xp ??= 0;

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
    return this.profile
      ? JSON.parse(JSON.stringify(this.profile))
      : null;
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

/* ---------------------------------------------------------
   MAIN APP CLASS
   --------------------------------------------------------- */

class App {
  constructor() {
    this.document = document;
    this.eventBus = EventBus;

    this.playerService = new GuestPlayerService();

    this.firebaseBootstrap = new FirebaseBootstrap();
    this.firebaseService = null;
    this.authService = null;
    this.firebaseAvailable = false;

    this.navigation = null;
    this.components = null;
    this.modalManager = null;

    this.progressionService = null;
    this.economyService = null;
    this.inventoryService = null;
    this.settingsService = null;
    this.rankService = null;

    this.screenInstances = new Map();
    this.activeGameSession = null;

    this.initialized = false;
    this.destroyed = false;
    this.loadingElement = null;
  }

  /* -------------------------------------------------------
     INITIALIZE APPLICATION
     ------------------------------------------------------- */

  async initialize() {
    if (this.initialized) return this;

    this.showLoading("Preparing the Royal Chess World...");

    try {
      this.playerService.initialize();

      // Firebase failure must not block offline guest mode.
      try {
        const services = await this.firebaseBootstrap.initialize();

        this.firebaseService = services.firebaseService;
        this.authService = services.authService;
        this.firebaseAvailable = true;

        console.info("[APPARA CHESS] Firebase initialized.");
      } catch (firebaseError) {
        this.firebaseAvailable = false;

        console.warn(
          "[APPARA CHESS] Firebase unavailable. Offline mode remains active.",
          firebaseError
        );
      }

      this.components = new UIComponents({
        eventBus: this.eventBus,
        document: this.document
      });

      this.modalManager = new ModalManager({
        eventBus: this.eventBus,
        document: this.document
      });

      this.modalManager.initialize();

      this.initializeGameServices();

      this.navigation = new Navigation({
        document: this.document,
        eventBus: this.eventBus
      });

      const container = this.document.getElementById(
        "screen-container"
      );

      if (!container) {
        throw new Error("Screen container was not found.");
      }

      this.navigation.initialize(container);
      this.registerRoutes();

      const opened = await this.navigation.navigate(
        "home",
        {},
        {
          skipHistory: true,
          force: true
        }
      );

      if (!opened) {
        throw new Error("Home screen could not be opened.");
      }

      this.initialized = true;
      this.hideLoading();

      this.eventBus.emit(APP_EVENTS.APP.READY, {
        version: APP_VERSION,
        firebaseAvailable: this.firebaseAvailable
      });

      return this;

    } catch (error) {
      console.error("[APPARA CHESS] Startup failed:", error);
      this.showFatalError(error);
      throw error;
    }
  }

  /* -------------------------------------------------------
     INITIALIZE GAME SERVICES
     ------------------------------------------------------- */

  initializeGameServices() {
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
  }

  /* -------------------------------------------------------
     SCREEN OPTIONS
     ------------------------------------------------------- */

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
      authService: this.authService,
      firebaseService: this.firebaseService,
      ...extra
    };
  }

/* =========================================================
   CORRECTION 19 — PART 1 COMPLETE
   FILE NOT COMPLETE YET
   NEXT: PART 2/2 — APP ROUTES AND CLEANUP
   ========================================================= */
   
/* =========================================================
   APPARA CHESS
   CORRECTION 19 — PART 2/2
   FILE: js/app.js
   CONTINUE INSIDE App CLASS
   ========================================================= */

  /* -------------------------------------------------------
     SCREEN ROUTES
     ------------------------------------------------------- */

  registerRoutes() {
    const routes = [
      ["home", HomeScreen, "APPARA CHESS"],
      ["online", OnlineScreen, "Online Chess"],
      ["training", TrainingScreen, "Training"],
      ["puzzles", PuzzlesScreen, "Chess Puzzles"],
      ["tournaments", TournamentScreen, "Tournaments"],
      ["world", WorldScreen, "Chess World"],
      ["shop", ShopScreen, "Royal Shop"],
      ["leaderboard", LeaderboardScreen, "Leaderboard"],
      ["profile", ProfileScreen, "Player Profile"],
      ["settings", SettingsScreen, "Settings"],
      ["about", AboutScreen, "About APPARA CHESS"]
    ];

    for (const [name, ScreenClass, title] of routes) {
      this.navigation.register(name, {
        title,

        render: async ({ params = {} }) => {
          return this.renderScreen(name, ScreenClass, params);
        },

        afterLeave: async () => {
          this.destroyScreen(name);
        }
      });
    }

    this.navigation.register("auth", {
      title: "Player Login",

      render: async () => {
        this.destroyScreen("auth");

        if (!this.authService || !this.firebaseAvailable) {
          return this.createMessageScreen(
            "Account Login",
            "Firebase is currently unavailable. You can continue playing offline as a guest."
          );
        }

        const mountNode = this.document.createElement("div");
        mountNode.className = "ac-screen-content";

        const screen = new AuthScreen({
          authService: this.authService,
          modalManager: this.modalManager,
          components: this.components,
          navigation: this.navigation,

          onAuthSuccess: async (user, options = {}) => {
            if (options.guest) {
              return true;
            }

            // Authentication is complete. Keep the current
            // offline game profile active until cloud profile
            // synchronization is integrated separately.
            this.authenticatedUser = user;

            await this.navigation.navigate("home", {
              authenticated: true
            });

            return true;
          }
        });

        this.screenInstances.set("auth", screen);
        screen.initialize(mountNode);

        return mountNode;
      },

      afterLeave: async () => {
        this.destroyScreen("auth");
      }
    });

    this.navigation.register("game", {
      title: "Chess Match",

      render: async ({ params = {} }) => {
        return this.renderGameScreen(params);
      },

      afterLeave: async () => {
        this.destroyGameScreen();
      }
    });

    this.navigation.register("review", {
      title: "Game Review",

      render: async () => this.createMessageScreen(
        "Game Review",
        "Game review screen is being prepared."
      )
    });
  }

  /* -------------------------------------------------------
     CREATE SCREEN
     ------------------------------------------------------- */

  renderScreen(name, ScreenClass, params = {}) {
    this.destroyScreen(name);

    const mountNode = this.document.createElement("div");
    mountNode.className = "ac-screen-content";

    const options = this.getScreenOptions(mountNode, {
      ...params
    });

    const screen = new ScreenClass(options);
    this.screenInstances.set(name, screen);

    if (
      name === "home" &&
      typeof screen.initialize === "function"
    ) {
      screen.initialize(mountNode);
    } else if (typeof screen.mount === "function") {
      screen.mount(mountNode);
    } else if (typeof screen.initialize === "function") {
      screen.initialize(mountNode);
    }

    return screen.root || mountNode;
  }

  /* -------------------------------------------------------
     GAME SCREEN
     ------------------------------------------------------- */

  renderGameScreen(params = {}) {
    this.destroyGameScreen();

    const mountNode = this.document.createElement("div");
    mountNode.className = "ac-game-container";

    const mode = params.mode === "training"
      ? "training"
      : "offline";

    const difficulty = params.difficulty || "medium";
    const timeControl = this.getTimeControl(params.timeControl);

    this.activeGameSession = createGameSession({
      mode,
      difficulty,
      timeControl,
      playerName: this.playerService?.getDisplayName?.() || "You",
      opponentName: "APPARA AI",
      rated: false
    });

    const gameScreen = new GameScreen({
      document: this.document,
      container: mountNode,
      navigation: this.navigation,
      gameState: this.activeGameSession.gameState,
      aiEngine: this.activeGameSession.aiEngine,
      playerService: this.playerService,
      modalManager: this.modalManager,
      mode,
      difficulty,
      playerColor: "white",
      timeControl
    });

    this.screenInstances.set("game", gameScreen);

    const result = gameScreen.mount(mountNode);
    return result || gameScreen.root || mountNode;
  }

  /* -------------------------------------------------------
     TIME CONTROL
     ------------------------------------------------------- */

  getTimeControl(value) {
    const controls = {
      "1+0": { id: "1+0", label: "Bullet 1+0", minutes: 1, increment: 0 },
      "2+1": { id: "2+1", label: "Bullet 2+1", minutes: 2, increment: 1 },
      "3+0": { id: "3+0", label: "Blitz 3+0", minutes: 3, increment: 0 },
      "3+2": { id: "3+2", label: "Blitz 3+2", minutes: 3, increment: 2 },
      "5+0": { id: "5+0", label: "Blitz 5+0", minutes: 5, increment: 0 },
      "5+3": { id: "5+3", label: "Blitz 5+3", minutes: 5, increment: 3 },
      "10+0": { id: "10+0", label: "Rapid 10+0", minutes: 10, increment: 0 },
      "10+5": { id: "10+5", label: "Rapid 10+5", minutes: 10, increment: 5 },
      "15+10": { id: "15+10", label: "Rapid 15+10", minutes: 15, increment: 10 },
      "30+0": { id: "30+0", label: "Classical 30+0", minutes: 30, increment: 0 }
    };

    return controls[value] || controls["10+0"];
  }

  /* -------------------------------------------------------
     SCREEN CLEANUP
     ------------------------------------------------------- */

  destroyScreen(name) {
    const screen = this.screenInstances.get(name);
    if (!screen) return;

    try {
      if (typeof screen.destroy === "function") {
        screen.destroy();
      } else if (typeof screen.dispose === "function") {
        screen.dispose();
      }
    } catch (error) {
      console.error(
        `[APPARA CHESS] ${name} cleanup failed:`,
        error
      );
    }

    this.screenInstances.delete(name);
  }

  destroyGameScreen() {
    this.destroyScreen("game");

    if (this.activeGameSession) {
      this.activeGameSession.dispose();
      this.activeGameSession = null;
    }
  }

  /* -------------------------------------------------------
     MESSAGE SCREEN
     ------------------------------------------------------- */

  createMessageScreen(title, message) {
    const section = this.document.createElement("section");
    section.className =
      "ac-screen-content ac-placeholder-screen";

    const heading = this.document.createElement("h1");
    heading.textContent = title;

    const paragraph = this.document.createElement("p");
    paragraph.textContent = message;

    const backButton = this.document.createElement("button");
    backButton.type = "button";
    backButton.textContent = "Back to Home";

    backButton.addEventListener("click", () => {
      this.navigation.navigate("home");
    });

    section.append(heading, paragraph, backButton);
    return section;
  }

  /* -------------------------------------------------------
     LOADING
     ------------------------------------------------------- */

  showLoading(message = "Loading APPARA CHESS...") {
    const loading = this.document.getElementById("loading-screen");

    if (loading) {
      loading.hidden = false;
      loading.style.display = "flex";

      const textElement = loading.querySelector(
        "[data-loading-message]"
      );

      if (textElement) {
        textElement.textContent = message;
      }
    }

    const appView = this.document.getElementById("app-view");

    if (appView) {
      appView.setAttribute("aria-busy", "true");
    }
  }

  hideLoading() {
    const loading = this.document.getElementById("loading-screen");

    if (loading) {
      loading.hidden = true;
      loading.style.display = "none";
    }

    const appView = this.document.getElementById("app-view");

    if (appView) {
      appView.removeAttribute("aria-busy");
      appView.hidden = false;
    }
  }

  /* -------------------------------------------------------
     FATAL ERROR
     ------------------------------------------------------- */

  showFatalError(error) {
    console.error("[APPARA CHESS] Startup failed:", error);

    const loading = this.document.getElementById("loading-screen");

    if (loading) {
      loading.innerHTML = `
        <div class="ac-error-screen">
          <h2>APPARA CHESS</h2>
          <p>Game start nahi ho paya.</p>
          <button type="button" id="ac-retry-button">
            Try Again
          </button>
        </div>
      `;

      loading.hidden = false;
      loading.style.display = "flex";

      loading.querySelector("#ac-retry-button")
        ?.addEventListener("click", () => {
          globalThis.location.reload();
        });
    }

    this.eventBus?.emit?.(APP_EVENTS.APP.ERROR, {
      message: error?.message || "Application startup failed."
    });
  }

  /* -------------------------------------------------------
     SERVICE CLEANUP
     ------------------------------------------------------- */

  disposeService(service, serviceName) {
    if (!service) return;

    try {
      if (typeof service.dispose === "function") {
        service.dispose();
      } else if (typeof service.destroy === "function") {
        service.destroy();
      }
    } catch (error) {
      console.error(
        `[APPARA CHESS] ${serviceName} cleanup failed:`,
        error
      );
    }
  }

  /* -------------------------------------------------------
     APP DISPOSAL
     ------------------------------------------------------- */

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;

    this.destroyGameScreen();

    for (const name of [...this.screenInstances.keys()]) {
      this.destroyScreen(name);
    }

    this.disposeService(this.navigation, "Navigation");
    this.disposeService(this.modalManager, "Modal Manager");
    this.disposeService(this.components, "UI Components");

    this.disposeService(this.progressionService, "Progression Service");
    this.disposeService(this.economyService, "Economy Service");
    this.disposeService(this.inventoryService, "Inventory Service");
    this.disposeService(this.settingsService, "Settings Service");
    this.disposeService(this.rankService, "Rank Service");

    this.disposeService(this.playerService, "Player Service");

    // FirebaseBootstrap owns both FirebaseService and AuthService.
    this.disposeService(this.firebaseBootstrap, "Firebase Bootstrap");

    this.firebaseService = null;
    this.authService = null;
    this.firebaseAvailable = false;

    this.eventBus?.emit?.(APP_EVENTS.APP.ERROR, {
      message: "Application stopped."
    });

    this.initialized = false;
  }
}

/* ---------------------------------------------------------
   APPLICATION INSTANCE
   --------------------------------------------------------- */

let appInstance = null;

export function getApp() {
  return appInstance;
}

export async function startApp() {
  if (appInstance?.initialized) {
    return appInstance;
  }

  appInstance = new App();

  try {
    await appInstance.initialize();
    return appInstance;
  } catch (error) {
    appInstance.showFatalError(error);
    throw error;
  }
}

export function stopApp() {
  if (!appInstance) return;

  appInstance.destroy();
  appInstance = null;
}

/* ---------------------------------------------------------
   GLOBAL ERROR HANDLING
   --------------------------------------------------------- */

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("unhandledrejection", event => {
    console.error(
      "[APPARA CHESS] Unhandled promise:",
      event.reason
    );
  });

  globalThis.addEventListener("error", event => {
    console.error(
      "[APPARA CHESS] Runtime error:",
      event.error || event.message
    );
  });
}

/* ---------------------------------------------------------
   START APPLICATION
   --------------------------------------------------------- */

function bootApp() {
  startApp().catch(error => {
    console.error("[APPARA CHESS] Boot failed:", error);
  });
}

if (globalThis.document) {
  if (globalThis.document.readyState === "loading") {
    globalThis.document.addEventListener(
      "DOMContentLoaded",
      bootApp,
      { once: true }
    );
  } else {
    bootApp();
  }
}

/* =========================================================
   FILE: js/app.js
   FULL FILE COMPLETE — CORRECTION NUMBER 19
   ========================================================= */
     
