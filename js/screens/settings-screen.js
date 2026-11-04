/* =========================================================
   APPARA CHESS
   CORRECTION 11A — PART 1/2
   FILE: js/screens/settings-screen.js
   ========================================================= */

import { escapeHTML } from "../core/dom-utils.js";

const THEME_MAP = {
  royal: "royal-purple",
  dark: "midnight-black",
  gold: "royal-gold",
  light: "classic-wood"
};

const REVERSE_THEME_MAP = {
  "royal-purple": "royal",
  "midnight-black": "dark",
  "royal-gold": "gold",
  "classic-wood": "light"
};

export class SettingsScreen {
  constructor(options = {}) {
    this.settingsService = options.settingsService || null;
    this.navigation = options.navigation || null;
    this.modalManager = options.modalManager || null;
    this.eventBus = options.eventBus || null;
    this.container = options.container || null;

    this.settings = {};
    this.loading = false;
    this.destroyed = false;
    this.message = "";

    this.defaults = {
      musicEnabled: true,
      soundEffectsEnabled: true,
      masterVolume: 80,
      musicVolume: 50,
      effectsVolume: 80,
      graphicsQuality: "high",
      shadowsEnabled: true,
      reflectionsEnabled: true,
      particlesEnabled: true,
      animationsEnabled: true,
      cameraEffectsEnabled: true,
      boardCoordinates: true,
      legalMoveHints: true,
      confirmBeforeResign: true,
      confirmBeforeDraw: true,
      autoQueen: false,
      moveAnimationSpeed: "normal",
      showOnlineStatus: true,
      friendRequests: "everyone",
      gameInvites: "friends",
      chatMode: "preset",
      notificationsEnabled: true,
      friendNotifications: true,
      tournamentNotifications: true,
      rewardNotifications: true,
      reducedMotion: false,
      language: "en",
      theme: "royal"
    };

    this.boundClick = this.handleClick.bind(this);
    this.boundChange = this.handleChange.bind(this);
  }

  async mount(container) {
    this.container = container || this.container;

    if (!this.container) {
      throw new Error("SettingsScreen: container is required.");
    }

    this.destroyed = false;

    this.container.innerHTML = `
      <section class="settings-screen screen">
        <header class="screen-header settings-header">
          <button class="icon-button" data-action="back"
            aria-label="Go back">←</button>

          <div class="screen-heading">
            <span class="eyebrow">PERSONALIZE YOUR EXPERIENCE</span>
            <h1>Settings</h1>
          </div>

          <button class="icon-button" data-action="reset"
            aria-label="Reset settings">↺</button>
        </header>

        <div class="settings-content" data-settings-content>
          <div class="settings-loading">
            <span class="loading-spinner"></span>
            <p>Loading settings...</p>
          </div>
        </div>
      </section>
    `;

    this.container.addEventListener("click", this.boundClick);
    this.container.addEventListener("change", this.boundChange);

    await this.loadSettings();
    return this;
  }

  readServiceSettings() {
    const raw = this.settingsService?.getAll?.() || {};

    const audio = raw.audio || {};
    const graphics = raw.graphics || {};
    const controls = raw.controls || {};
    const gameplay = raw.gameplay || {};
    const privacy = raw.privacy || {};
    const notifications = raw.notifications || {};

    return {
      musicEnabled: audio.musicEnabled ?? true,
      soundEffectsEnabled: audio.soundEnabled ?? true,

      masterVolume: Math.round(
        (audio.masterVolume ?? 0.8) * 100
      ),

      musicVolume: Math.round(
        (audio.musicVolume ?? 0.5) * 100
      ),

      effectsVolume: Math.round(
        (audio.effectsVolume ?? 0.8) * 100
      ),

      graphicsQuality: graphics.quality || "high",
      shadowsEnabled: graphics.shadows ?? true,
      reflectionsEnabled: graphics.reflections ?? true,
      particlesEnabled: graphics.particles ?? true,
      animationsEnabled: controls.showLastMove ?? true,
      cameraEffectsEnabled: graphics.antialias ?? true,

      boardCoordinates: controls.boardCoordinates ?? true,
      legalMoveHints: controls.legalMoveHints ?? true,
      confirmBeforeResign: gameplay.confirmResign ?? true,
      confirmBeforeDraw: gameplay.confirmDraw ?? true,
      autoQueen: controls.autoQueenPromotion ?? false,
      moveAnimationSpeed: "normal",

      showOnlineStatus: privacy.showOnlineStatus ?? true,

      friendRequests:
        privacy.allowFriendRequests === false
          ? "nobody" : "everyone",

      gameInvites:
        privacy.allowGameInvites === false
          ? "nobody" : "friends",

      chatMode: "preset",

      notificationsEnabled: true,
      friendNotifications:
        notifications.friendRequests ?? true,

      tournamentNotifications:
        notifications.tournamentUpdates ?? true,

      rewardNotifications:
        notifications.dailyRewards ?? true,

      reducedMotion: graphics.reducedMotion ?? false,
      language: raw.language || "en",
      theme: REVERSE_THEME_MAP[raw.theme] || "royal"
    };
  }

