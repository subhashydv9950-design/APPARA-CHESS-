/* =========================================================
   APPARA CHESS — SETTINGS CONTROLLER
   PART 21O — PART 1/3
   File: js/settings.js
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
    difficulty: "medium"
  };

  const state = {
    initialized: false,
    settings: { ...DEFAULT_SETTINGS },
    elements: {},
    eventHandlers: [],
    storageAvailable: true
  };

  /* ---------------------------------------------------------
     HELPERS
  --------------------------------------------------------- */

  function getElement(id) {
    return document.getElementById(id);
  }

  function notify(message, type) {
    if (
      window.APPARA_APP &&
      typeof window.APPARA_APP.showNotification === "function"
    ) {
      window.APPARA_APP.showNotification(message, type || "info");
    }
  }

  function safeCall(object, method, ...args) {
    try {
      if (object && typeof object[method] === "function") {
        return object[method](...args);
      }
    } catch (error) {
      console.warn(
        "[APPARA SETTINGS] " + method + " failed:",
        error
      );
    }

    return undefined;
  }

  function normalizeSettings(source) {
    const data = source && typeof source === "object"
      ? source
      : {};

    const themes = ["classic", "blue", "green", "purple", "dark"];
    const difficulties = ["easy", "medium", "hard", "expert"];

    return {
      sound: data.sound !== undefined
        ? Boolean(data.sound)
        : DEFAULT_SETTINGS.sound,

      music: data.music !== undefined
        ? Boolean(data.music)
        : DEFAULT_SETTINGS.music,

      animations: data.animations !== undefined
        ? Boolean(data.animations)
        : DEFAULT_SETTINGS.animations,

      coordinates: data.coordinates !== undefined
        ? Boolean(data.coordinates)
        : DEFAULT_SETTINGS.coordinates,

      legalMoves: data.legalMoves !== undefined
        ? Boolean(data.legalMoves)
        : DEFAULT_SETTINGS.legalMoves,

      boardTheme: themes.includes(data.boardTheme)
        ? data.boardTheme
        : DEFAULT_SETTINGS.boardTheme,

      difficulty: difficulties.includes(data.difficulty)
        ? data.difficulty
        : DEFAULT_SETTINGS.difficulty
    };
  }

  /* ---------------------------------------------------------
     STORAGE
  --------------------------------------------------------- */

  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        state.settings = { ...DEFAULT_SETTINGS };
        return { ...state.settings };
      }

      const parsed = JSON.parse(saved);
      state.settings = normalizeSettings(parsed);

      return { ...state.settings };

    } catch (error) {
      state.storageAvailable = false;
      state.settings = { ...DEFAULT_SETTINGS };

      console.warn(
        "[APPARA SETTINGS] Could not load settings:",
        error
      );

      return { ...state.settings };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state.settings)
      );

      state.storageAvailable = true;
      return true;

    } catch (error) {
      state.storageAvailable = false;

      console.warn(
        "[APPARA SETTINGS] Could not save settings:",
        error
      );

      return false;
    }
  }

  /* ---------------------------------------------------------
     SETTINGS GETTERS
  --------------------------------------------------------- */

  function getSettings() {
    return { ...state.settings };
  }

  function getSetting(name) {
    if (!Object.prototype.hasOwnProperty.call(
      state.settings,
      name
    )) {
      return undefined;
    }

    return state.settings[name];
  }

  function isEnabled(name) {
    return Boolean(getSetting(name));
  }

  /* ---------------------------------------------------------
     HTML ELEMENT CACHE
  --------------------------------------------------------- */

  function cacheElements() {
    state.elements = {
      sound: getElement("setting-sound"),
      music: getElement("setting-music"),
      animations: getElement("setting-animations"),
      coordinates: getElement("setting-coordinates"),
      legalMoves: getElement("setting-legal-moves"),
      boardTheme: getElement("setting-board-theme"),
      difficulty: getElement("setting-difficulty")
    };

    return state.elements;
  }

  /* ---------------------------------------------------------
     SETTING VALUE VALIDATION
  --------------------------------------------------------- */

  function isValidSetting(name) {
    return Object.prototype.hasOwnProperty.call(
      DEFAULT_SETTINGS,
      name
    );
  }

  function validateValue(name, value) {
    if (!isValidSetting(name)) {
      return false;
    }

    if (typeof DEFAULT_SETTINGS[name] === "boolean") {
      return typeof value === "boolean";
    }

    if (name === "boardTheme") {
      return ["classic", "blue", "green", "purple", "dark"]
        .includes(value);
    }

    if (name === "difficulty") {
      return ["easy", "medium", "hard", "expert"]
        .includes(value);
    }

    return false;
  }

