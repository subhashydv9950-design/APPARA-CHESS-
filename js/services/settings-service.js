
/* =========================================================
   APPARA CHESS — FILE 47
   FILE: js/services/settings-service.js
   SECTION: APPLICATION SETTINGS
   ========================================================= */

import { storage } from "../core/storage.js";

export const SETTINGS_EVENTS = Object.freeze({
  LOADED: "settings:loaded",
  UPDATED: "settings:updated",
  RESET: "settings:reset",
  LANGUAGE_CHANGED: "settings:language-changed",
  THEME_CHANGED: "settings:theme-changed",
  QUALITY_CHANGED: "settings:quality-changed",
  ERROR: "settings:error"
});

export const DEFAULT_SETTINGS = Object.freeze({
  language: "en",
  theme: "royal-purple",

  graphics: {
    quality: "high",
    shadows: true,
    reflections: true,
    particles: true,
    antialias: true,
    reducedMotion: false
  },

  audio: {
    masterVolume: 0.8,
    musicVolume: 0.5,
    effectsVolume: 0.8,
    musicEnabled: true,
    soundEnabled: true
  },

  controls: {
    boardCoordinates: true,
    legalMoveHints: true,
    moveConfirmation: false,
    autoQueenPromotion: false,
    showLastMove: true,
    boardOrientation: "auto"
  },

  gameplay: {
    confirmResign: true,
    confirmDraw: true,
    autoFlipBoard: false,
    showMoveNotation: true,
    showCapturedPieces: true,
    highlightCheck: true
  },

  privacy: {
    showOnlineStatus: true,
    allowFriendRequests: true,
    allowGameInvites: true,
    profileVisibility: "public"
  },

  notifications: {
    friendRequests: true,
    gameInvites: true,
    tournamentUpdates: true,
    dailyRewards: true
  }
});

const STORAGE_KEY = "appara_chess_settings";

const ALLOWED_QUALITIES = [
  "low",
  "medium",
  "high",
  "ultra"
];

const ALLOWED_THEMES = [
  "royal-purple",
  "royal-gold",
  "midnight-black",
  "crystal-blue",
  "emerald",
  "classic-wood"
];

const ALLOWED_ORIENTATIONS = [
  "auto",
  "white",
  "black"
];

