
/* =========================================================
   APPARA CHESS — LOCAL STORAGE SYSTEM
   FILE: js/core/storage.js
   PURPOSE: Safe local settings and offline data storage
   ========================================================= */

const STORAGE_VERSION = 1;
const STORAGE_PREFIX = "apparachess";

const STORAGE_KEYS = Object.freeze({
  SETTINGS: "settings",
  LANGUAGE: "language",
  GUEST_PROFILE: "guest-profile",
  OFFLINE_PROGRESS: "offline-progress",
  INVENTORY: "inventory",
  DAILY_STATE: "daily-state",
  ACHIEVEMENTS: "achievements",
  LAST_SCREEN: "last-screen"
});

function buildStorageKey(key) {
  if (
    typeof key !== "string" ||
    !Object.values(STORAGE_KEYS).includes(key)
  ) {
    throw new Error(`Unsupported storage key: ${key}`);
  }

  return `${STORAGE_PREFIX}:v${STORAGE_VERSION}:${key}`;
}

function getStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }

    const testKey = `${STORAGE_PREFIX}:storage-test`;

    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);

    return window.localStorage;
  } catch (error) {
    console.warn(
      "[APPARA CHESS] Local storage is unavailable.",
      error
    );

    return null;
  }
}

function serialize(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error(
      "[APPARA CHESS] Could not serialize storage value.",
      error
    );

    return null;
  }
}

function deserialize(value) {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(
      "[APPARA CHESS] Invalid stored data was ignored.",
      error
    );

    return null;
  }
}

export const StorageService = {
  /**
   * Check whether local storage is available.
   */
  isAvailable() {
    return getStorage() !== null;
  },

  /**
   * Save a supported data value.
   */
  set(key, value) {
    const storage = getStorage();

    if (!storage) return false;

    const storageKey = buildStorageKey(key);
    const serialized = serialize(value);

    if (serialized === null) return false;

    try {
      storage.setItem(storageKey, serialized);
      return true;
    } catch (error) {
      console.error(
        "[APPARA CHESS] Storage save failed.",
        error
      );

      return false;
    }
  },

  /**
   * Read a stored value.
   */
  get(key, fallback = null) {
    const storage = getStorage();

    if (!storage) return fallback;

    const storageKey = buildStorageKey(key);

    try {
      const value = storage.getItem(storageKey);
      const parsed = deserialize(value);

      return parsed === null ? fallback : parsed;
    } catch (error) {
      console.error(
        "[APPARA CHESS] Storage read failed.",
        error
      );

      return fallback;
    }
  },

  /**
   * Remove one supported stored value.
   */
  remove(key) {
    const storage = getStorage();

    if (!storage) return false;

    try {
      storage.removeItem(buildStorageKey(key));
      return true;
    } catch (error) {
      console.error(
        "[APPARA CHESS] Storage removal failed.",
        error
      );

      return false;
    }
  },

  /**
   * Check whether a key exists.
   */
  has(key) {
    const storage = getStorage();

    if (!storage) return false;

    try {
      return storage.getItem(buildStorageKey(key)) !== null;
    } catch {
      return false;
    }
  },

  /**
   * Save application settings.
   */
  saveSettings(settings) {
    if (
      !settings ||
      typeof settings !== "object" ||
      Array.isArray(settings)
    ) {
      return false;
    }

    return this.set(STORAGE_KEYS.SETTINGS, settings);
  },

  /**
   * Read application settings.
   */
  getSettings() {
    return this.get(STORAGE_KEYS.SETTINGS, {});
  },

  /**
   * Save selected language.
   */
  saveLanguage(languageCode) {
    if (typeof languageCode !== "string" || !languageCode.trim()) {
      return false;
    }

    return this.set(STORAGE_KEYS.LANGUAGE, languageCode);
  },

  /**
   * Read selected language.
   */
  getLanguage() {
    return this.get(STORAGE_KEYS.LANGUAGE, "en");
  },

  /**
   * Save guest profile for offline play.
   */
  saveGuestProfile(profile) {
    if (
      !profile ||
      typeof profile !== "object" ||
      Array.isArray(profile)
    ) {
      return false;
    }

    return this.set(STORAGE_KEYS.GUEST_PROFILE, profile);
  },

  /**
   * Read guest profile.
   */
  getGuestProfile() {
    return this.get(STORAGE_KEYS.GUEST_PROFILE, null);
  },

  /**
   * Save offline game progress.
   */
  saveOfflineProgress(progress) {
    if (
      !progress ||
      typeof progress !== "object" ||
      Array.isArray(progress)
    ) {
      return false;
    }

    return this.set(STORAGE_KEYS.OFFLINE_PROGRESS, progress);
  },

  /**
   * Read offline game progress.
   */
  getOfflineProgress() {
    return this.get(STORAGE_KEYS.OFFLINE_PROGRESS, {});
  },

  /**
   * Save local inventory snapshot.
   * Online ownership must still be verified by the server.
   */
  saveInventory(inventory) {
    if (!Array.isArray(inventory)) return false;

    return this.set(STORAGE_KEYS.INVENTORY, inventory);
  },

  /**
   * Read local inventory snapshot.
   */
  getInventory() {
    return this.get(STORAGE_KEYS.INVENTORY, []);
  },

  /**
   * Save daily offline state.
   */
  saveDailyState(state) {
    if (
      !state ||
      typeof state !== "object" ||
      Array.isArray(state)
    ) {
      return false;
    }

    return this.set(STORAGE_KEYS.DAILY_STATE, state);
  },

  /**
   * Read daily offline state.
   */
  getDailyState() {
    return this.get(STORAGE_KEYS.DAILY_STATE, {});
  },

  /**
   * Save achievement snapshot.
   */
  saveAchievements(achievements) {
    if (!Array.isArray(achievements)) return false;

    return this.set(STORAGE_KEYS.ACHIEVEMENTS, achievements);
  },

  /**
   * Read achievement snapshot.
   */
  getAchievements() {
    return this.get(STORAGE_KEYS.ACHIEVEMENTS, []);
  },

  /**
   * Save the last opened screen.
   */
  saveLastScreen(screenId) {
    if (typeof screenId !== "string" || !screenId.trim()) {
      return false;
    }

    return this.set(STORAGE_KEYS.LAST_SCREEN, screenId);
  },

  /**
   * Read the last opened screen.
   */
  getLastScreen() {
    return this.get(STORAGE_KEYS.LAST_SCREEN, "home");
  },

  /**
   * Clear all APPARA CHESS local data.
   * This does not delete any online account or server data.
   */
  clearAll() {
    const storage = getStorage();

    if (!storage) return false;

    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        storage.removeItem(buildStorageKey(key));
      }

      return true;
    } catch (error) {
      console.error(
        "[APPARA CHESS] Could not clear local data.",
        error
      );

      return false;
    }
  },

  /**
   * Return a snapshot of the storage configuration.
   */
  getInfo() {
    return Object.freeze({
      prefix: STORAGE_PREFIX,
      version: STORAGE_VERSION,
      available: this.isAvailable(),
      supportedKeys: Object.values(STORAGE_KEYS)
    });
  }
};

export { STORAGE_KEYS, STORAGE_VERSION };

/* =========================================================
   FILE END: js/core/storage.js
   ========================================================= */
