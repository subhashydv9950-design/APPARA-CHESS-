
/* =========================================================
   APPARA CHESS — FILE 48
   File: js/services/audio-service.js
   Section: Services
   Purpose: Music and sound effects management
   ========================================================= */

export const AUDIO_EVENTS = Object.freeze({
  READY: "audio:ready",
  MUSIC_PLAY: "audio:music-play",
  MUSIC_PAUSE: "audio:music-pause",
  SOUND_PLAY: "audio:sound-play",
  VOLUME_CHANGE: "audio:volume-change",
  MUTE_CHANGE: "audio:mute-change",
  ERROR: "audio:error"
});

export const AUDIO_DEFAULTS = Object.freeze({
  masterVolume: 0.75,
  musicVolume: 0.45,
  soundVolume: 0.8,
  muted: false,
  musicEnabled: true,
  soundEnabled: true,
  fadeDuration: 700
});

export class AudioService {
  constructor(options = {}) {
    this.settingsService = options.settingsService || null;

    this.settings = {
      ...AUDIO_DEFAULTS,
      ...(options.settings || {})
    };

    this.audioContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.soundGain = null;

    this.musicElement = null;
    this.musicSource = null;

    this.sounds = new Map();
    this.activeSounds = new Set();

    this.initialized = false;
    this.disposed = false;
    this.listeners = new Map();

    this.fadeTimer = null;
  }

  /* ---------------------------------------------------------
     INITIALIZATION
     --------------------------------------------------------- */

  async initialize() {
    if (this.disposed) {
      throw new Error("AudioService has been disposed.");
    }

    if (this.initialized) {
      return true;
    }

    try {
      const AudioContextClass =
        globalThis.AudioContext ||
        globalThis.webkitAudioContext;

      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();

        this.masterGain = this.audioContext.createGain();
        this.musicGain = this.audioContext.createGain();
        this.soundGain = this.audioContext.createGain();

        this.musicGain.connect(this.masterGain);
        this.soundGain.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);

        this.applyVolumes();
      }

      this.initialized = true;

      this.emit(AUDIO_EVENTS.READY, {
        supported: Boolean(this.audioContext)
      });

