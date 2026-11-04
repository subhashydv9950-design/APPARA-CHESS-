/* =========================================================
   APPARA CHESS — CHESS CLOCK CONTROLLER
   Complete replacement: js/timer.js
========================================================= */

(function () {
  "use strict";

  const Timer = {

    /* ---------- CLOCK STATE ---------- */

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

      this.stop();

      this.elements.white =
        document.getElementById("white-clock");

      this.elements.black =
        document.getElementById("black-clock");

      this.onTick =
        typeof options.onTick === "function"
          ? options.onTick
          : null;

      this.onTimeout =
        typeof options.onTimeout === "function"
          ? options.onTimeout
          : null;

      this.onTurnChange =
        typeof options.onTurnChange === "function"
          ? options.onTurnChange
          : null;

      const minutes = Number(options.minutes);

      this.initialTime =
        Number.isFinite(minutes) && minutes > 0
          ? Math.floor(minutes * 60)
          : 600;

      const increment = Number(options.increment);

      this.increment =
        Number.isFinite(increment) && increment >= 0
          ? Math.floor(increment)
          : 0;

      this.reset();

      return true;
    },

    /* ---------- RESET ---------- */

    reset(options = {}) {

      this.stopInterval();

      if (
        Number.isFinite(Number(options.minutes)) &&
        Number(options.minutes) > 0
      ) {
        this.initialTime =
          Math.floor(Number(options.minutes) * 60);
      }

      if (
        options.increment !== undefined &&
        Number.isFinite(Number(options.increment)) &&
        Number(options.increment) >= 0
      ) {
        this.increment =
          Math.floor(Number(options.increment));
      }

      this.whiteTime = this.initialTime;
      this.blackTime = this.initialTime;

      this.activeColor = null;

      this.isRunning = false;
      this.isPaused = false;
      this.isExpired = false;

      this.lastTick = 0;

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

      if (
        !this.isRunning ||
        this.isPaused ||
        this.isExpired
      ) {
        return false;
      }

      this.lastTick = Date.now();

      this.intervalId = window.setInterval(() => {
        this.tick();
      }, 100);

      return true;
    },

    stopInterval() {

      if (this.intervalId !== null) {
        window.clearInterval(this.intervalId);
        this.intervalId = null;
      }
    },

    /* ---------- CLOCK TICK ---------- */

    tick() {

      if (
        !this.isRunning ||
        this.isPaused ||
        this.isExpired ||
        !this.activeColor
      ) {
        return false;
      }

      const now = Date.now();

      const elapsed = Math.max(
        0,
        (now - this.lastTick) / 1000
      );

      this.lastTick = now;

      if (this.activeColor === "white") {
        this.whiteTime = Math.max(
          0,
          this.whiteTime - elapsed
        );
      } else {
        this.blackTime = Math.max(
          0,
          this.blackTime - elapsed
        );
      }

      if (
        this.activeColor === "white" &&
        this.whiteTime <= 0
      ) {
        this.whiteTime = 0;
        this.handleTimeout("white");
        return false;
      }

      if (
        this.activeColor === "black" &&
        this.blackTime <= 0
      ) {
        this.blackTime = 0;
        this.handleTimeout("black");
        return false;
      }

      this.render();

      if (this.onTick) {
        this.onTick(
          this.getTimes(),
          this.activeColor
        );
      }

      return true;
    },

    /* ---------- SWITCH TURN ---------- */

    switchTurn(nextColor) {

      if (this.isExpired) return false;

      /*
       * If no color is provided, switch automatically.
       * This supports multiplayer.js switchTurn() calls.
       */

      if (
        nextColor !== "white" &&
        nextColor !== "black"
      ) {
        if (this.activeColor === "white") {
          nextColor = "black";
        } else if (this.activeColor === "black") {
          nextColor = "white";
        } else {
          nextColor = "white";
        }
      }

      if (
        nextColor !== "white" &&
        nextColor !== "black"
      ) {
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
        this.onTurnChange(
          nextColor,
          this.getTimes()
        );
      }

      return true;
    },

    /* ---------- PAUSE ---------- */

    pause() {

      if (
        !this.isRunning ||
        this.isPaused ||
        this.isExpired
      ) {
        return false;
      }

      this.tick();

      if (this.isExpired) return false;

      this.isPaused = true;

      this.stopInterval();
      this.render();

      return true;
    },

    /* ---------- RESUME ---------- */

    resume() {

      if (
        !this.isRunning ||
        !this.isPaused ||
        this.isExpired
      ) {
        return false;
      }

      this.isPaused = false;
      this.lastTick = Date.now();

      this.startInterval();
      this.render();

      return true;
    },

    /* ---------- STOP ---------- */

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

      if (this.isExpired) return false;

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

      /*
       * Game Controller expects the expired color string.
       */

      if (this.onTimeout) {
        try {
          this.onTimeout(color, result);
        } catch (error) {
          console.error(
            "APPARA TIMER: Timeout callback failed.",
            error
          );
        }
      }

      document.dispatchEvent(
        new CustomEvent("appara:clock-timeout", {
          detail: result
        })
      );

      return true;
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

    /* ---------- RENDER ---------- */

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

      if (
        color !== "white" &&
        color !== "black"
      ) {
        return false;
      }

      const value = Number(seconds);

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
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

      if (
        color !== "white" &&
        color !== "black"
      ) {
        return false;
      }

      const value = Number(seconds);

      if (
        !Number.isFinite(value) ||
        value <= 0
      ) {
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

    /* ---------- GET TIMES ---------- */

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
      return (
        this.isRunning &&
        !this.isPaused &&
        !this.isExpired
      );
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
   END OF APPARA CHESS TIMER CONTROLLER
========================================================= */
