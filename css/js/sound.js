
/* =========================================================
   APPARA CHESS — SOUND SYSTEM
   FILE: js/sound.js
   PART 10
========================================================= */

"use strict";

class ApparaChessSound {

    constructor() {
        this.enabled = window.APPARA_CONFIG.sound.enabled;
        this.musicEnabled = window.APPARA_CONFIG.sound.musicEnabled;
        this.effectsEnabled = window.APPARA_CONFIG.sound.effectsEnabled;
        this.volume = window.APPARA_CONFIG.sound.volume;

        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.musicTimer = null;

        this.initialized = false;
        this.musicPlaying = false;

        this.musicNotes = [
            261.63, 329.63, 392.00, 329.63,
            293.66, 349.23, 440.00, 349.23,
            261.63, 329.63, 392.00, 493.88
        ];

        this.musicIndex = 0;
    }

    /* INITIALIZE AUDIO */
    async initialize() {
        if (this.initialized) {
            if (this.audioContext?.state === "suspended") {
                await this.audioContext.resume();
            }

            return true;
        }

        try {
            const AudioContextClass =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContextClass) {
                console.warn("AudioContext is unavailable.");
                return false;
            }

            this.audioContext = new AudioContextClass();

            this.masterGain = this.audioContext.createGain();
            this.musicGain = this.audioContext.createGain();

            this.masterGain.gain.value = this.volume;
            this.musicGain.gain.value = 0.12;

            this.musicGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);

            this.initialized = true;

            if (this.audioContext.state === "suspended") {
                await this.audioContext.resume();
            }

