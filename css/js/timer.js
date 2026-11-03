
/* =========================================================
   APPARA CHESS — CHESS CLOCK
   FILE: js/timer.js
   PART 09
========================================================= */

"use strict";

class ApparaChessTimer {

    constructor() {
        this.whiteTime = 600;
        this.blackTime = 600;

        this.increment = 0;
        this.activeColor = null;

        this.running = false;
        this.paused = false;
        this.interval = null;

        this.onTick = null;
        this.onTimeout = null;

        this.lastTick = null;
        this.unlimited = false;

        this.initialize();
    }

    /* INITIALIZE TIMER */
    initialize() {
        this.updateDisplay();
        return true;
    }

    /* CONFIGURE CLOCK */
    configure(clockName = "rapid") {
        const preset = window.APPARA_UTILS.getClock(clockName);

        this.stop();

        this.increment = preset.increment || 0;
        this.unlimited = preset.minutes === 0;

        const startingTime = preset.minutes * 60;

        this.whiteTime = startingTime;
        this.blackTime = startingTime;

        this.activeColor = null;
        this.paused = false;

        this.updateDisplay();

        return true;
    }

    /* SET CUSTOM TIME */
    setTime(whiteSeconds, blackSeconds = whiteSeconds) {
        this.stop();

        this.whiteTime = Math.max(0, Number(whiteSeconds) || 0);
        this.blackTime = Math.max(0, Number(blackSeconds) || 0);

        this.unlimited = false;
        this.activeColor = null;

        this.updateDisplay();

        return true;
    }

    /* GET TIME */
    getTime(color) {
        if (color === "white") return this.whiteTime;
        if (color === "black") return this.blackTime;

        return null;
    }

    /* START CLOCK */
    start(color = "white") {
        if (this.unlimited) {
            this.activeColor = color;
            this.running = true;
            this.paused = false;
            this.updateDisplay();
            return true;
        }

        if (color !== "white" && color !== "black") {
            return false;
        }

        if (this.isExpired(color)) {
            return false;
        }

        this.stopInterval();

        this.activeColor = color;
        this.running = true;
        this.paused = false;
        this.lastTick = Date.now();

        this.interval = setInterval(() => {
            this.tick();
        }, 100);

        this.updateDisplay();

        return true;
    }

    /* CLOCK TICK */
    tick() {
        if (!this.running || this.paused || this.unlimited) {
            return;
        }

        const now = Date.now();
        const elapsed = (now - this.lastTick) / 1000;

        this.lastTick = now;

        if (this.activeColor === "white") {
            this.whiteTime = Math.max(0, this.whiteTime - elapsed);
        } else if (this.activeColor === "black") {
            this.blackTime = Math.max(0, this.blackTime - elapsed);
        }

        this.updateDisplay();

        if (typeof this.onTick === "function") {
            this.onTick({
                white: this.whiteTime,
                black: this.blackTime,
                active: this.activeColor
            });
        }

        if (this.isExpired(this.activeColor)) {
            this.handleTimeout();
        }
    }

    /* SWITCH PLAYER */
    switchTurn(nextColor) {
        if (!this.running || this.paused) {
            return false;
        }

        if (this.activeColor === "white") {
            this.whiteTime += this.increment;
        } else if (this.activeColor === "black") {
            this.blackTime += this.increment;
        }

        this.stopInterval();

        this.start(nextColor);

        this.updateDisplay();

        return true;
    }

    /* PAUSE CLOCK */
    pause() {
        if (!this.running || this.paused) return false;

        this.tick();

        if (!this.running) return false;

        this.paused = true;
        this.stopInterval();

        this.updateDisplay();

        return true;
    }

    /* RESUME CLOCK */
    resume() {
        if (!this.running || !this.paused) return false;

        this.paused = false;
        this.lastTick = Date.now();

        if (!this.unlimited) {
            this.interval = setInterval(() => {
                this.tick();
            }, 100);
        }

        this.updateDisplay();

        return true;
    }

    /* STOP CLOCK */
    stop() {
        this.stopInterval();

        this.running = false;
        this.paused = false;

        return true;
    }

    /* CLEAR INTERVAL */
    stopInterval() {
        if (this.interval !== null) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /* CHECK TIMEOUT */
    isExpired(color) {
        if (color === "white") return this.whiteTime <= 0;
        if (color === "black") return this.blackTime <= 0;

        return false;
    }

    /* HANDLE TIMEOUT */
    handleTimeout() {
        const loser = this.activeColor;
        const winner = loser === "white" ? "black" : "white";

        this.stop();

        if (typeof this.onTimeout === "function") {
            this.onTimeout({
                loser: loser,
                winner: winner,
                reason: "timeout"
            });
        }

        this.updateDisplay();
    }

    /* UPDATE CLOCK DISPLAY */
    updateDisplay() {
        const whiteElement =
            document.getElementById("white-clock");

        const blackElement =
            document.getElementById("black-clock");

        const whiteText = this.unlimited
            ? "∞"
            : window.APPARA_UTILS.formatTime(this.whiteTime);

        const blackText = this.unlimited
            ? "∞"
            : window.APPARA_UTILS.formatTime(this.blackTime);

        if (whiteElement) {
            whiteElement.textContent = whiteText;

            whiteElement.classList.toggle(
                "active-clock",
                this.activeColor === "white" && this.running
            );

            whiteElement.classList.toggle(
                "low-time",
                !this.unlimited && this.whiteTime <= 30
            );
        }

        if (blackElement) {
            blackElement.textContent = blackText;

            blackElement.classList.toggle(
                "active-clock",
                this.activeColor === "black" && this.running
            );

            blackElement.classList.toggle(
                "low-time",
                !this.unlimited && this.blackTime <= 30
            );
        }
    }

    /* RESET CLOCK */
    reset(clockName = "rapid") {
        this.configure(clockName);
        return true;
    }

    /* GET COMPLETE CLOCK DATA */
    getState() {
        return {
            whiteTime: this.whiteTime,
            blackTime: this.blackTime,
            activeColor: this.activeColor,
            running: this.running,
            paused: this.paused,
            unlimited: this.unlimited,
            increment: this.increment
        };
    }

    /* CLEANUP */
    destroy() {
        this.stop();

        this.onTick = null;
        this.onTimeout = null;
    }

}

/* GLOBAL TIMER INSTANCE */
window.apparaTimer = new ApparaChessTimer();

/* PART 09 END */
          