/* =========================================================
   APPARA CHESS — SETTINGS CONTROLLER
   PART 21O — PART 1/3 END
   NEXT: PART 21O — PART 2/3
========================================================= */
/* =========================================================
   APPARA CHESS — SETTINGS CONTROLLER
   PART 21O — PART 2/3
========================================================= */

/* ---------------------------------------------------------
   APPLY INDIVIDUAL SETTINGS
--------------------------------------------------------- */

function applySoundSetting() {
  safeCall(
    window.APPARA_SOUND,
    "setSoundEnabled",
    state.settings.sound
  );
}

function applyMusicSetting() {
  safeCall(
    window.APPARA_SOUND,
    "setMusicEnabled",
    state.settings.music
  );

  if (state.settings.music) {
    safeCall(window.APPARA_SOUND, "startMusic");
  } else {
    safeCall(window.APPARA_SOUND, "stopMusic");
  }
}

function applyAnimationSetting() {
  if (!document.documentElement) return;

  document.documentElement.classList.toggle(
    "animations-disabled",
    !state.settings.animations
  );
}

function applyCoordinateSetting() {
  safeCall(
    window.APPARA_BOARD,
    "setCoordinates",
    state.settings.coordinates
  );
}

function applyBoardThemeSetting() {
  safeCall(
    window.APPARA_BOARD,
    "setTheme",
    state.settings.boardTheme
  );
}

function applyDifficultySetting() {
  safeCall(
    window.APPARA_AI,
    "setDifficulty",
    state.settings.difficulty
  );
}

function applyLegalMovesSetting() {
  document.documentElement.classList.toggle(
    "legal-moves-disabled",
    !state.settings.legalMoves
  );
}

/* ---------------------------------------------------------
   APPLY ALL SETTINGS
--------------------------------------------------------- */

function applySettings() {
  applySoundSetting();
  applyMusicSetting();
  applyAnimationSetting();
  applyCoordinateSetting();
  applyBoardThemeSetting();
  applyDifficultySetting();
  applyLegalMovesSetting();

  return getSettings();
}

/* ---------------------------------------------------------
   UPDATE SETTING
--------------------------------------------------------- */

function updateSetting(name, value, options) {
  const settingsOptions = options || {};

  if (!validateValue(name, value)) {
    console.warn(
      "[APPARA SETTINGS] Invalid setting:",
      name,
      value
    );

    return false;
  }

  const previousValue = state.settings[name];

  if (previousValue === value) {
    return true;
  }

  state.settings[name] = value;

  if (settingsOptions.apply !== false) {
    switch (name) {
      case "sound":
        applySoundSetting();
        break;

      case "music":
        applyMusicSetting();
        break;

      case "animations":
        applyAnimationSetting();
        break;

      case "coordinates":
        applyCoordinateSetting();
        break;

      case "legalMoves":
        applyLegalMovesSetting();
        break;

      case "boardTheme":
        applyBoardThemeSetting();
        break;

      case "difficulty":
        applyDifficultySetting();
        break;
    }
  }

  if (settingsOptions.save !== false) {
    saveSettings();
  }

  if (settingsOptions.render !== false) {
    renderSettings();
  }

  return true;
}

/* ---------------------------------------------------------
   UPDATE MULTIPLE SETTINGS
--------------------------------------------------------- */

function updateMultipleSettings(values, options) {
  if (!values || typeof values !== "object") {
    return false;
  }

  const settingsOptions = options || {};
  let changed = false;

  Object.keys(values).forEach(function (name) {
    if (!validateValue(name, values[name])) {
      return;
    }

    state.settings[name] = values[name];
    changed = true;
  });

  if (!changed) return false;

  if (settingsOptions.apply !== false) {
    applySettings();
  }

  if (settingsOptions.save !== false) {
    saveSettings();
  }

  if (settingsOptions.render !== false) {
    renderSettings();
  }

  return true;
}

/* ---------------------------------------------------------
   RESET SETTINGS
--------------------------------------------------------- */

function resetSettings(options) {
  const resetOptions = options || {};

  state.settings = { ...DEFAULT_SETTINGS };

  if (resetOptions.apply !== false) {
    applySettings();
  }

  if (resetOptions.save !== false) {
    saveSettings();
  }

  if (resetOptions.render !== false) {
    renderSettings();
  }

  notify("Settings restored to default", "success");

  return getSettings();
}

/* ---------------------------------------------------------
   CONTROL VALUE HELPERS
--------------------------------------------------------- */

function readControlValue(name, element) {
  if (!element) return undefined;

  if (typeof DEFAULT_SETTINGS[name] === "boolean") {
    return Boolean(element.checked);
  }

  return String(element.value || "");
}

function writeControlValue(name, element) {
  if (!element) return;

  if (typeof DEFAULT_SETTINGS[name] === "boolean") {
    element.checked = Boolean(state.settings[name]);
  } else {
    element.value = state.settings[name];
  }
}