  async loadSettings() {
    if (this.loading || this.destroyed) return;

    this.loading = true;

    try {
      if (this.settingsService?.initialize) {
        await this.settingsService.initialize();
      }

      this.settings = {
        ...this.defaults,
        ...this.readServiceSettings()
      };

      this.applyAllLocalSettings();

      if (!this.destroyed) {
        this.render();
      }
    } catch (error) {
      console.error("Settings loading failed:", error);

      this.settings = { ...this.defaults };
      this.message = "Saved settings could not be loaded.";

      if (!this.destroyed) {
        this.render();
      }
    } finally {
      this.loading = false;
    }
  }

  render() {
    const content = this.container?.querySelector(
      "[data-settings-content]"
    );

    if (!content) return;

    content.innerHTML = `
      ${this.message ? `
        <div class="settings-message" role="status">
          ${this.escape(this.message)}
        </div>
      ` : ""}

      ${this.renderAudioSection()}
      ${this.renderGraphicsSection()}
      ${this.renderGameplaySection()}
      ${this.renderPrivacySection()}
      ${this.renderNotificationSection()}
      ${this.renderAccessibilitySection()}
      ${this.renderGeneralSection()}

      <section class="settings-footer">
        <button class="secondary-button" data-action="reset">
          Reset All Settings
        </button>

        <p>APPARA CHESS</p>
        <span>The Royal Chess Experience</span>
      </section>
    `;
  }

  sectionHeading(icon, title, description) {
    return `
      <div class="settings-section-heading">
        <span class="settings-section-icon">${icon}</span>

        <div>
          <h3>${title}</h3>
          <p>${description}</p>
        </div>
      </div>
    `;
  }

  renderAudioSection() {
    return `
      <section class="settings-section">
        ${this.sectionHeading(
          "♫",
          "Audio & Music",
          "Control your game sound experience"
        )}

        ${this.renderToggle(
          "musicEnabled",
          "Background Music",
          "Play music in the chess environment"
        )}

        ${this.renderToggle(
          "soundEffectsEnabled",
          "Sound Effects",
          "Piece movement, capture and game sounds"
        )}

        ${this.renderSlider("masterVolume", "Master Volume")}
        ${this.renderSlider("musicVolume", "Music Volume")}
        ${this.renderSlider("effectsVolume", "Effects Volume")}
      </section>
    `;
  }

  renderGraphicsSection() {
    return `
      <section class="settings-section">
        ${this.sectionHeading(
          "✧",
          "Graphics & Visuals",
          "Customize the 3D chess experience"
        )}

        ${this.renderSelect(
          "graphicsQuality",
          "Graphics Quality",
          [
            ["low", "Low"],
            ["medium", "Medium"],
            ["high", "High"],
            ["ultra", "Ultra"]
          ]
        )}

        ${this.renderToggle(
          "shadowsEnabled",
          "Realistic Shadows",
          "Enable 3D object shadows"
        )}

        ${this.renderToggle(
          "reflectionsEnabled",
          "Reflections",
          "Enable reflective materials"
        )}

        ${this.renderToggle(
          "particlesEnabled",
          "Particle Effects",
          "Enable decorative visual effects"
        )}

        ${this.renderToggle(
          "animationsEnabled",
          "Piece Animations",
          "Animate chess piece movement"
        )}

        ${this.renderToggle(
          "cameraEffectsEnabled",
          "Camera Effects",
          "Enable cinematic camera movement"
        )}
      </section>
    `;
  }