const ALLOWED_VISIBILITY = [
  "public",
  "friends",
  "private"
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeObjects(defaults, saved) {
  if (
    !defaults ||
    typeof defaults !== "object" ||
    Array.isArray(defaults)
  ) {
    return saved === undefined ? defaults : saved;
  }

  const result = { ...defaults };

  if (!saved || typeof saved !== "object") {
    return result;
  }

  for (const key of Object.keys(defaults)) {
    if (saved[key] === undefined) continue;

    if (
      defaults[key] &&
      typeof defaults[key] === "object" &&
      !Array.isArray(defaults[key])
    ) {
      result[key] = mergeObjects(
        defaults[key],
        saved[key]
      );
    } else {
      result[key] = saved[key];
    }
  }

  return result;
}

export class SettingsService {
  constructor({ playerService, eventBus } = {}) {
    this.players = playerService || null;
    this.eventBus = eventBus || null;

    this.listeners = new Map();
    this.settings = clone(DEFAULT_SETTINGS);
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return this;

    this.load();
    this.initialized = true;

    this.emit(
      SETTINGS_EVENTS.LOADED,
      this.getAll()
    );

    return this;
  }

  readStorage() {
    try {
      if (storage && typeof storage.get === "function") {
        return storage.get(STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Settings storage read failed:", error);
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  writeStorage() {
    try {
      if (storage && typeof storage.set === "function") {
        storage.set(STORAGE_KEY, this.settings);
        return true;
      }
    } catch (error) {
      console.warn("Settings storage write failed:", error);
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.settings)
      );

      return true;
    } catch (error) {
      console.warn("Settings could not be saved:", error);
      return false;
    }
  }

  load() {
    const saved = this.readStorage();

    this.settings = mergeObjects(
      DEFAULT_SETTINGS,
      saved
    );

    this.validateAll();
    return this.getAll();
  }

  save() {
    this.validateAll();

    const saved = this.writeStorage();

    this.emit(
      SETTINGS_EVENTS.UPDATED,
      this.getAll()
    );

    return saved;
  }

  getAll() {
    return clone(this.settings);
  }

  get(section, key) {
    if (!section) return this.getAll();

    if (!(section in this.settings)) {
      return undefined;
    }

    if (key === undefined) {
      return clone(this.settings[section]);
    }

    return this.settings[section][key];
  }

  set(section, key, value) {
    if (!Object.hasOwn(this.settings, section)) {
      throw new Error(`Unknown settings section: ${section}`);
    }

    if (
      !this.settings[section] ||
      typeof this.settings[section] !== "object"
    ) {
      throw new Error("Invalid settings section.");
    }

    if (!Object.hasOwn(this.settings[section], key)) {
      throw new Error(`Unknown setting: ${section}.${key}`);
    }

    this.settings[section][key] = value;
    this.validateAll();
    this.save();

    return this.get(section, key);
  }

  updateSection(section, values = {}) {
    if (!Object.hasOwn(this.settings, section)) {
      throw new Error(`Unknown settings section: ${section}`);
    }

    if (!values || typeof values !== "object") {
      throw new TypeError("Settings values must be an object.");
    }

    this.settings[section] = mergeObjects(
      this.settings[section],
      values
    );

    this.validateAll();
    this.save();

    return this.get(section);
  }

  setLanguage(language) {
    if (
      typeof language !== "string" ||
      !/^[a-z]{2,3}(-[A-Z]{2})?$/.test(language)
    ) {
      throw new Error("Invalid language code.");
    }

    this.settings.language = language;
    this.save();

    this.emit(
      SETTINGS_EVENTS.LANGUAGE_CHANGED,
      language
    );

    return language;
  }

  setTheme(theme) {
    if (!ALLOWED_THEMES.includes(theme)) {
      throw new Error("Unsupported theme.");
    }

    this.settings.theme = theme;
    this.save();

    this.emit(SETTINGS_EVENTS.THEME_CHANGED, theme);
    return theme;
  }

  setGraphicsQuality(quality) {
    if (!ALLOWED_QUALITIES.includes(quality)) {
      throw new Error("Invalid graphics quality.");
    }

    this.settings.graphics.quality = quality;
    this.save();

    this.emit(
      SETTINGS_EVENTS.QUALITY_CHANGED,
      quality
    );

    return quality;
  }

  setVolume(type, value) {
    const allowed = [
      "masterVolume",
      "musicVolume",
      "effectsVolume"
    ];

    if (!allowed.includes(type)) {
      throw new Error("Invalid volume setting.");
    }

    const volume = Number(value);

    if (!Number.isFinite(volume)) {
      throw new Error("Volume must be a number.");
    }

    this.settings.audio[type] = Math.min(
      1,
      Math.max(0, volume)
    );

    this.save();
    return this.settings.audio[type];
  }

  setMusicEnabled(enabled) {
    return this.set(
      "audio",
      "musicEnabled",
      Boolean(enabled)
    );
  }

  setSoundEnabled(enabled) {
    return this.set(
      "audio",
      "soundEnabled",
      Boolean(enabled)
    );
  }

  setPrivacy(key, value) {
    const allowed = [
      "showOnlineStatus",
      "allowFriendRequests",
      "allowGameInvites",
      "profileVisibility"
    ];

    if (!allowed.includes(key)) {
      throw new Error("Invalid privacy setting.");
    }

    if (
      key === "profileVisibility" &&
      !ALLOWED_VISIBILITY.includes(value)
    ) {
      throw new Error("Invalid profile visibility.");
    }

    return this.set("privacy", key, value);
  }

  setBoardOrientation(value) {
    if (!ALLOWED_ORIENTATIONS.includes(value)) {
      throw new Error("Invalid board orientation.");
    }

    return this.set(
      "controls",
      "boardOrientation",
      value
    );
  }

  validateAll() {
    if (!ALLOWED_QUALITIES.includes(
      this.settings.graphics.quality
    )) {
      this.settings.graphics.quality = "high";
    }

    if (!ALLOWED_THEMES.includes(this.settings.theme)) {
      this.settings.theme = "royal-purple";
    }

    if (!ALLOWED_ORIENTATIONS.includes(
      this.settings.controls.boardOrientation
    )) {
      this.settings.controls.boardOrientation = "auto";
    }

    if (!ALLOWED_VISIBILITY.includes(
      this.settings.privacy.profileVisibility
    )) {
      this.settings.privacy.profileVisibility = "public";
    }

    const volumeKeys = [
      "masterVolume",
      "musicVolume",
      "effectsVolume"
    ];

    for (const key of volumeKeys) {
      const value = Number(this.settings.audio[key]);

      this.settings.audio[key] = Number.isFinite(value)
        ? Math.min(1, Math.max(0, value))
        : DEFAULT_SETTINGS.audio[key];
    }

    return true;
  }

  reset(section = null) {
    if (section) {
      if (!Object.hasOwn(DEFAULT_SETTINGS, section)) {
        throw new Error(`Unknown settings section: ${section}`);
      }

      this.settings[section] = clone(
        DEFAULT_SETTINGS[section]
      );
    } else {
      this.settings = clone(DEFAULT_SETTINGS);
    }

    this.save();

    this.emit(
      SETTINGS_EVENTS.RESET,
      section || "all"
    );

    return this.getAll();
  }

  exportSettings() {
    return JSON.stringify(this.settings, null, 2);
  }

  importSettings(json) {
    let imported;

    try {
      imported = typeof json === "string"
        ? JSON.parse(json)
        : json;
    } catch {
      throw new Error("Settings backup file invalid है।");
    }

    if (!imported || typeof imported !== "object") {
      throw new Error("Invalid settings backup.");
    }

    this.settings = mergeObjects(
      DEFAULT_SETTINGS,
      imported
    );

    this.validateAll();
    this.save();

    return this.getAll();
  }

  on(event, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function.");
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, payload) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error("SettingsService listener error:", error);
      }
    });

    this.eventBus?.emit?.(event, payload);
  }

  dispose() {
    this.listeners.clear();
    this.initialized = false;
  }
}

export function createSettingsService(dependencies = {}) {
  return new SettingsService(dependencies);
}

/* ================= FILE 47 END ================= */
        