/* ---------------------------------------------------------
   RENDER SETTINGS CONTROLS
--------------------------------------------------------- */

function renderSettings() {
  const mapping = {
    sound: "sound",
    music: "music",
    animations: "animations",
    coordinates: "coordinates",
    legalMoves: "legalMoves",
    boardTheme: "boardTheme",
    difficulty: "difficulty"
  };

  Object.keys(mapping).forEach(function (name) {
    const element = state.elements[mapping[name]];

    if (element) {
      writeControlValue(name, element);
    }
  });

  return getSettings();
}

/* ---------------------------------------------------------
   SETTINGS CHANGE HANDLER
--------------------------------------------------------- */

function handleControlChange(name, element) {
  const value = readControlValue(name, element);

  if (value === undefined) return;

  const updated = updateSetting(name, value);

  if (!updated) {
    renderSettings();
    notify("Invalid setting value", "error");
  }
}

/* =========================================================
   APPARA CHESS — SETTINGS CONTROLLER
   PART 21O — PART 2/3 END
   NEXT: PART 21O — PART 3/3
========================================================= */

         /* =========================================================
   APPARA CHESS — SETTINGS CONTROLLER
   PART 21O — PART 3/3
========================================================= */

/* ---------------------------------------------------------
   EVENT MANAGEMENT
--------------------------------------------------------- */

function bindControl(name, element) {
  if (!element) return;

  const handler = function () {
    handleControlChange(name, element);
  };

  element.addEventListener("change", handler);

  state.eventHandlers.push({
    element: element,
    event: "change",
    handler: handler
  });
}

function bindEvents() {
  const controls = {
    sound: state.elements.sound,
    music: state.elements.music,
    animations: state.elements.animations,
    coordinates: state.elements.coordinates,
    legalMoves: state.elements.legalMoves,
    boardTheme: state.elements.boardTheme,
    difficulty: state.elements.difficulty
  };

  Object.keys(controls).forEach(function (name) {
    bindControl(name, controls[name]);
  });
}

/* ---------------------------------------------------------
   REMOVE EVENTS
--------------------------------------------------------- */

function removeEvents() {
  state.eventHandlers.forEach(function (item) {
    item.element.removeEventListener(
      item.event,
      item.handler
    );
  });

  state.eventHandlers = [];
}

/* ---------------------------------------------------------
   INITIALIZE SETTINGS
--------------------------------------------------------- */

function init() {
  if (state.initialized) {
    return getSettings();
  }

  cacheElements();
  loadSettings();
  renderSettings();
  bindEvents();

  state.initialized = true;

  applySettings();

  console.log("[APPARA CHESS] Settings initialized");

  return getSettings();
}

/* ---------------------------------------------------------
   REFRESH SETTINGS
--------------------------------------------------------- */

function refresh() {
  cacheElements();
  renderSettings();
  applySettings();

  return getSettings();
}

/* ---------------------------------------------------------
   EXPORT / IMPORT SETTINGS
--------------------------------------------------------- */

function exportSettings() {
  return JSON.stringify(state.settings, null, 2);
}

function importSettings(jsonData) {
  try {
    const parsed = typeof jsonData === "string"
      ? JSON.parse(jsonData)
      : jsonData;

    if (!parsed || typeof parsed !== "object") {
      return false;
    }

    const normalized = normalizeSettings(parsed);

    state.settings = normalized;

    applySettings();
    saveSettings();
    renderSettings();

    notify("Settings imported successfully", "success");

    return true;

  } catch (error) {
    console.error(
      "[APPARA SETTINGS] Import failed:",
      error
    );

    notify("Could not import settings", "error");

    return false;
  }
}

/* ---------------------------------------------------------
   DESTROY SETTINGS CONTROLLER
--------------------------------------------------------- */

function destroy() {
  removeEvents();

  state.initialized = false;
  state.elements = {};

  return true;
}

/* ---------------------------------------------------------
   PUBLIC API
--------------------------------------------------------- */

return Object.freeze({
  init: init,
  refresh: refresh,

  loadSettings: loadSettings,
  saveSettings: saveSettings,

  getSettings: getSettings,
  getSetting: getSetting,
  isEnabled: isEnabled,

  updateSetting: updateSetting,
  updateMultipleSettings: updateMultipleSettings,
  resetSettings: resetSettings,

  applySettings: applySettings,
  renderSettings: renderSettings,

  exportSettings: exportSettings,
  importSettings: importSettings,

  destroy: destroy
});

})();

/* =========================================================
   APPARA CHESS — SETTINGS CONTROLLER
   PART 21O — PART 3/3 END
   FILE COMPLETE
========================================================= */                 