  renderGameplaySection() {
    return `
      <section class="settings-section">
        ${this.sectionHeading(
          "♟",
          "Gameplay",
          "Configure your chess preferences"
        )}

        ${this.renderToggle(
          "boardCoordinates",
          "Board Coordinates",
          "Show ranks and files around the board"
        )}

        ${this.renderToggle(
          "legalMoveHints",
          "Legal Move Hints",
          "Highlight available legal squares"
        )}

        ${this.renderToggle(
          "confirmBeforeResign",
          "Confirm Resignation",
          "Ask before resigning a game"
        )}

        ${this.renderToggle(
          "confirmBeforeDraw",
          "Confirm Draw Offer",
          "Confirm before sending a draw offer"
        )}

        ${this.renderToggle(
          "autoQueen",
          "Auto Queen Promotion",
          "Automatically promote to a queen"
        )}

        ${this.renderSelect(
          "moveAnimationSpeed",
          "Move Animation Speed",
          [
            ["slow", "Slow"],
            ["normal", "Normal"],
            ["fast", "Fast"]
          ]
        )}
      </section>
    `;
  }

/* =========================================================
   CORRECTION 11A COMPLETE
   FILE NOT COMPLETE YET
   NEXT: CORRECTION 11B — PART 2/2
   ========================================================= */
  renderPrivacySection() {
    return `
      <section class="settings-section">
        ${this.sectionHeading(
          "◇",
          "Privacy & Online",
          "Manage your online visibility"
        )}

        ${this.renderToggle(
          "showOnlineStatus",
          "Show Online Status",
          "Let friends see when you are online"
        )}

        ${this.renderSelect(
          "friendRequests",
          "Friend Requests",
          [
            ["everyone", "Everyone"],
            ["friends_of_friends", "Friends of Friends"],
            ["nobody", "Nobody"]
          ]
        )}

        ${this.renderSelect(
          "gameInvites",
          "Game Invitations",
          [
            ["everyone", "Everyone"],
            ["friends", "Friends Only"],
            ["nobody", "Nobody"]
          ]
        )}

        ${this.renderSelect(
          "chatMode",
          "Chat Mode",
          [
            ["preset", "Preset Messages Only"],
            ["friends_only", "Friends Only"],
            ["disabled", "Disabled"]
          ]
        )}

        <p class="settings-safety-note">
          APPARA CHESS uses controlled communication options.
          You can also block or report players.
        </p>
      </section>
    `;
  }

  renderNotificationSection() {
    return `
      <section class="settings-section">
        ${this.sectionHeading(
          "♢",
          "Notifications",
          "Choose which updates you receive"
        )}

        ${this.renderToggle(
          "notificationsEnabled",
          "All Notifications",
          "Enable or disable app notifications"
        )}

        ${this.renderToggle(
          "friendNotifications",
          "Friend Activity",
          "Friend requests and invitations"
        )}

        ${this.renderToggle(
          "tournamentNotifications",
          "Tournament Updates",
          "Tournament schedules and results"
        )}

        ${this.renderToggle(
          "rewardNotifications",
          "Rewards & Events",
          "Daily rewards and special events"
        )}
      </section>
    `;
  }

  renderAccessibilitySection() {
    return `
      <section class="settings-section">
        ${this.sectionHeading(
          "◎",
          "Accessibility",
          "Make the experience comfortable"
        )}

        ${this.renderToggle(
          "reducedMotion",
          "Reduce Motion",
          "Reduce camera movement and visual animations"
        )}
      </section>
    `;
  }

  renderGeneralSection() {
    return `
      <section class="settings-section">
        ${this.sectionHeading(
          "⚙",
          "General",
          "Language and appearance"
        )}

        ${this.renderSelect(
          "language",
          "Language",
          [
            ["en", "English"],
            ["hi", "हिन्दी"],
            ["bn", "বাংলা"],
            ["fr", "Français"],
            ["de", "Deutsch"],
            ["es", "Español"],
            ["ja", "日本語"],
            ["zh", "中文"],
            ["ko", "한국어"],
            ["ru", "Русский"]
          ]
        )}

        ${this.renderSelect(
          "theme",
          "App Theme",
          [
            ["royal", "Royal Purple"],
            ["dark", "Midnight Dark"],
            ["gold", "Golden Palace"],
            ["light", "Classic Light"]
          ]
        )}
      </section>
    `;
  }

