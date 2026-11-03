/* =========================================================
   APPARA CHESS — CHESS CLOCK CONTROLLER
   PART 10 — js/timer.js
   ========================================================= */

(function () {
  "use strict";

  const Timer = {
    whiteTime: 600,
    blackTime: 600,

    initialTime: 600,
    increment: 0,

    activeColor: null,
    isRunning: false,
    isPaused: false,
    isExpired: false,

    intervalId: null,
    lastTick: 0,

    onTick: null,
    onTimeout: null,
    onTurnChange: null,

    elements: {
      white: null,
      black: null
    },

    /* ---------- INITIALIZATION ---------- */

    init(options = {}) {
      this.elements.white = document.getElementById("white-clock");
      this.elements.black = document.getElementById("black-clock");

      this.onTick = typeof options.onTick === "function"
        ? options.onTick
        : null;

      this.onTimeout = typeof options.onTimeout === "function"
        ? options.onTimeout
        : null;

      this.onTurnChange = typeof options.onTurnChange === "function"
        ? options.onTurnChange
        : null;

      const minutes = Number(options.minutes);

      if (Number.isFinite(minutes) && minutes > 0) {
        this.initialTime = Math.floor(minutes * 60);
      } else {
        this.initialTime = 600;
      }

      const increment = Number(options.increment);

      this.increment = Number.isFinite(increment) && increment >= 0
        ? Math.floor(increment)
        : 0;

      this.reset();

      return true;
    },

    /* ---------- RESET CLOCK ---------- */

    reset(options = {}) {
      this.stop();

      if (typeof options.minutes === "number" && options.minutes > 0) {
        this.initialTime = Math.floor(options.minutes * 60);
      }

      if (
        typeof options.increment === "number" &&
        options.increment >= 0
      ) {
        this.increment = Math.floor(options.increment);
      }

      this.whiteTime = this.initialTime;
      this.blackTime = this.initialTime;

      this.activeColor = null;
      this.isRunning = false;
      this.isPaused = false;
      this.isExpired = false;

      this.render();

      return this.getTimes();
    },

    /* ---------- START CLOCK ---------- */

    start(color = "white") {
      if (this.isExpired) return false;

      if (color !== "white" && color !== "black") {
        color = "white";
      }

      this.stopInterval();

      this.activeColor = color;
      this.isRunning = true;
      this.isPaused = false;
      this.lastTick = Date.now();

      this.startInterval();
      this.render();

      return true;
    },

    startInterval() {
      this.stopInterval();

      if (!this.isRunning || this.isPaused || this.isExpired) {
        return;
      }

      this.lastTick = Date.now();

      this.intervalId = window.setInterval(() => {
        this.tick();
      }, 100);
    },

    stopInterval() {
      if (this.intervalId !== null) {
        window.clearInterval(this.intervalId);
        this.intervalId = null;
      }
    },

    /* ---------- CLOCK TICK ---------- */

    tick() {
      if (!this.isRunning || this.isPaused || this.isExpired) {
        return;
      }

      const now = Date.now();
      const elapsed = Math.max(0, (now - this.lastTick) / 1000);

      this.lastTick = now;

      if (this.activeColor === "white") {
        this.whiteTime = Math.max(0, this.whiteTime - elapsed);
      } else if (this.activeColor === "black") {
        this.blackTime = Math.max(0, this.blackTime - elapsed);
      }

      if (
        this.activeColor === "white" &&
        this.whiteTime <= 0
      ) {
        this.whiteTime = 0;
        this.handleTimeout("white");
      } else if (
        this.activeColor === "black" &&
        this.blackTime <= 0
      ) {
        this.blackTime = 0;
        this.handleTimeout("black");
      }

      this.render();

      if (this.onTick) {
        this.onTick(this.getTimes(), this.activeColor);
      }
    },

    /* ---------- SWITCH TURN ---------- */

    switchTurn(nextColor) {
      if (this.isExpired) return false;

      if (nextColor !== "white" && nextColor !== "black") {
        return false;
      }

      if (this.isRunning && !this.isPaused) {
        this.tick();

        if (this.isExpired) return false;

        if (this.activeColor === "white") {
          this.whiteTime += this.increment;
        } else if (this.activeColor === "black") {
          this.blackTime += this.increment;
        }
      }

      this.activeColor = nextColor;

      if (this.isRunning && !this.isPaused) {
        this.lastTick = Date.now();
      }

      this.render();

      if (this.onTurnChange) {
        this.onTurnChange(nextColor, this.getTimes());
      }

      return true;
    },

    /* ---------- PAUSE AND RESUME ---------- */

    pause() {
      if (!this.isRunning || this.isPaused || this.isExpired) {
        return false;
      }

      this.tick();

      if (this.isExpired) return false;

      this.isPaused = true;
      this.stopInterval();
      this.render();

      return true;
    },

    resume() {
      if (!this.isRunning || !this.isPaused || this.isExpired) {
        return false;
      }

      this.isPaused = false;
      this.lastTick = Date.now();

      this.startInterval();
      this.render();

      return true;
    },

    /* ---------- STOP CLOCK ---------- */

    stop() {
      this.stopInterval();

      this.isRunning = false;
      this.isPaused = false;
      this.activeColor = null;

      this.render();

      return true;
    },

    /* ---------- TIMEOUT ---------- */

    handleTimeout(color) {
      if (this.isExpired) return;

      this.isExpired = true;
      this.isRunning = false;
      this.isPaused = false;

      this.stopInterval();
      this.activeColor = null;

      this.render();

      const result = {
        expiredColor: color,
        winner: color === "white" ? "black" : "white",
        times: this.getTimes()
      };

      if (this.onTimeout) {
        this.onTimeout(result);
      }

      document.dispatchEvent(
        new CustomEvent("appara:clock-timeout", {
          detail: result
        })
      );
    },

    /* ---------- FORMAT TIME ---------- */

    formatTime(seconds) {
      const safeSeconds = Math.max(
        0,
        Math.ceil(Number(seconds) || 0)
      );

      const minutes = Math.floor(safeSeconds / 60);
      const remainingSeconds = safeSeconds % 60;

      return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
      );
    },

    /* ---------- UPDATE CLOCK DISPLAY ---------- */

    render() {
      this.renderClock("white");
      this.renderClock("black");
    },

    renderClock(color) {
      const element = this.elements[color];

      if (!element) return;

      const time = color === "white"
        ? this.whiteTime
        : this.blackTime;

      element.textContent = this.formatTime(time);

      element.classList.toggle(
        "active",
        this.isRunning &&
        !this.isPaused &&
        this.activeColor === color
      );

      element.classList.toggle(
        "paused",
        this.isPaused
      );

      element.classList.toggle(
        "low-time",
        time <= 30 && time > 0
      );

      element.classList.toggle(
        "time-expired",
        time <= 0
      );

      element.setAttribute(
        "aria-label",
        color + " clock: " + this.formatTime(time)
      );
    },

    /* ---------- SET TIME ---------- */

    setTime(color, seconds) {
      if (color !== "white" && color !== "black") {
        return false;
      }

      const value = Number(seconds);

      if (!Number.isFinite(value) || value < 0) {
        return false;
      }

      if (color === "white") {
        this.whiteTime = value;
      } else {
        this.blackTime = value;
      }

      if (
        value === 0 &&
        this.isRunning &&
        this.activeColor === color
      ) {
        this.handleTimeout(color);
      } else {
        this.render();
      }

      return true;
    },

    /* ---------- ADD TIME ---------- */

    addTime(color, seconds) {
      if (color !== "white" && color !== "black") {
        return false;
      }

      const value = Number(seconds);

      if (!Number.isFinite(value) || value <= 0) {
        return false;
      }

      if (color === "white") {
        this.whiteTime += value;
      } else {
        this.blackTime += value;
      }

      this.render();

      return true;
    },

    /* ---------- GET CLOCK DATA ---------- */

    getTimes() {
      return {
        white: this.whiteTime,
        black: this.blackTime,
        whiteFormatted: this.formatTime(this.whiteTime),
        blackFormatted: this.formatTime(this.blackTime),
        activeColor: this.activeColor,
        isRunning: this.isRunning,
        isPaused: this.isPaused,
        isExpired: this.isExpired
      };
    },

    getActiveColor() {
      return this.activeColor;
    },

    isActive() {
      return this.isRunning && !this.isPaused && !this.isExpired;
    },

    /* ---------- CLEANUP ---------- */

    destroy() {
      this.stop();
      this.onTick = null;
      this.onTimeout = null;
      this.onTurnChange = null;

      this.elements.white = null;
      this.elements.black = null;

      return true;
    }
  };

  window.APPARA_TIMER = Timer;

})();

/* =========================================================
   APPARA CHESS — CHESS CLOCK CONTROLLER
   PART 10 END
   ========================================================= */
