
/* =========================================================
   APPARA CHESS
   FILE 18: chess-clock.js
   SECTION: js/chess/
   PURPOSE: Chess Clock and Time Control System
   ========================================================= */

import { EventBus, APP_EVENTS } from "../core/event-bus.js";


/* ---------------------------------------------------------
   1. TIME CONTROL PRESETS
--------------------------------------------------------- */

export const TIME_CONTROLS = Object.freeze({

  BULLET_1_0: {
    id: "bullet-1-0",
    name: "Bullet 1+0",
    category: "Bullet",
    initialSeconds: 60,
    incrementSeconds: 0
  },

  BULLET_2_1: {
    id: "bullet-2-1",
    name: "Bullet 2+1",
    category: "Bullet",
    initialSeconds: 120,
    incrementSeconds: 1
  },

  BLITZ_3_0: {
    id: "blitz-3-0",
    name: "Blitz 3+0",
    category: "Blitz",
    initialSeconds: 180,
    incrementSeconds: 0
  },

  BLITZ_3_2: {
    id: "blitz-3-2",
    name: "Blitz 3+2",
    category: "Blitz",
    initialSeconds: 180,
    incrementSeconds: 2
  },

  BLITZ_5_0: {
    id: "blitz-5-0",
    name: "Blitz 5+0",
    category: "Blitz",
    initialSeconds: 300,
    incrementSeconds: 0
  },

  BLITZ_5_3: {
    id: "blitz-5-3",
    name: "Blitz 5+3",
    category: "Blitz",
    initialSeconds: 300,
    incrementSeconds: 3
  },

  RAPID_10_0: {
    id: "rapid-10-0",
    name: "Rapid 10+0",
    category: "Rapid",
    initialSeconds: 600,
    incrementSeconds: 0
  },

  RAPID_10_5: {
    id: "rapid-10-5",
    name: "Rapid 10+5",
    category: "Rapid",
    initialSeconds: 600,
    incrementSeconds: 5
  },

  RAPID_15_10: {
    id: "rapid-15-10",
    name: "Rapid 15+10",
    category: "Rapid",
    initialSeconds: 900,
    incrementSeconds: 10
  },

  CLASSICAL_30_0: {
    id: "classical-30-0",
    name: "Classical 30+0",
    category: "Classical",
    initialSeconds: 1800,
    incrementSeconds: 0
  },

  CLASSICAL_30_20: {
    id: "classical-30-20",
    name: "Classical 30+20",
    category: "Classical",
    initialSeconds: 1800,
    incrementSeconds: 20
  }

});


/* ---------------------------------------------------------
   2. HELPER FUNCTIONS
--------------------------------------------------------- */

function normalizeColor(color) {

  if (color === "w" || color === "white") {
    return "w";
  }

  if (color === "b" || color === "black") {
    return "b";
  }

  throw new Error("Invalid chess clock color.");
}


function formatTime(milliseconds) {

  const safeTime = Math.max(0, Math.floor(milliseconds));

  const totalSeconds = Math.floor(safeTime / 1000);

  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  const tenths = Math.floor((safeTime % 1000) / 100);

  if (minutes >= 10) {
    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0")
    );
  }

  if (minutes > 0) {
    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(seconds).padStart(2, "0")
    );
  }

  return (
    String(seconds).padStart(2, "0") +
    "." +
    String(tenths)
  );
}


/* ---------------------------------------------------------
   3. CHESS CLOCK CLASS
--------------------------------------------------------- */

export class ChessClock {

  constructor(options = {}) {

    const initialSeconds = Number(
      options.initialSeconds ?? 300
    );

    const incrementSeconds = Number(
      options.incrementSeconds ?? 0
    );

    if (
      !Number.isFinite(initialSeconds) ||
      initialSeconds <= 0 ||
      !Number.isFinite(incrementSeconds) ||
      incrementSeconds < 0
    ) {
      throw new Error("Invalid chess clock settings.");
    }

    this.initialMilliseconds = initialSeconds * 1000;

    this.incrementMilliseconds = incrementSeconds * 1000;

    this.remaining = {
      w: this.initialMilliseconds,
      b: this.initialMilliseconds
    };

    this.activeColor = null;

    this.running = false;

    this.paused = false;

    this.finished = false;

    this.lastTick = null;

    this.flaggedColor = null;

    this.onFlag = typeof options.onFlag === "function"
      ? options.onFlag
      : null;

    this.matchId = options.matchId || null;
  }


