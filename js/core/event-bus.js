
/* =========================================================
   APPARA CHESS — EVENT BUS
   FILE: js/core/event-bus.js
   PURPOSE: Central communication between game systems
   ========================================================= */

const eventListeners = new Map();

const EVENT_BUS_CONFIG = {
  maxListenersPerEvent: 100,
  allowDuplicateListeners: false,
  logErrors: true
};

function isValidEventName(eventName) {
  return (
    typeof eventName === "string" &&
    eventName.trim().length > 0
  );
}

function getListenerCount(eventName) {
  return eventListeners.get(eventName)?.length ?? 0;
}

export const EventBus = {
  /**
   * Subscribe to an event.
   * Returns an unsubscribe function.
   */
  on(eventName, callback) {
    if (!isValidEventName(eventName)) {
      throw new TypeError("Invalid event name.");
    }

    if (typeof callback !== "function") {
      throw new TypeError("Event callback must be a function.");
    }

    let listeners = eventListeners.get(eventName);

    if (!listeners) {
      listeners = [];
      eventListeners.set(eventName, listeners);
    }

    if (
      !EVENT_BUS_CONFIG.allowDuplicateListeners &&
      listeners.some(item => item.callback === callback)
    ) {
      return () => this.off(eventName, callback);
    }

    if (
      listeners.length >= EVENT_BUS_CONFIG.maxListenersPerEvent
    ) {
      throw new Error(
        `Maximum listeners reached for event: ${eventName}`
      );
    }

    const listener = {
      callback,
      once: false,
      active: true
    };

    listeners.push(listener);

    return () => {
      this.off(eventName, callback);
    };
  },

  /**
   * Subscribe to an event only once.
   */
  once(eventName, callback) {
    if (!isValidEventName(eventName)) {
      throw new TypeError("Invalid event name.");
    }

    if (typeof callback !== "function") {
      throw new TypeError("Event callback must be a function.");
    }

    let listeners = eventListeners.get(eventName);

    if (!listeners) {
      listeners = [];
      eventListeners.set(eventName, listeners);
    }

    const listener = {
      callback,
      once: true,
      active: true
    };

    listeners.push(listener);

    return () => {
      listener.active = false;
      this.removeInactiveListeners(eventName);
    };
  },

  /**
   * Remove a specific callback.
   */
  off(eventName, callback) {
    const listeners = eventListeners.get(eventName);

    if (!listeners) return false;

    const initialLength = listeners.length;

    for (const listener of listeners) {
      if (listener.callback === callback) {
        listener.active = false;
      }
    }

    this.removeInactiveListeners(eventName);

    return initialLength !== getListenerCount(eventName);
  },

  /**
   * Emit an event and notify active listeners.
   */
  emit(eventName, detail = null) {
    if (!isValidEventName(eventName)) {
      throw new TypeError("Invalid event name.");
    }

    const listeners = eventListeners.get(eventName);

    if (!listeners?.length) return 0;

    const event = Object.freeze({
      name: eventName,
      detail,
      timestamp: Date.now()
    });

    let executedCount = 0;

    // Snapshot prevents listener changes from affecting this emission.
    const snapshot = [...listeners];

    for (const listener of snapshot) {
      if (!listener.active) continue;

      if (listener.once) {
        listener.active = false;
      }

      try {
        listener.callback(event);
        executedCount++;
      } catch (error) {
        if (EVENT_BUS_CONFIG.logErrors) {
          console.error(
            `[APPARA CHESS EventBus] Error in "${eventName}":`,
            error
          );
        }
      }
    }

    this.removeInactiveListeners(eventName);

    return executedCount;
  },

  /**
   * Remove every listener for one event.
   */
  removeAll(eventName) {
    if (eventName === undefined) {
      eventListeners.clear();
      return;
    }

    eventListeners.delete(eventName);
  },

  /**
   * Internal cleanup.
   */
  removeInactiveListeners(eventName) {
    const listeners = eventListeners.get(eventName);

    if (!listeners) return;

    const activeListeners = listeners.filter(
      listener => listener.active
    );

    if (activeListeners.length === 0) {
      eventListeners.delete(eventName);
    } else {
      eventListeners.set(eventName, activeListeners);
    }
  },

  /**
   * Get the number of active listeners.
   */
  listenerCount(eventName) {
    return getListenerCount(eventName);
  },

  /**
   * Get a read-only snapshot of event names.
   */
  eventNames() {
    return [...eventListeners.keys()];
  }
};

/**
 * Central event names used throughout APPARA CHESS.
 */
export const APP_EVENTS = Object.freeze({
  APP: {
    READY: "app:ready",
    ERROR: "app:error",
    LOADING: "app:loading",
    LOADED: "app:loaded"
  },

  NAVIGATION: {
    CHANGE: "navigation:change",
    BACK: "navigation:back"
  },

  AUTH: {
    LOGIN: "auth:login",
    LOGOUT: "auth:logout",
    REGISTER: "auth:register",
    GUEST: "auth:guest",
    PROFILE_UPDATED: "auth:profile-updated"
  },

  GAME: {
    START: "game:start",
    END: "game:end",
    PAUSE: "game:pause",
    RESUME: "game:resume",
    MOVE: "game:move",
    UNDO: "game:undo",
    CHECK: "game:check",
    CHECKMATE: "game:checkmate",
    DRAW: "game:draw",
    RESIGN: "game:resign",
    PROMOTION: "game:promotion",
    POSITION_UPDATED: "game:position-updated"
  },

  CLOCK: {
    START: "clock:start",
    STOP: "clock:stop",
    TICK: "clock:tick",
    TIMEOUT: "clock:timeout"
  },

  PLAYER: {
    UPDATED: "player:updated",
    LEVEL_UP: "player:level-up",
    XP_CHANGED: "player:xp-changed",
    RANK_CHANGED: "player:rank-changed"
  },

  ECONOMY: {
    COINS_CHANGED: "economy:coins-changed",
    DIAMONDS_CHANGED: "economy:diamonds-changed",
    PURCHASE: "economy:purchase",
    REWARD: "economy:reward"
  },

  INVENTORY: {
    ITEM_UNLOCKED: "inventory:item-unlocked",
    ITEM_EQUIPPED: "inventory:item-equipped",
    ITEM_UPGRADED: "inventory:item-upgraded"
  },

  ONLINE: {
    CONNECTED: "online:connected",
    DISCONNECTED: "online:disconnected",
    MATCH_FOUND: "online:match-found",
    ROOM_CREATED: "online:room-created",
    ROOM_JOINED: "online:room-joined",
    OPPONENT_MOVE: "online:opponent-move"
  },

  SETTINGS: {
    LANGUAGE_CHANGED: "settings:language-changed",
    THEME_CHANGED: "settings:theme-changed",
    QUALITY_CHANGED: "settings:quality-changed",
    AUDIO_CHANGED: "settings:audio-changed"
  },

  UI: {
    MODAL_OPEN: "ui:modal-open",
    MODAL_CLOSE: "ui:modal-close",
    NOTIFICATION: "ui:notification",
    CONFIRMATION: "ui:confirmation"
  }
});

/* =========================================================
   FILE END: js/core/event-bus.js
   ========================================================= */