            return true;

        } catch (error) {
            console.error("Audio initialization failed:", error);
            return false;
        }
    }

    /* PLAY GENERATED TONE */
    async playTone(
        frequency = 440,
        duration = 0.12,
        type = "sine",
        volume = 0.25
    ) {
        if (!this.enabled || !this.effectsEnabled) return;

        const ready = await this.initialize();
        if (!ready) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(
                frequency,
                this.audioContext.currentTime
            );

            gain.gain.setValueAtTime(
                Math.max(0, volume),
                this.audioContext.currentTime
            );

            gain.gain.exponentialRampToValueAtTime(
                0.001,
                this.audioContext.currentTime + duration
            );

            oscillator.connect(gain);
            gain.connect(this.masterGain);

            oscillator.start();
            oscillator.stop(
                this.audioContext.currentTime + duration
            );

        } catch (error) {
            console.error("Sound playback failed:", error);
        }
    }

    /* PIECE MOVE SOUND */
    playMove() {
        this.playTone(520, 0.07, "sine", 0.16);
    }

    /* PIECE CAPTURE SOUND */
    playCapture() {
        this.playTone(220, 0.14, "triangle", 0.28);
    }

    /* CHECK SOUND */
    playCheck() {
        this.playTone(660, 0.18, "square", 0.12);
    }

    /* CASTLING SOUND */
    playCastle() {
        this.playTone(440, 0.10, "sine", 0.18);
        setTimeout(() => {
            this.playTone(660, 0.12, "sine", 0.18);
        }, 100);
    }

    /* PROMOTION SOUND */
    playPromotion() {
        this.playTone(523, 0.12, "sine", 0.20);

        setTimeout(() => {
            this.playTone(659, 0.12, "sine", 0.20);
        }, 110);

        setTimeout(() => {
            this.playTone(784, 0.20, "sine", 0.20);
        }, 220);
    }

    /* GAME START SOUND */
    playGameStart() {
        [392, 523, 659].forEach((frequency, index) => {
            setTimeout(() => {
                this.playTone(frequency, 0.18, "sine", 0.20);
            }, index * 130);
        });
    }

    /* VICTORY SOUND */
    playVictory() {
        [523, 659, 784, 1046].forEach((frequency, index) => {
            setTimeout(() => {
                this.playTone(frequency, 0.25, "triangle", 0.22);
            }, index * 180);
        });
    }

    /* DEFEAT SOUND */
    playDefeat() {
        [440, 349, 293].forEach((frequency, index) => {
            setTimeout(() => {
                this.playTone(frequency, 0.28, "triangle", 0.20);
            }, index * 220);
        });
    }

    /* BUTTON SOUND */
    playClick() {
        this.playTone(700, 0.045, "sine", 0.10);
    }

    /* MUSIC SEQUENCE */
    async playMusicNote() {
        if (!this.musicPlaying || !this.musicEnabled) return;

        const ready = await this.initialize();
        if (!ready) return;

        const frequency =
            this.musicNotes[this.musicIndex % this.musicNotes.length];

        this.musicIndex++;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            oscillator.type = "sine";
            oscillator.frequency.value = frequency;

            gain.gain.setValueAtTime(
                0.0001,
                this.audioContext.currentTime
            );

            gain.gain.linearRampToValueAtTime(
                0.035,
                this.audioContext.currentTime + 0.08
            );

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                this.audioContext.currentTime + 0.65
            );

            oscillator.connect(gain);
            gain.connect(this.musicGain);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.7);

        } catch (error) {
            console.error("Music note error:", error);
        }
    }

    /* START BACKGROUND MUSIC */
    async startMusic() {
        if (!this.enabled || !this.musicEnabled) return false;

        const ready = await this.initialize();
        if (!ready) return false;

        this.stopMusic();

        this.musicPlaying = true;
        this.musicIndex = 0;

        this.playMusicNote();

        this.musicTimer = setInterval(() => {
            this.playMusicNote();
        }, 700);

        return true;
    }

    /* STOP BACKGROUND MUSIC */
    stopMusic() {
        this.musicPlaying = false;

        if (this.musicTimer !== null) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }

    /* TOGGLE MUSIC */
    async toggleMusic() {
        this.musicEnabled = !this.musicEnabled;

        if (this.musicEnabled) {
            await this.startMusic();
        } else {
            this.stopMusic();
        }

        return this.musicEnabled;
    }

    /* TOGGLE SOUND EFFECTS */
    toggleEffects() {
        this.effectsEnabled = !this.effectsEnabled;
        return this.effectsEnabled;
    }

    /* TOGGLE ALL SOUND */
    toggleSound() {
        this.enabled = !this.enabled;

        if (!this.enabled) {
            this.stopMusic();
        }

        return this.enabled;
    }

    /* SET MASTER VOLUME */
    setVolume(value) {
        const numericValue = Number(value);

        this.volume = Math.max(
            0,
            Math.min(1, Number.isFinite(numericValue) ? numericValue : 0)
        );

        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }

        return this.volume;
    }

    /* SAVE SOUND SETTINGS */
    saveSettings() {
        return window.APPARA_UTILS.saveData(
            window.APPARA_CONFIG.storage.settings,
            {
                soundEnabled: this.enabled,
                musicEnabled: this.musicEnabled,
                effectsEnabled: this.effectsEnabled,
                volume: this.volume
            }
        );
    }

    /* LOAD SOUND SETTINGS */
    loadSettings() {
        const saved = window.APPARA_UTILS.loadData(
            window.APPARA_CONFIG.storage.settings,
            null
        );

        if (!saved) return false;

        if (typeof saved.soundEnabled === "boolean") {
            this.enabled = saved.soundEnabled;
        }

        if (typeof saved.musicEnabled === "boolean") {
            this.musicEnabled = saved.musicEnabled;
        }

        if (typeof saved.effectsEnabled === "boolean") {
            this.effectsEnabled = saved.effectsEnabled;
        }

        if (typeof saved.volume === "number") {
            this.setVolume(saved.volume);
        }

        return true;
    }

    /* CLEANUP */
    destroy() {
        this.stopMusic();

        if (this.audioContext &&
            this.audioContext.state !== "closed") {
            this.audioContext.close();
        }

        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.initialized = false;
    }

}

/* GLOBAL SOUND INSTANCE */
window.apparaSound = new ApparaChessSound();

/* PART 10 END */
