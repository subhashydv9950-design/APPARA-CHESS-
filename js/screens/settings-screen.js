/* =========================================================
   APPARA CHESS
   FILE 63: js/screens/settings-screen.js
   Settings Screen
   ========================================================= */

import { escapeHTML } from "../core/dom-utils.js";

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
    this.saving = false;
    this.message = "";

    this.defaults = {
      musicEnabled: true,
      soundEffectsEnabled: true,
      masterVolume: 75,
      musicVolume: 60,
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
          <button class="icon-button"
            data-action="back"
            aria-label="Go back">←</button>

          <div class="screen-heading">
            <span class="eyebrow">PERSONALIZE YOUR EXPERIENCE</span>
            <h1>Settings</h1>
          </div>

          <button class="icon-button"
            data-action="reset"
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

  async loadSettings() {
    if (this.loading || this.destroyed) return;

    this.loading = true;

    try {
      let savedSettings = {};

      if (
        this.settingsService &&
        typeof this.settingsService.getAll === "function"
      ) {
        savedSettings = await this.settingsService.getAll() || {};
      } else if (
        this.settingsService &&
        typeof this.settingsService.get === "function"
      ) {
        const result = await this.settingsService.get();
        savedSettings = result || {};
      }

      this.settings = {
        ...this.defaults,
        ...savedSettings
      };

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
    const content =
      this.container?.querySelector("[data-settings-content]");

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
        <button class="secondary-button"
          data-action="reset">
          Reset All Settings
        </button>

        <p>APPARA CHESS</p>
        <span>The Royal Chess Experience</span>
      </section>
    `;
  }

  renderAudioSection() {
    return `
      <section class="settings-section">
        <div class="settings-section-heading">
          <span class="settings-section-icon">♫</span>
          <div>
            <h3>Audio & Music</h3>
            <p>Control your game sound experience</p>
          </div>
        </div>

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

        ${this.renderSlider(
          "masterVolume",
          "Master Volume",
          0,
          100
        )}

        ${this.renderSlider(
          "musicVolume",
          "Music Volume",
          0,
          100
        )}

        ${this.renderSlider(
          "effectsVolume",
          "Effects Volume",
          0,
          100
        )}
      </section>
    `;
  }

  renderGraphicsSection() {
    return `
      <section class="settings-section">
        <div class="settings-section-heading">
          <span class="settings-section-icon">✧</span>
          <div>
            <h3>Graphics & Visuals</h3>
            <p>Customize the 3D chess experience</p>
          </div>
        </div>

        <div class="settings-control-row">
          <div class="settings-control-info">
            <strong>Graphics Quality</strong>
            <small>Choose visual performance level</small>
          </div>

          <select data-setting="graphicsQuality">
            ${this.renderOptions([
              ["low", "Low"],
              ["medium", "Medium"],
              ["high", "High"],
              ["ultra", "Ultra"]
            ], this.settings.graphicsQuality)}
          </select>
        </div>

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
        <div class="settings-section-heading">
          <span class="settings-section-icon">♟</span>
          <div>
            <h3>Gameplay</h3>
            <p>Configure your chess preferences</p>
          </div>
        </div>

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

        <div class="settings-control-row">
          <div class="settings-control-info">
            <strong>Move Animation Speed</strong>
            <small>Control piece movement speed</small>
          </div>

          <select data-setting="moveAnimationSpeed">
            ${this.renderOptions([
              ["slow", "Slow"],
              ["normal", "Normal"],
              ["fast", "Fast"]
            ], this.settings.moveAnimationSpeed)}
          </select>
        </div>
      </section>
    `;
  }

  renderPrivacySection() {
    return `
      <section class="settings-section">
        <div class="settings-section-heading">
          <span class="settings-section-icon">◇</span>
          <div>
            <h3>Privacy & Online</h3>
            <p>Manage your online visibility</p>
          </div>
        </div>

        ${this.renderToggle(
          "showOnlineStatus",
          "Show Online Status",
          "Let friends see when you are online"
        )}

        <div class="settings-control-row">
          <div class="settings-control-info">
            <strong>Friend Requests</strong>
            <small>Who can send you requests</small>
          </div>

          <select data-setting="friendRequests">
            ${this.renderOptions([
              ["everyone", "Everyone"],
              ["friends_of_friends", "Friends of Friends"],
              ["nobody", "Nobody"]
            ], this.settings.friendRequests)}
          </select>
        </div>

        <div class="settings-control-row">
          <div class="settings-control-info">
            <strong>Game Invitations</strong>
            <small>Who can invite you to play</small>
          </div>

          <select data-setting="gameInvites">
            ${this.renderOptions([
              ["everyone", "Everyone"],
              ["friends", "Friends Only"],
              ["nobody", "Nobody"]
            ], this.settings.gameInvites)}
          </select>
        </div>

        <div class="settings-control-row">
          <div class="settings-control-info">
            <strong>Chat Mode</strong>
            <small>Keep online communication safe</small>
          </div>

          <select data-setting="chatMode">
            ${this.renderOptions([
              ["preset", "Preset Messages Only"],
              ["friends_only", "Friends Only"],
              ["disabled", "Disabled"]
            ], this.settings.chatMode)}
          </select>
        </div>

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
        <div class="settings-section-heading">
          <span class="settings-section-icon">♢</span>
          <div>
            <h3>Notifications</h3>
            <p>Choose which updates you receive</p>
          </div>
        </div>

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
        <div class="settings-section-heading">
          <span class="settings-section-icon">◎</span>
          <div>
            <h3>Accessibility</h3>
            <p>Make the experience comfortable</p>
          </div>
        </div>

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
        <div class="settings-section-heading">
          <span class="settings-section-icon">⚙</span>
          <div>
            <h3>General</h3>
            <p>Language and appearance</p>
          </div>
        </div>

        <div class="settings-control-row">
          <div class="settings-control-info">
            <strong>Language</strong>
            <small>Choose app display language</small>
          </div>

          <select data-setting="language">
            ${this.renderOptions([
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
            ], this.settings.language)}
          </select>
        </div>

        <div class="settings-control-row">
          <div class="settings-control-info">
            <strong>App Theme</strong>
            <small>Choose the visual theme</small>
          </div>

          <select data-setting="theme">
            ${this.renderOptions([
              ["royal", "Royal Purple"],
              ["dark", "Midnight Dark"],
              ["gold", "Golden Palace"],
              ["light", "Classic Light"]
            ], this.settings.theme)}
          </select>
        </div>
      </section>
    `;
  }

  renderToggle(key, title, description) {
    const checked = Boolean(this.settings[key]);

    return `
      <label class="settings-toggle-row">
        <span class="settings-control-info">
          <strong>${this.escape(title)}</strong>
          <small>${this.escape(description)}</small>
        </span>

        <input
          type="checkbox"
          data-setting="${this.escape(key)}"
          ${checked ? "checked" : ""}
        >

        <span class="settings-toggle-ui"></span>
      </label>
    `;
  }

  renderSlider(key, title, min, max) {
    const value = this.clamp(
      this.settings[key],
      min,
      max
    );

    return `
      <div class="settings-slider-row">
        <div class="settings-slider-heading">
          <strong>${this.escape(title)}</strong>
          <span data-value-for="${this.escape(key)}">
            ${value}%
          </span>
        </div>

        <input
          type="range"
          min="${min}"
          max="${max}"
          value="${value}"
          data-setting="${this.escape(key)}"
        >
      </div>
    `;
  }

  renderOptions(options, selected) {
    return options.map(([value, label]) => `
      <option
        value="${this.escape(value)}"
        ${selected === value ? "selected" : ""}
      >
        ${this.escape(label)}
      </option>
    `).join("");
  }

  async handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button || !this.container.contains(button)) return;

    switch (button.dataset.action) {
      case "back":
        this.goBack();
        break;

      case "reset":
        await this.resetSettings();
        break;
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
    if (!(key in this.defaults)) return false;

    const previousValue = this.settings[key];

    this.settings[key] = value;
    this.message = "";

    this.applyLocalSetting(key, value);

    try {
      const saved = await this.persistSetting(key, value);

      if (!saved) {
        throw new Error("Settings service unavailable.");
      }

      this.emitSettingChanged(key, value);
      return true;
    } catch (error) {
      console.error(`Could not save setting ${key}:`, error);

      this.settings[key] = previousValue;
      this.applyLocalSetting(key, previousValue);

      this.message = "Setting could not be saved. Previous value restored.";
      this.render();

      return false;
    }
  }

  async persistSetting(key, value) {
    if (!this.settingsService) return false;

    if (typeof this.settingsService.set === "function") {
      const result = await this.settingsService.set(key, value);
      return result !== false;
    }

    if (typeof this.settingsService.update === "function") {
      const result = await this.settingsService.update({
        [key]: value
      });

      return result !== false;
    }

    return false;
  }

  applyLocalSetting(key, value) {
    if (key === "reducedMotion") {
      document.documentElement.classList.toggle(
        "reduced-motion",
        Boolean(value)
      );
    }

    if (key === "theme") {
      document.documentElement.dataset.theme = value;
    }

    if (key === "language") {
      document.documentElement.lang = value;
    }

    if (
      key === "masterVolume" ||
      key === "musicVolume" ||
      key === "effectsVolume" ||
      key === "musicEnabled" ||
      key === "soundEffectsEnabled"
    ) {
      this.eventBus?.emit?.("settings:audio-changed", {
        musicEnabled: this.settings.musicEnabled,
        soundEffectsEnabled: this.settings.soundEffectsEnabled,
        masterVolume: this.settings.masterVolume,
        musicVolume: this.settings.musicVolume,
        effectsVolume: this.settings.effectsVolume
      });
    }

    if (
      key === "graphicsQuality" ||
      key === "shadowsEnabled" ||
      key === "reflectionsEnabled" ||
      key === "particlesEnabled" ||
      key === "animationsEnabled" ||
      key === "cameraEffectsEnabled"
    ) {
      this.eventBus?.emit?.("settings:graphics-changed", {
        ...this.settings
      });
    }
  }

  emitSettingChanged(key, value) {
    this.eventBus?.emit?.("settings:changed", {
      key,
      value
    });
  }

  async resetSettings() {
    const confirmed = await this.confirmReset();

    if (!confirmed) return;

    const previousSettings = { ...this.settings };
    this.settings = { ...this.defaults };

    try {
      if (
        this.settingsService &&
        typeof this.settingsService.reset === "function"
      ) {
        const result = await this.settingsService.reset();

        if (result === false) {
          throw new Error("Reset failed.");
        }
      } else if (
        this.settingsService &&
        typeof this.settingsService.set === "function"
      ) {
        for (const [key, value] of Object.entries(this.defaults)) {
          await this.settingsService.set(key, value);
        }
      } else {
        throw new Error("Settings service unavailable.");
      }

      this.message = "Settings restored to defaults.";

      for (const [key, value] of Object.entries(this.settings)) {
        this.applyLocalSetting(key, value);
      }

      this.render();
      this.eventBus?.emit?.("settings:reset", { ...this.settings });
    } catch (error) {
      console.error("Settings reset failed:", error);

      this.settings = previousSettings;
      this.message = "Could not reset settings. Please try again.";
      this.render();
    }
  }

  async confirmReset() {
    if (
      this.modalManager &&
      typeof this.modalManager.confirm === "function"
    ) {
      return Boolean(
        await this.modalManager.confirm({
          title: "Reset Settings?",
          message: "All preferences will return to their default values.",
          confirmText: "Reset",
          cancelText: "Cancel"
        })
      );
    }

    return false;
  }

  clamp(value, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) return min;

    return Math.min(max, Math.max(min, number));
  }

  escape(value) {
    if (typeof escapeHTML === "function") {
      return escapeHTML(String(value ?? ""));
    }

    const element = document.createElement("span");
    element.textContent = String(value ?? "");
    return element.innerHTML;
  }

  goBack() {
    if (
      this.navigation &&
      typeof this.navigation.back === "function"
    ) {
      this.navigation.back();
      return;
    }

    if (
      this.navigation &&
      typeof this.navigation.navigate === "function"
    ) {
      this.navigation.navigate("home");
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

/* ================= FILE 63 END ================= */
