
/* =========================================================
   APPARA CHESS — SETTINGS MANAGER
   PART 18 — js/settings.js
   ========================================================= */

window.APPARA_SETTINGS = (function () {
  "use strict";

  const STORAGE_KEY = "appara_chess_settings_v1";

  const DEFAULT_SETTINGS = {
    sound: true,
    music: false,
    animations: true,
    coordinates: true,
    legalMoves: true,
    boardTheme: "classic",
    difficulty: "medium",
    volume: 0.5,
    orientation: "white",
    confirmResign: true,
    showHints: true,
    language: "en",
    autoQueen: false
  };

  const VALID_THEMES = [
    "classic",
    "blue",
    "green",
    "purple",
    "dark"
  ];

  const VALID_DIFFICULTIES = [
    "easy",
    "medium",
    "hard"
  ];

  let settings = null;
  let initialized = false;

  /* ---------- STORAGE ---------- */

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};

      settings = Object.assign(
        {},
        DEFAULT_SETTINGS,
        parsed && typeof parsed === "object" ? parsed : {}
      );
    } catch (error) {
      settings = Object.assign({}, DEFAULT_SETTINGS);
      console.warn("Settings could not be loaded:", error);
    }

    validateSettings();

    return getSettings();
  }

  function save() {
    if (!settings) load();

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(settings)
      );

      return true;
    } catch (error) {
      console.warn("Settings could not be saved:", error);
      return false;
    }
  }

  function validateSettings() {
    if (!VALID_THEMES.includes(settings.boardTheme)) {
      settings.boardTheme = DEFAULT_SETTINGS.boardTheme;
    }

    if (!VALID_DIFFICULTIES.includes(settings.difficulty)) {
      settings.difficulty = DEFAULT_SETTINGS.difficulty;
    }

    settings.volume = Math.max(
      0,
      Math.min(1, Number(settings.volume) || 0)
    );

    [
      "sound",
      "music",
      "animations",
      "coordinates",
      "legalMoves",
      "confirmResign",
      "showHints",
      "autoQueen"
    ].forEach(function (key) {
      settings[key] = Boolean(settings[key]);
    });
  }

  function getSettings() {
    if (!settings) load();

    return JSON.parse(JSON.stringify(settings));
  }

  /* ---------- UPDATE ---------- */

  function update(key, value) {
    if (!settings) load();

    if (!Object.prototype.hasOwnProperty.call(
      DEFAULT_SETTINGS,
      key
    )) {
      return false;
    }

    settings[key] = value;
    validateSettings();

    save();
    applySetting(key, settings[key]);
    syncControls();

    return true;
  }

  function updateMultiple(changes) {
    if (!changes || typeof changes !== "object") {
      return false;
    }

    Object.keys(changes).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(
        DEFAULT_SETTINGS,
        key
      )) {
        settings[key] = changes[key];
      }
    });

    validateSettings();
    save();
    applyAll();
    syncControls();

    return true;
  }

  /* ---------- APPLY SETTINGS ---------- */

  function applySetting(key, value) {
    switch (key) {
      case "sound":
        if (window.APPARA_SOUND) {
          window.APPARA_SOUND.setSoundEnabled(value);
        }
        break;

      case "music":
        if (window.APPARA_SOUND) {
          window.APPARA_SOUND.setMusicEnabled(value);

          if (value) {
            window.APPARA_SOUND.startMusic();
          } else {
            window.APPARA_SOUND.stopMusic();
          }
        }
        break;

      case "volume":
        if (window.APPARA_SOUND) {
          window.APPARA_SOUND.setVolume(value);
        }
        break;

      case "boardTheme":
        if (window.APPARA_BOARD) {
          window.APPARA_BOARD.setTheme(value);
        }
        break;

      case "coordinates":
        if (window.APPARA_BOARD) {
          window.APPARA_BOARD.setCoordinates(value);
        }
        break;

      case "legalMoves":
        if (window.APPARA_BOARD) {
          const game = window.APPARA_ENGINE;
          const selected = window.APPARA_BOARD.getSelectedSquare();

          if (!value) {
            window.APPARA_BOARD.setLegalMoves([]);
          } else if (game && selected) {
            const moves = game.getLegalMoves(selected);
            window.APPARA_BOARD.setLegalMoves(moves);
          }
        }
        break;

      case "difficulty":
        if (window.APPARA_AI) {
          window.APPARA_AI.setDifficulty(value);
        }
        break;

      case "animations":
        document.documentElement.classList.toggle(
          "reduce-animations",
          !value
        );
        break;

      case "orientation":
        if (window.APPARA_BOARD) {
          window.APPARA_BOARD.setOrientation(value);
        }
        break;
    }
  }

  function applyAll() {
    if (!settings) return;

    Object.keys(settings).forEach(function (key) {
      applySetting(key, settings[key]);
    });
  }

  /* ---------- CONTROL SYNC ---------- */

  function setChecked(id, value) {
    const element = document.getElementById(id);
    if (element) element.checked = Boolean(value);
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
  }

  function syncControls() {
    if (!settings) return;

    setChecked("setting-sound", settings.sound);
    setChecked("setting-music", settings.music);
    setChecked("setting-animations", settings.animations);
    setChecked("setting-coordinates", settings.coordinates);
    setChecked("setting-legal-moves", settings.legalMoves);

    setValue("setting-board-theme", settings.boardTheme);
    setValue("setting-difficulty", settings.difficulty);

    setChecked("setting-confirm-resign", settings.confirmResign);
    setChecked("setting-show-hints", settings.showHints);
    setChecked("setting-auto-queen", settings.autoQueen);
    setValue("setting-volume", settings.volume);
    setValue("setting-language", settings.language);
  }

  /* ---------- EVENT BINDING ---------- */

  function bindCheckbox(id, key) {
    const element = document.getElementById(id);

    if (!element || element.dataset.settingsBound) return;

    element.dataset.settingsBound = "true";

    element.addEventListener("change", function () {
      update(key, element.checked);
    });
  }

  function bindSelect(id, key) {
    const element = document.getElementById(id);

    if (!element || element.dataset.settingsBound) return;

    element.dataset.settingsBound = "true";

    element.addEventListener("change", function () {
      update(key, element.value);
    });
  }

  function bindRange(id, key) {
    const element = document.getElementById(id);

    if (!element || element.dataset.settingsBound) return;

    element.dataset.settingsBound = "true";

    element.addEventListener("input", function () {
      update(key, Number(element.value));
    });
  }

  function bindEvents() {
    bindCheckbox("setting-sound", "sound");
    bindCheckbox("setting-music", "music");
    bindCheckbox("setting-animations", "animations");
    bindCheckbox("setting-coordinates", "coordinates");
    bindCheckbox("setting-legal-moves", "legalMoves");

    bindCheckbox("setting-confirm-resign", "confirmResign");
    bindCheckbox("setting-show-hints", "showHints");
    bindCheckbox("setting-auto-queen", "autoQueen");

    bindSelect("setting-board-theme", "boardTheme");
    bindSelect("setting-difficulty", "difficulty");
    bindSelect("setting-language", "language");

    bindRange("setting-volume", "volume");
  }

  /* ---------- RESET ---------- */

  function reset() {
    settings = Object.assign({}, DEFAULT_SETTINGS);

    save();
    applyAll();
    syncControls();

    return getSettings();
  }

  /* ---------- INITIALIZATION ---------- */

  function init() {
    if (initialized) {
      applyAll();
      syncControls();
      return getSettings();
    }

    load();
    bindEvents();
    applyAll();
    syncControls();

    initialized = true;

    return getSettings();
  }

  function get(key) {
    if (!settings) load();

    return Object.prototype.hasOwnProperty.call(settings, key)
      ? settings[key]
      : undefined;
  }

  function destroy() {
    initialized = false;
  }

  return {
    init: init,
    load: load,
    save: save,
    get: get,
    getSettings: getSettings,
    update: update,
    updateMultiple: updateMultiple,
    applySetting: applySetting,
    applyAll: applyAll,
    syncControls: syncControls,
    reset: reset,
    destroy: destroy
  };
})();

/* =========================================================
   APPARA CHESS — SETTINGS MANAGER
   PART 18 END
   ========================================================= */
                     