      return true;
    } catch (error) {
      this.emit(AUDIO_EVENTS.ERROR, {
        error,
        action: "initialize"
      });

      return false;
    }
  }

  async resume() {
    if (!this.audioContext) {
      return false;
    }

    try {
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      return true;
    } catch (error) {
      this.emit(AUDIO_EVENTS.ERROR, {
        error,
        action: "resume"
      });

      return false;
    }
  }

  /* ---------------------------------------------------------
     MUSIC
     --------------------------------------------------------- */

  async playMusic(source, options = {}) {
    if (!source) {
      throw new Error("Music source is required.");
    }

    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.settings.musicEnabled || this.settings.muted) {
      return false;
    }

    try {
      await this.resume();

      if (this.musicElement) {
        this.stopMusic();
      }

      const audio = new Audio(source);

      audio.loop = options.loop !== false;
      audio.preload = "auto";
      audio.volume = 1;

      if (this.audioContext) {
        this.musicSource =
          this.audioContext.createMediaElementSource(audio);

        this.musicSource.connect(this.musicGain);
      } else {
        audio.volume = this.getEffectiveMusicVolume();
      }

      this.musicElement = audio;

      await audio.play();

      this.emit(AUDIO_EVENTS.MUSIC_PLAY, {
        source,
        loop: audio.loop
      });

      return true;
    } catch (error) {
      this.emit(AUDIO_EVENTS.ERROR, {
        error,
        action: "playMusic"
      });

      return false;
    }
  }

  pauseMusic() {
    if (!this.musicElement) return false;

    this.musicElement.pause();

    this.emit(AUDIO_EVENTS.MUSIC_PAUSE, {});
    return true;
  }

  resumeMusic() {
    if (!this.musicElement) return false;

    if (!this.settings.musicEnabled || this.settings.muted) {
      return false;
    }

    return this.musicElement.play()
      .then(() => true)
      .catch(error => {
        this.emit(AUDIO_EVENTS.ERROR, {
          error,
          action: "resumeMusic"
        });

        return false;
      });
  }

  stopMusic() {
    if (!this.musicElement) return false;

    this.musicElement.pause();

    this.musicElement.currentTime = 0;

    this.musicElement.src = "";

    this.musicElement = null;
    this.musicSource = null;

    return true;
  }

  setMusicEnabled(enabled) {
    this.settings.musicEnabled = Boolean(enabled);

    if (!enabled) {
      this.pauseMusic();
    } else if (this.musicElement) {
      this.resumeMusic();
    }

    this.saveSettings();

    this.emit(AUDIO_EVENTS.VOLUME_CHANGE, {
      musicEnabled: this.settings.musicEnabled
    });
  }

  /* ---------------------------------------------------------
     SOUND EFFECT REGISTRATION
     --------------------------------------------------------- */

  registerSound(name, source, options = {}) {
    if (!name || !source) {
      throw new Error("Sound name and source are required.");
    }

    this.sounds.set(name, {
      source,
      volume: this.clamp(options.volume ?? 1, 0, 1),
      loop: Boolean(options.loop),
      preload: options.preload !== false
    });

    return true;
  }

  registerSounds(soundList = {}) {
    for (const [name, config] of Object.entries(soundList)) {
      if (typeof config === "string") {
        this.registerSound(name, config);
      } else if (config?.source) {
        this.registerSound(name, config.source, config);
      }
    }

    return this.sounds.size;
  }

  /* ---------------------------------------------------------
     PLAY SOUND EFFECT
     --------------------------------------------------------- */

  async playSound(name, options = {}) {
    if (!this.settings.soundEnabled || this.settings.muted) {
      return false;
    }

    const sound = this.sounds.get(name);

    if (!sound) {
      this.emit(AUDIO_EVENTS.ERROR, {
        error: new Error(`Sound not registered: ${name}`),
        action: "playSound"
      });

      return false;
    }

    try {
      if (!this.initialized) {
        await this.initialize();
      }

      await this.resume();

      const audio = new Audio(sound.source);

      const volume = this.clamp(
        options.volume ?? sound.volume,
        0,
        1
      );

      audio.loop = options.loop ?? sound.loop;
      audio.preload = "auto";

      let sourceNode = null;
      let gainNode = null;

      if (this.audioContext) {
        sourceNode =
          this.audioContext.createMediaElementSource(audio);

        gainNode = this.audioContext.createGain();

        gainNode.gain.value = volume;

        sourceNode.connect(gainNode);
        gainNode.connect(this.soundGain);
      } else {
        audio.volume = volume * this.getEffectiveSoundVolume();
      }

      const activeSound = {
        name,
        audio,
        sourceNode,
        gainNode
      };

      this.activeSounds.add(activeSound);

      audio.addEventListener("ended", () => {
        this.activeSounds.delete(activeSound);
        sourceNode?.disconnect();
        gainNode?.disconnect();
      }, { once: true });

      await audio.play();

      this.emit(AUDIO_EVENTS.SOUND_PLAY, {
        name,
        volume
      });

      return true;
    } catch (error) {
      this.emit(AUDIO_EVENTS.ERROR, {
        error,
        action: "playSound",
        name
      });

      return false;
    }
  }

  stopSound(name) {
    let stopped = false;

    for (const item of this.activeSounds) {
      if (name && item.name !== name) continue;

      item.audio.pause();
      item.audio.currentTime = 0;

      item.sourceNode?.disconnect();
      item.gainNode?.disconnect();

      this.activeSounds.delete(item);
      stopped = true;
    }

    return stopped;
  }

  stopAllSounds() {
    for (const item of [...this.activeSounds]) {
      item.audio.pause();
      item.audio.currentTime = 0;

      item.sourceNode?.disconnect();
      item.gainNode?.disconnect();

      this.activeSounds.delete(item);
    }

    return true;
  }

  setSoundEnabled(enabled) {
    this.settings.soundEnabled = Boolean(enabled);

    if (!enabled) {
      this.stopAllSounds();
    }

    this.saveSettings();
  }

  /* ---------------------------------------------------------
     VOLUME CONTROL
     --------------------------------------------------------- */

  setMasterVolume(value) {
    this.settings.masterVolume = this.clamp(value, 0, 1);
    this.applyVolumes();
    this.saveSettings();

    this.emit(AUDIO_EVENTS.VOLUME_CHANGE, {
      type: "master",
      value: this.settings.masterVolume
    });
  }

  setMusicVolume(value) {
    this.settings.musicVolume = this.clamp(value, 0, 1);
    this.applyVolumes();
    this.saveSettings();

    this.emit(AUDIO_EVENTS.VOLUME_CHANGE, {
      type: "music",
      value: this.settings.musicVolume
    });
  }

  setSoundVolume(value) {
    this.settings.soundVolume = this.clamp(value, 0, 1);
    this.applyVolumes();
    this.saveSettings();

    this.emit(AUDIO_EVENTS.VOLUME_CHANGE, {
      type: "sound",
      value: this.settings.soundVolume
    });
  }

  setMuted(muted) {
    this.settings.muted = Boolean(muted);

    this.applyVolumes();

    if (this.settings.muted) {
      this.pauseMusic();
      this.stopAllSounds();
    }

    this.saveSettings();

    this.emit(AUDIO_EVENTS.MUTE_CHANGE, {
      muted: this.settings.muted
    });
  }

  toggleMute() {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  applyVolumes() {
    const master = this.settings.muted
      ? 0
      : this.settings.masterVolume;

    const music =
      this.settings.musicEnabled
        ? this.settings.musicVolume
        : 0;

    const sound =
      this.settings.soundEnabled
        ? this.settings.soundVolume
        : 0;

    if (this.masterGain) {
      this.masterGain.gain.value = master;
    }

    if (this.musicGain) {
      this.musicGain.gain.value = music;
    }

    if (this.soundGain) {
      this.soundGain.gain.value = sound;
    }

    if (!this.audioContext && this.musicElement) {
      this.musicElement.volume =
        this.getEffectiveMusicVolume();
    }
  }

  getEffectiveMusicVolume() {
    if (this.settings.muted || !this.settings.musicEnabled) {
      return 0;
    }

    return this.clamp(
      this.settings.masterVolume * this.settings.musicVolume,
      0,
      1
    );
  }

  getEffectiveSoundVolume() {
    if (this.settings.muted || !this.settings.soundEnabled) {
      return 0;
    }

    return this.clamp(
      this.settings.masterVolume * this.settings.soundVolume,
      0,
      1
    );
  }

  /* ---------------------------------------------------------
     FADE EFFECT
     --------------------------------------------------------- */

  fadeMusic(targetVolume, duration = 700) {
    if (!this.musicGain || !this.audioContext) {
      return false;
    }

    const target = this.clamp(targetVolume, 0, 1);
    const now = this.audioContext.currentTime;

    const current = this.musicGain.gain.value;

    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(current, now);

    this.musicGain.gain.linearRampToValueAtTime(
      target,
      now + Math.max(0.05, duration / 1000)
    );

    return true;
  }

  /* ---------------------------------------------------------
     SETTINGS
     --------------------------------------------------------- */

  getSettings() {
    return { ...this.settings };
  }

  async loadSettings() {
    if (!this.settingsService) {
      return this.getSettings();
    }

    try {
      const saved = this.settingsService.get("audio");

      if (saved && typeof saved === "object") {
        this.settings = {
          ...this.settings,
          ...saved
        };

        this.applyVolumes();
      }
    } catch (error) {
      this.emit(AUDIO_EVENTS.ERROR, {
        error,
        action: "loadSettings"
      });
    }

    return this.getSettings();
  }

  saveSettings() {
    try {
      this.settingsService?.set("audio", {
        ...this.settings
      });
    } catch (error) {
      this.emit(AUDIO_EVENTS.ERROR, {
        error,
        action: "saveSettings"
      });
    }

    return true;
  }

  /* ---------------------------------------------------------
     EVENT SYSTEM
     --------------------------------------------------------- */

  on(eventName, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function.");
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName).add(callback);

    return () => this.off(eventName, callback);
  }

  off(eventName, callback) {
    const callbacks = this.listeners.get(eventName);

    if (!callbacks) return false;

    callbacks.delete(callback);

    if (callbacks.size === 0) {
      this.listeners.delete(eventName);
    }

    return true;
  }

  emit(eventName, payload = {}) {
    const callbacks = this.listeners.get(eventName);

    if (!callbacks) return;

    for (const callback of [...callbacks]) {
      try {
        callback(payload);
      } catch (error) {
        console.error(
          "[AudioService] Event listener error:",
          error
        );
      }
    }
  }

  /* ---------------------------------------------------------
     UTILITIES
     --------------------------------------------------------- */

  clamp(value, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return min;
    }

    return Math.min(max, Math.max(min, number));
  }

  getStatus() {
    return {
      initialized: this.initialized,
      supported: Boolean(this.audioContext),
      muted: this.settings.muted,
      musicEnabled: this.settings.musicEnabled,
      soundEnabled: this.settings.soundEnabled,
      activeSounds: this.activeSounds.size,
      registeredSounds: this.sounds.size,
      musicPlaying: Boolean(
        this.musicElement &&
        !this.musicElement.paused
      )
    };
  }

  /* ---------------------------------------------------------
     DISPOSAL
     --------------------------------------------------------- */

  dispose() {
    if (this.disposed) return;

    this.stopMusic();
    this.stopAllSounds();

    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.masterGain = null;
    this.musicGain = null;
    this.soundGain = null;

    this.sounds.clear();
    this.listeners.clear();

    this.initialized = false;
    this.disposed = true;
  }
}

/* ---------------------------------------------------------
   FACTORY
   --------------------------------------------------------- */

export function createAudioService(options = {}) {
  return new AudioService(options);
}

/* ================= FILE 48 END ================= */
    