  renderToggle(key, title, description) {
    return `
      <label class="settings-toggle-row">
        <span class="settings-control-info">
          <strong>${this.escape(title)}</strong>
          <small>${this.escape(description)}</small>
        </span>

        <input
          type="checkbox"
          data-setting="${key}"
          ${this.settings[key] ? "checked" : ""}
        >

        <span class="settings-toggle-ui"></span>
      </label>
    `;
  }

  renderSlider(key, title) {
    const value = this.clamp(this.settings[key], 0, 100);

    return `
      <div class="settings-slider-row">
        <div class="settings-slider-heading">
          <strong>${this.escape(title)}</strong>
          <span data-value-for="${key}">${value}%</span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value="${value}"
          data-setting="${key}"
        >
      </div>
    `;
  }

  renderSelect(key, title, options) {
    return `
      <div class="settings-control-row">
        <div class="settings-control-info">
          <strong>${this.escape(title)}</strong>
        </div>

        <select data-setting="${key}">
          ${options.map(([value, label]) => `
            <option
              value="${this.escape(value)}"
              ${this.settings[key] === value ? "selected" : ""}
            >
              ${this.escape(label)}
            </option>
          `).join("")}
        </select>
      </div>
    `;
  }

  async handleClick(event) {
    const button = event.target.closest("[data-action]");

    if (!button || !this.container.contains(button)) return;

    if (button.dataset.action === "back") {
      this.goBack();
    }

    if (button.dataset.action === "reset") {
      await this.resetSettings();
    }
  }

  async handleChange(event) {
    const control = event.target.closest("[data-setting]");
    if (!control) return;

    const key = control.dataset.setting;
    let value;

    if (control.type === "checkbox") {
      value = control.checked;
    } else if (control.type === "range") {
      value = this.clamp(control.value, 0, 100);
    } else {
      value = control.value;
    }

    await this.updateSetting(key, value);

    if (control.type === "range") {
      const label = this.container.querySelector(
        `[data-value-for="${key}"]`
      );

      if (label) label.textContent = `${value}%`;
    }
  }

  async updateSetting(key, value) {
    if (!Object.hasOwn(this.defaults, key)) return false;

    const previous = this.settings[key];

    this.settings[key] = value;
    this.message = "";

    try {
      this.persistSetting(key, value);
      this.applyLocalSetting(key, value);
      this.emitSettingChanged(key, value);
      return true;
    } catch (error) {
      console.error(`Could not save setting ${key}:`, error);

      this.settings[key] = previous;
      this.applyLocalSetting(key, previous);

      this.message =
        "Setting could not be saved. Previous value restored.";

      this.render();
      return false;
    }
  }

  persistSetting(key, value) {
    const service = this.settingsService;

    if (!service) {
      throw new Error("Settings service unavailable.");
    }

    const set = (section, field, next) => {
      service.set(section, field, next);
    };

    switch (key) {
      case "language":
        service.setLanguage(value);
        break;

      case "theme":
        service.setTheme(THEME_MAP[value] || "royal-purple");
        break;

      case "graphicsQuality":
        service.setGraphicsQuality(value);
        break;

      case "masterVolume":
      case "musicVolume":
      case "effectsVolume":
        service.setVolume(key, Number(value) / 100);
        break;

      case "musicEnabled":
        service.setMusicEnabled(value);
        break;

      case "soundEffectsEnabled":
        service.setSoundEnabled(value);
        break;

      case "shadowsEnabled":
        set("graphics", "shadows", value);
        break;

      case "reflectionsEnabled":
        set("graphics", "reflections", value);
        break;

      case "particlesEnabled":
        set("graphics", "particles", value);
        break;

      case "cameraEffectsEnabled":
        set("graphics", "antialias", value);
        break;

      case "reducedMotion":
        set("graphics", "reducedMotion", value);
        break;

      case "boardCoordinates":
      case "legalMoveHints":
      case "autoQueen":
        set(
          "controls",
          key === "autoQueen" ? "autoQueenPromotion" : key,
          value
        );
        break;

      case "animationsEnabled":
        set("controls", "showLastMove", value);
        break;

      case "confirmBeforeResign":
        set("gameplay", "confirmResign", value);
        break;

      case "confirmBeforeDraw":
        set("gameplay", "confirmDraw", value);
        break;

      case "showOnlineStatus":
        set("privacy", "showOnlineStatus", value);
        break;

      case "friendRequests":
        set("privacy", "allowFriendRequests", value !== "nobody");
        break;

      case "gameInvites":
        set("privacy", "allowGameInvites", value !== "nobody");
        break;

      case "friendNotifications":
        set("notifications", "friendRequests", value);
        break;

      case "tournamentNotifications":
        set("notifications", "tournamentUpdates", value);
        break;

      case "rewardNotifications":
        set("notifications", "dailyRewards", value);
        break;

      case "notificationsEnabled":
        service.updateSection("notifications", {
          friendRequests: value,
          gameInvites: value,
          tournamentUpdates: value,
          dailyRewards: value
        });
        break;

      case "chatMode":
      case "moveAnimationSpeed":
        break;

      default:
        throw new Error(`Unsupported setting: ${key}`);
    }
  }

