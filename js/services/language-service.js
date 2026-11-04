
/* =========================================================
   APPARA CHESS — LANGUAGE SERVICE
   FILE: js/services/language-service.js
   PART: 1 OF 2
   PURPOSE:
   - 18-language management
   - Translation lookup
   - Language persistence
   - Language change events
   ========================================================= */

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_LIST,
  TRANSLATIONS,
  getTranslation,
  getLanguageInfo,
  isLanguageSupported,
  getAvailableLanguages
} from "../../config/language-data.js";

import { StorageService } from "../core/storage.js";

export const LANGUAGE_EVENTS = Object.freeze({
  INITIALIZED: "language:initialized",
  CHANGED: "language:changed",
  TRANSLATED: "language:translated",
  ERROR: "language:error"
});

export class LanguageService {
  constructor({
    settingsService = null,
    storageService = StorageService,
    defaultLanguage = DEFAULT_LANGUAGE
  } = {}) {
    this.settingsService = settingsService;
    this.storage = storageService;
    this.defaultLanguage = isLanguageSupported(defaultLanguage)
      ? defaultLanguage
      : DEFAULT_LANGUAGE;

    this.currentLanguage = this.defaultLanguage;
    this.listeners = new Map();
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return this;

    let savedLanguage = null;

    try {
      savedLanguage = this.settingsService?.get?.("language");

      if (!savedLanguage) {
        savedLanguage = this.storage?.getLanguage?.();
      }
    } catch (error) {
      this.emit(LANGUAGE_EVENTS.ERROR, error);
    }

    this.currentLanguage = isLanguageSupported(savedLanguage)
      ? savedLanguage
      : this.defaultLanguage;

    this.initialized = true;

    this.applyDocumentLanguage();
    this.translateDocument();

    this.emit(
      LANGUAGE_EVENTS.INITIALIZED,
      this.getCurrentLanguage()
    );

    return this;
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  getCurrentLanguageInfo() {
    return getLanguageInfo(this.currentLanguage);
  }

  getLanguages() {
    return getAvailableLanguages();
  }

  isSupported(languageCode) {
    return isLanguageSupported(languageCode);
  }

  translate(key, fallback = null, language = null) {
    if (typeof key !== "string" || !key.trim()) {
      return fallback ?? "";
    }

    const selectedLanguage = language || this.currentLanguage;

    if (!isLanguageSupported(selectedLanguage)) {
      return fallback ?? key;
    }

    const translated = getTranslation(
      selectedLanguage,
      key
    );

    if (translated === key && fallback !== null) {
      return fallback;
    }

    return translated;
  }

  t(key, fallback = null, language = null) {
    return this.translate(key, fallback, language);
  }

  setLanguage(languageCode) {
    if (!isLanguageSupported(languageCode)) {
      throw new Error(
        `Unsupported language: ${languageCode}`
      );
    }

    const previousLanguage = this.currentLanguage;

    if (previousLanguage === languageCode) {
      return this.getCurrentLanguageInfo();
    }

    this.currentLanguage = languageCode;

    try {
      if (this.settingsService?.setLanguage) {
        this.settingsService.setLanguage(languageCode);
      } else {
        this.storage?.saveLanguage?.(languageCode);
      }
    } catch (error) {
      this.currentLanguage = previousLanguage;
      this.emit(LANGUAGE_EVENTS.ERROR, error);
      throw error;
    }

    this.applyDocumentLanguage();
    this.translateDocument();

    const payload = {
      previousLanguage,
      currentLanguage: languageCode,
      languageInfo: this.getCurrentLanguageInfo()
    };

    this.emit(LANGUAGE_EVENTS.CHANGED, payload);

    return payload.languageInfo;
  }

  applyDocumentLanguage() {
    if (typeof document === "undefined") return false;

    const languageInfo = this.getCurrentLanguageInfo();

    document.documentElement.lang = languageInfo.code;
    document.documentElement.dir = languageInfo.direction;

    return true;
  }

  translateDocument(root = null) {
    if (typeof document === "undefined") return 0;

    const target = root || document;
    let translatedCount = 0;

    const elements = target.querySelectorAll?.(
      "[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]"
    );

    if (!elements) return 0;

    elements.forEach(element => {
      const textKey = element.getAttribute("data-i18n");
      const placeholderKey = element.getAttribute(
        "data-i18n-placeholder"
      );
      const titleKey = element.getAttribute("data-i18n-title");
      const ariaKey = element.getAttribute(
        "data-i18n-aria-label"
      );

      if (textKey) {
        element.textContent = this.t(textKey);
        translatedCount++;
      }

      if (placeholderKey) {
        element.setAttribute(
          "placeholder",
          this.t(placeholderKey)
        );
      }

      if (titleKey) {
        element.setAttribute(
          "title",
          this.t(titleKey)
        );
      }

      if (ariaKey) {
        element.setAttribute(
          "aria-label",
          this.t(ariaKey)
        );
      }
    });

    this.emit(
      LANGUAGE_EVENTS.TRANSLATED,
      {
        language: this.currentLanguage,
        count: translatedCount
      }
    );

    return translatedCount;
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
        console.error(
          "[APPARA CHESS] Language listener error:",
          error
        );
      }
    });
  }

  dispose() {
    this.listeners.clear();
    this.initialized = false;
  }
}

export function createLanguageService(dependencies = {}) {
  return new LanguageService(dependencies);
}

/* =========================================================
   FILE: js/services/language-service.js
   PART 2 COMPLETE
   FULL FILE COMPLETE — FILE 1/10
   ========================================================= */