  /* -------------------------------------------------------
     4. START CLOCK
  ------------------------------------------------------- */

  start(color = "w") {

    if (this.finished) {
      return {
        success: false,
        error: "Clock has already finished."
      };
    }

    if (this.running) {
      return {
        success: false,
        error: "Clock is already running."
      };
    }

    const normalizedColor = normalizeColor(color);

    if (this.remaining[normalizedColor] <= 0) {
      this.handleTimeout(normalizedColor);

      return {
        success: false,
        error: "Player has run out of time."
      };
    }

    this.activeColor = normalizedColor;

    this.running = true;

    this.paused = false;

    this.lastTick = Date.now();

    return {
      success: true,
      snapshot: this.getSnapshot()
    };
  }


  /* -------------------------------------------------------
     5. UPDATE CLOCK
  ------------------------------------------------------- */

  update(now = Date.now()) {

    if (
      !this.running ||
      this.paused ||
      this.finished ||
      this.lastTick === null
    ) {
      return this.getSnapshot();
    }

    const currentTime = Number(now);

    if (!Number.isFinite(currentTime)) {
      return this.getSnapshot();
    }

    const elapsed = Math.max(0, currentTime - this.lastTick);

    this.lastTick = currentTime;

    const color = this.activeColor;

    this.remaining[color] = Math.max(
      0,
      this.remaining[color] - elapsed
    );

    if (this.remaining[color] <= 0) {
      this.handleTimeout(color);
    }

    return this.getSnapshot();
  }


  /* -------------------------------------------------------
     6. COMPLETE MOVE AND SWITCH TURN
  ------------------------------------------------------- */

  completeMove(nextColor) {

    if (!this.running || this.paused || this.finished) {
      return {
        success: false,
        error: "Clock is not running."
      };
    }

    this.update();

    if (this.finished) {
      return {
        success: false,
        error: "Time has expired."
      };
    }

    const next = normalizeColor(nextColor);

    if (next === this.activeColor) {
      return {
        success: false,
        error: "Next player must be the opposite color."
      };
    }

    const previousColor = this.activeColor;

    this.remaining[previousColor] += this.incrementMilliseconds;

    this.activeColor = next;

    this.lastTick = Date.now();

    return {
      success: true,
      snapshot: this.getSnapshot()
    };
  }


  /* -------------------------------------------------------
     7. PAUSE CLOCK
  ------------------------------------------------------- */

  pause() {

    if (!this.running || this.finished) {
      return {
        success: false,
        error: "Clock is not running."
      };
    }

    if (this.paused) {
      return {
        success: true,
        snapshot: this.getSnapshot()
      };
    }

    this.update();

    if (this.finished) {
      return {
        success: false,
        error: "Clock has expired."
      };
    }

    this.paused = true;

    this.lastTick = null;

    return {
      success: true,
      snapshot: this.getSnapshot()
    };
  }


  /* -------------------------------------------------------
     8. RESUME CLOCK
  ------------------------------------------------------- */

  resume() {

    if (!this.running || this.finished) {
      return {
        success: false,
        error: "Clock cannot be resumed."
      };
    }

    if (!this.paused) {
      return {
        success: true,
        snapshot: this.getSnapshot()
      };
    }

    this.paused = false;

    this.lastTick = Date.now();

    return {
      success: true,
      snapshot: this.getSnapshot()
    };
  }


  /* -------------------------------------------------------
     9. STOP CLOCK
  ------------------------------------------------------- */

  stop() {

    if (this.running && !this.paused) {
      this.update();
    }

    this.running = false;

    this.paused = false;

    this.lastTick = null;

    return {
      success: true,
      snapshot: this.getSnapshot()
    };
  }


  /* -------------------------------------------------------
     10. HANDLE TIMEOUT
  ------------------------------------------------------- */

