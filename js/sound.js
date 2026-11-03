/* =========================================================
   APPARA CHESS — SOUND & MUSIC CONTROLLER
   PART 11 — js/sound.js
   ========================================================= */

(function () {
  "use strict";

  const Sound = {
    audioContext: null,
    masterGain: null,
    musicGain: null,
    soundGain: null,

    initialized: false,
    soundEnabled: true,
    musicEnabled: false,
    volume: 0.65,

    activeOscillators: [],
    musicTimer: null,
    musicStep: 0,

    /* ---------- INITIALIZATION ---------- */

    init(options = {}) {
      this.soundEnabled = options.sound !== false;
      this.musicEnabled = options.music === true;

      if (typeof options.volume === "number") {
        this.volume = Math.max(
          0,
          Math.min(1, options.volume)
        );
      }

      this.createAudioContext();

      this.initialized = true;

      return true;
    },

    createAudioContext() {
      if (this.audioContext) return true;

      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContextClass) {
        console.warn("APPARA SOUND: Web Audio is unavailable.");
        return false;
      }

      try {
        this.audioContext = new AudioContextClass();

        this.masterGain = this.audioContext.createGain();
        this.musicGain = this.audioContext.createGain();
        this.soundGain = this.audioContext.createGain();

        this.musicGain.connect(this.masterGain);
        this.soundGain.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);

        this.masterGain.gain.value = this.volume;
        this.musicGain.gain.value = this.musicEnabled ? 0.25 : 0;
        this.soundGain.gain.value = this.soundEnabled ? 1 : 0;

        return true;
      } catch (error) {
        console.error("APPARA SOUND: Audio initialization failed.", error);
        return false;
      }
    },

    /* ---------- AUDIO UNLOCK ---------- */

    async unlock() {
      if (!this.createAudioContext()) return false;

      try {
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }

        return this.audioContext.state === "running";
      } catch (error) {
        console.warn("APPARA SOUND: Audio unlock failed.", error);
        return false;
      }
    },

    /* ---------- BASIC TONE ---------- */

    playTone(options = {}) {
      if (!this.soundEnabled) return false;

      if (!this.createAudioContext()) return false;

      if (this.audioContext.state !== "running") {
        return false;
      }

      const frequency = Math.max(
        20,
        Number(options.frequency) || 440
      );

      const duration = Math.max(
        0.02,
        Number(options.duration) || 0.12
      );

      const type = options.type || "sine";
      const gainValue = Math.max(
        0,
        Math.min(1, Number(options.gain) || 0.15)
      );

      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(
        frequency,
        this.audioContext.currentTime
      );

      gain.gain.setValueAtTime(
        0.0001,
        this.audioContext.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, gainValue),
        this.audioContext.currentTime + 0.015
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        this.audioContext.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(this.soundGain);

      oscillator.start();
      oscillator.stop(
        this.audioContext.currentTime + duration + 0.02
      );

      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };

      return true;
    },

    /* ---------- CHESS SOUND EFFECTS ---------- */

    move() {
      return this.playTone({
        frequency: 520,
        duration: 0.075,
        type: "triangle",
        gain: 0.12
      });
    },

    capture() {
      if (!this.soundEnabled) return false;

      this.playTone({
        frequency: 300,
        duration: 0.09,
        type: "triangle",
        gain: 0.16
      });

      window.setTimeout(() => {
        this.playTone({
          frequency: 190,
          duration: 0.1,
          type: "sine",
          gain: 0.1
        });
      }, 45);

      return true;
    },

    check() {
      this.playTone({
        frequency: 740,
        duration: 0.12,
        type: "sine",
        gain: 0.18
      });

      window.setTimeout(() => {
        this.playTone({
          frequency: 880,
          duration: 0.16,
          type: "sine",
          gain: 0.14
        });
      }, 110);

      return true;
    },

    checkmate() {
      const notes = [660, 520, 390, 260];

      notes.forEach((frequency, index) => {
        window.setTimeout(() => {
          this.playTone({
            frequency,
            duration: 0.2,
            type: "triangle",
            gain: 0.16
          });
        }, index * 160);
      });

      return true;
    },

    gameStart() {
      const notes = [392, 523, 659];

      notes.forEach((frequency, index) => {
        window.setTimeout(() => {
          this.playTone({
            frequency,
            duration: 0.13,
            type: "sine",
            gain: 0.12
          });
        }, index * 100);
      });

      return true;
    },

    gameEnd() {
      const notes = [523, 440, 349];

      notes.forEach((frequency, index) => {
        window.setTimeout(() => {
          this.playTone({
            frequency,
            duration: 0.18,
            type: "triangle",
            gain: 0.12
          });
        }, index * 140);
      });

      return true;
    },

    button() {
      return this.playTone({
        frequency: 620,
        duration: 0.045,
        type: "sine",
        gain: 0.07
      });
    },

    notification() {
      return this.playTone({
        frequency: 820,
        duration: 0.1,
        type: "sine",
        gain: 0.1
      });
    },

    /* ---------- BACKGROUND MUSIC ---------- */

    startMusic() {
      if (!this.musicEnabled) return false;

      if (!this.createAudioContext()) return false;

      if (this.audioContext.state !== "running") {
        return false;
      }

      if (this.musicTimer !== null) {
        return true;
      }

      const melody = [
        392, 494, 587, 494,
        440, 523, 659, 523,
        392, 494, 587, 698,
        659, 587, 494, 440
      ];

      this.musicStep = 0;

      this.musicTimer = window.setInterval(() => {
        if (
          !this.musicEnabled ||
          !this.audioContext ||
          this.audioContext.state !== "running"
        ) {
          return;
        }

        const frequency = melody[
          this.musicStep % melody.length
        ];

        this.playMusicNote(frequency);

        this.musicStep++;
      }, 420);

      return true;
    },

    playMusicNote(frequency) {
      if (!this.audioContext || !this.musicGain) return;

      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      const now = this.audioContext.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

      oscillator.connect(gain);
      gain.connect(this.musicGain);

      oscillator.start(now);
      oscillator.stop(now + 0.36);

      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    },

    stopMusic() {
      if (this.musicTimer !== null) {
        window.clearInterval(this.musicTimer);
        this.musicTimer = null;
      }

      return true;
    },

    /* ---------- ENABLE / DISABLE ---------- */

    setSoundEnabled(enabled) {
      this.soundEnabled = Boolean(enabled);

      if (this.soundGain) {
        this.soundGain.gain.setTargetAtTime(
          this.soundEnabled ? 1 : 0,
          this.audioContext.currentTime,
          0.03
        );
      }

      return this.soundEnabled;
    },

    setMusicEnabled(enabled) {
      this.musicEnabled = Boolean(enabled);

      if (this.musicGain && this.audioContext) {
        this.musicGain.gain.setTargetAtTime(
          this.musicEnabled ? 0.25 : 0,
          this.audioContext.currentTime,
          0.05
        );
      }

      if (this.musicEnabled) {
        this.startMusic();
      } else {
        this.stopMusic();
      }

      return this.musicEnabled;
    },

    setVolume(value) {
      const nextVolume = Number(value);

      if (!Number.isFinite(nextVolume)) return false;

      this.volume = Math.max(0, Math.min(1, nextVolume));

      if (this.masterGain && this.audioContext) {
        this.masterGain.gain.setTargetAtTime(
          this.volume,
          this.audioContext.currentTime,
          0.04
        );
      }

      return this.volume;
    },

    /* ---------- SETTINGS ---------- */

    getSettings() {
      return {
        soundEnabled: this.soundEnabled,
        musicEnabled: this.musicEnabled,
        volume: this.volume
      };
    },

    /* ---------- CLEANUP ---------- */

    destroy() {
      this.stopMusic();

      if (this.audioContext) {
        this.audioContext.close().catch(() => {});
      }

      this.audioContext = null;
      this.masterGain = null;
      this.musicGain = null;
      this.soundGain = null;
      this.initialized = false;

      return true;
    }
  };

  window.APPARA_SOUND = Sound;

  /* ---------- FIRST USER INTERACTION ---------- */

  document.addEventListener(
    "pointerdown",
    () => {
      if (!Sound.initialized) return;

      Sound.unlock().then(() => {
        if (Sound.musicEnabled) {
          Sound.startMusic();
        }
      });
    },
    { once: true, passive: true }
  );

})();

/* =========================================================
   APPARA CHESS — SOUND & MUSIC CONTROLLER
   PART 11 END
   ========================================================= */