  applyLocalSetting(key, value) {
    const root = document.documentElement;

    if (key === "reducedMotion") {
      root.classList.toggle("reduced-motion", Boolean(value));
    }

    if (key === "theme") {
      root.dataset.theme = THEME_MAP[value] || "royal-purple";
    }

    if (key === "language") {
      root.lang = value;
    }

    if ([
      "masterVolume",
      "musicVolume",
      "effectsVolume",
      "musicEnabled",
      "soundEffectsEnabled"
    ].includes(key)) {
      this.eventBus?.emit?.("settings:audio-changed", {
        musicEnabled: this.settings.musicEnabled,
        soundEffectsEnabled: this.settings.soundEffectsEnabled,
        masterVolume: this.settings.masterVolume,
        musicVolume: this.settings.musicVolume,
        effectsVolume: this.settings.effectsVolume
      });
    }

    if ([
      "graphicsQuality",
      "shadowsEnabled",
      "reflectionsEnabled",
      "particlesEnabled",
      "animationsEnabled",
      "cameraEffectsEnabled"
    ].includes(key)) {
      this.eventBus?.emit?.("settings:graphics-changed", {
        ...this.settings
      });
    }
  }

  applyAllLocalSettings() {
    for (const [key, value] of Object.entries(this.settings)) {
      this.applyLocalSetting(key, value);
    }
  }

  emitSettingChanged(key, value) {
    this.eventBus?.emit?.("settings:changed", { key, value });
  }

  async resetSettings() {
    const confirmed = await this.confirmReset();

    if (!confirmed) return;

    const previous = { ...this.settings };

    try {
      this.settingsService.reset();

      this.settings = { ...this.defaults };
      this.message = "Settings restored to defaults.";

      this.applyAllLocalSettings();
      this.render();

      this.eventBus?.emit?.("settings:reset", {
        ...this.settings
      });
    } catch (error) {
      console.error("Settings reset failed:", error);

      this.settings = previous;
      this.message = "Could not reset settings. Please try again.";

      this.render();
    }
  }

  async confirmReset() {
    if (typeof this.modalManager?.confirm !== "function") {
      return false;
    }

    return Boolean(await this.modalManager.confirm({
      title: "Reset Settings?",
      message:
        "All preferences will return to their default values.",
      confirmText: "Reset",
      cancelText: "Cancel"
    }));
  }

  clamp(value, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) return min;

    return Math.min(max, Math.max(min, number));
  }

  escape(value) {
    return escapeHTML(String(value ?? ""));
  }

  goBack() {
    if (typeof this.navigation?.back === "function") {
      this.navigation.back();
    } else {
      this.navigation?.navigate?.("home");
    }
  }

  destroy() {
    this.destroyed = true;

    if (this.container) {
      this.container.removeEventListener(
        "click",
        this.boundClick
      );

      this.container.removeEventListener(
        "change",
        this.boundChange
      );

      this.container.innerHTML = "";
    }

    this.settings = {};
    this.container = null;
  }
}

export function createSettingsScreen(options = {}) {
  return new SettingsScreen(options);
}

/* =========================================================
   CORRECTION 11B COMPLETE
   FULL FILE COMPLETE — CORRECTION NUMBER 11
   ========================================================= */