  handleTimeout(color) {

    if (this.finished) {
      return;
    }

    this.remaining[color] = 0;

    this.running = false;

    this.paused = false;

    this.finished = true;

    this.flaggedColor = color;

    this.lastTick = null;

    const result = {
      matchId: this.matchId,
      flaggedColor: color,
      winner: color === "w" ? "b" : "w",
      remaining: { ...this.remaining }
    };

    EventBus.emit(APP_EVENTS.GAME.END, {
      ...result,
      reason: "timeout"
    });

    if (this.onFlag) {
      this.onFlag(result);
    }
  }


  /* -------------------------------------------------------
     11. RESET CLOCK
  ------------------------------------------------------- */

  reset(options = {}) {

    if (options.initialSeconds !== undefined) {

      const seconds = Number(options.initialSeconds);

      if (!Number.isFinite(seconds) || seconds <= 0) {
        return {
          success: false,
          error: "Invalid initial time."
        };
      }

      this.initialMilliseconds = seconds * 1000;
    }

    if (options.incrementSeconds !== undefined) {

      const increment = Number(options.incrementSeconds);

      if (!Number.isFinite(increment) || increment < 0) {
        return {
          success: false,
          error: "Invalid increment."
        };
      }

      this.incrementMilliseconds = increment * 1000;
    }

    this.remaining = {
      w: this.initialMilliseconds,
      b: this.initialMilliseconds
    };

    this.activeColor = null;

    this.running = false;

    this.paused = false;

    this.finished = false;

    this.lastTick = null;

    this.flaggedColor = null;

    return {
      success: true,
      snapshot: this.getSnapshot()
    };
  }


  /* -------------------------------------------------------
     12. GET PLAYER TIME
  ------------------------------------------------------- */

  getTime(color) {

    const normalizedColor = normalizeColor(color);

    let time = this.remaining[normalizedColor];

    if (
      this.running &&
      !this.paused &&
      !this.finished &&
      this.activeColor === normalizedColor
    ) {
      time -= Math.max(0, Date.now() - this.lastTick);
    }

    return Math.max(0, time);
  }


  /* -------------------------------------------------------
     13. GET FORMATTED TIME
  ------------------------------------------------------- */

  getFormattedTime(color) {

    return formatTime(this.getTime(color));
  }


  /* -------------------------------------------------------
     14. GET CLOCK SNAPSHOT
  ------------------------------------------------------- */

  getSnapshot() {

    return {

      white: {
        milliseconds: this.getTime("w"),
        formatted: this.getFormattedTime("w")
      },

      black: {
        milliseconds: this.getTime("b"),
        formatted: this.getFormattedTime("b")
      },

      activeColor: this.activeColor,

      running: this.running,

      paused: this.paused,

      finished: this.finished,

      flaggedColor: this.flaggedColor,

      incrementMilliseconds: this.incrementMilliseconds

    };
  }


  /* -------------------------------------------------------
     15. CLOCK STATUS
  ------------------------------------------------------- */

  isRunning() {
    return this.running && !this.paused && !this.finished;
  }

  isFinished() {
    return this.finished;
  }

  getActiveColor() {
    return this.activeColor;
  }

}


/* ---------------------------------------------------------
   16. PRESET FACTORY
--------------------------------------------------------- */

export function createClockFromPreset(presetId, options = {}) {

  const preset = Object.values(TIME_CONTROLS).find(
    item => item.id === presetId
  );

  if (!preset) {
    throw new Error("Unknown chess time control preset.");
  }

  return new ChessClock({
    initialSeconds: preset.initialSeconds,
    incrementSeconds: preset.incrementSeconds,
    ...options
  });
}


/* ---------------------------------------------------------
   17. CUSTOM CLOCK FACTORY
--------------------------------------------------------- */

export function createCustomClock(
  initialMinutes,
  incrementSeconds = 0,
  options = {}
) {

  const minutes = Number(initialMinutes);

  const increment = Number(incrementSeconds);

  if (
    !Number.isFinite(minutes) ||
    minutes <= 0 ||
    !Number.isFinite(increment) ||
    increment < 0
  ) {
    throw new Error("Invalid custom time control.");
  }

  return new ChessClock({
    initialSeconds: minutes * 60,
    incrementSeconds: increment,
    ...options
  });
}


/* =========================================================
   FILE 18 END
   FILE: js/chess/chess-clock.js
   ========================================================= */
  
