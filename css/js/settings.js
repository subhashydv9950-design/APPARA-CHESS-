
/* =========================================
   APPARA CHESS
   PART 17 — SETTINGS SYSTEM
========================================= */

class ApparaChessSettings {
  constructor() {
    this.storageKey = "appara_chess_settings";

    this.defaults = {
      theme: "purple",
      boardTheme: "classic",
      pieceStyle: "classic",
      soundEnabled: true,
      musicEnabled: true,
      soundVolume: 0.7,
      musicVolume: 0.35,
      animations: true,
      coordinates: true,
      legalMoves: true,
      confirmResign: true,
      autoQueen: false,
      showHints: true,
      boardOrientation: "white",
      language: "en",
      notation: "standard"
    };

    this.settings = this.load();

    this.applyAll();
    this.connectEvents();
    this.render();
  }

  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);

      return {
        ...this.defaults,
        ...(saved ? JSON.parse(saved) : {})
      };
    } catch (error) {
      console.error("Settings loading error:", error);
      return { ...this.defaults };
    }
  }

  save() {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify(this.settings)
      );
    } catch (error) {
      console.error("Settings saving error:", error);
    }

    this.applyAll();
    this.render();
  }

  get(key) {
    return this.settings[key];
  }

  set(key, value) {
    if (!Object.prototype.hasOwnProperty.call(this.defaults, key)) {
      return false;
    }

    this.settings[key] = value;
    this.save();
    return true;
  }

  update(values = {}) {
    Object.keys(values).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(this.defaults, key)) {
        this.settings[key] = values[key];
      }
    });

    this.save();
  }

  applyAll() {
    this.applyTheme();
    this.applyBoardTheme();
    this.applySound();
    this.applyAnimations();
    this.applyCoordinates();
    this.applyOrientation();
  }

  applyTheme() {
    document.documentElement.dataset.theme = this.settings.theme;

    document.body.classList.remove(
      "theme-dark",
      "theme-light",
      "theme-purple"
    );

    document.body.classList.add(
      `theme-${this.settings.theme}`
    );
  }

  applyBoardTheme() {
    if (window.apparaBoard?.setTheme) {
      window.apparaBoard.setTheme(this.settings.boardTheme);
    }
  }

  applySound() {
    const sound = window.apparaSound;
    if (!sound) return;

    if (typeof sound.setSoundEnabled === "function") {
      sound.setSoundEnabled(this.settings.soundEnabled);
    }

    if (typeof sound.setMusicEnabled === "function") {
      sound.setMusicEnabled(this.settings.musicEnabled);
    }

    if (typeof sound.setSoundVolume === "function") {
      sound.setSoundVolume(this.settings.soundVolume);
    }

    if (typeof sound.setMusicVolume === "function") {
      sound.setMusicVolume(this.settings.musicVolume);
    }
  }

  applyAnimations() {
    document.body.classList.toggle(
      "animations-disabled",
      !this.settings.animations
    );
  }

  applyCoordinates() {
    const coordinates = document.getElementById(
      "board-coordinates"
    );

    if (coordinates) {
      coordinates.style.display =
        this.settings.coordinates ? "" : "none";
    }
  }

  applyOrientation() {
    if (this.settings.boardOrientation === "black") {
      window.apparaBoard?.flip();
    }
  }

  connectEvents() {
    this.bindSelect("theme-setting", "theme");
    this.bindSelect("board-theme-setting", "boardTheme");
    this.bindSelect("language-setting", "language");

    this.bindCheckbox("sound-setting", "soundEnabled");
    this.bindCheckbox("music-setting", "musicEnabled");
    this.bindCheckbox("animation-setting", "animations");
    this.bindCheckbox("coordinates-setting", "coordinates");
    this.bindCheckbox("legal-moves-setting", "legalMoves");
    this.bindCheckbox("resign-confirm-setting", "confirmResign");
    this.bindCheckbox("auto-queen-setting", "autoQueen");
    this.bindCheckbox("hints-setting", "showHints");

    this.bindSlider("sound-volume-setting", "soundVolume");
    this.bindSlider("music-volume-setting", "musicVolume");

    this.bindClick("reset-settings-btn", () => {
      this.reset();
    });

    this.bindClick("export-settings-btn", () => {
      this.exportSettings();
    });

    this.bindClick("import-settings-btn", () => {
      this.importSettings();
    });

    this.bindClick("flip-orientation-setting", () => {
      this.toggleOrientation();
    });
  }

  bindSelect(id, key) {
    const element = document.getElementById(id);
    if (!element) return;

    element.value = this.settings[key];

    element.addEventListener("change", () => {
      this.set(key, element.value);
    });
  }

  bindCheckbox(id, key) {
    const element = document.getElementById(id);
    if (!element) return;

    element.checked = Boolean(this.settings[key]);

    element.addEventListener("change", () => {
      this.set(key, element.checked);
    });
  }

  bindSlider(id, key) {
    const element = document.getElementById(id);
    if (!element) return;

    element.value = this.settings[key];

    element.addEventListener("input", () => {
      this.set(key, Number(element.value));
    });
  }

  bindClick(id, callback) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("click", callback);
    }
  }

  toggleOrientation() {
    this.settings.boardOrientation =
      this.settings.boardOrientation === "white"
        ? "black"
        : "white";

    window.apparaBoard?.flip();
    this.save();
  }

  reset() {
    const confirmed = window.confirm(
      "Reset all APPARA CHESS settings?"
    );

    if (!confirmed) return;

    this.settings = { ...this.defaults };
    this.save();
    this.notify("Settings restored to default");
  }

  exportSettings() {
    const blob = new Blob(
      [JSON.stringify(this.settings, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "appara-chess-settings.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  importSettings() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text);

        this.update(imported);
        this.notify("Settings imported successfully");
      } catch (error) {
        this.notify("Invalid settings file");
      }
    });

    input.click();
  }

  render() {
    Object.keys(this.defaults).forEach(key => {
      const element = document.getElementById(
        `setting-value-${key}`
      );

      if (element) {
        element.textContent = String(this.settings[key]);
      }
    });
  }

  notify(message) {
    if (window.apparaApp?.showNotification) {
      window.apparaApp.showNotification(message);
    } else {
      console.log("[APPARA SETTINGS]", message);
    }
  }
}

/* GLOBAL INSTANCE */

window.apparaSettings = new ApparaChessSettings();

/* PART 17 END */
