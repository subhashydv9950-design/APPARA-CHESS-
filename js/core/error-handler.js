
/* =========================================================
   APPARA CHESS — ERROR HANDLER
   FILE: js/core/error-handler.js
   PURPOSE: Centralized application error management
   ========================================================= */

const ERROR_CONFIG = Object.freeze({
  maxStoredErrors: 100,
  logToConsole: true,
  captureGlobalErrors: true,
  captureUnhandledRejections: true
});

const errorHistory = [];

const ERROR_TYPES = Object.freeze({
  GENERAL: "GENERAL",
  VALIDATION: "VALIDATION",
  NETWORK: "NETWORK",
  AUTHENTICATION: "AUTHENTICATION",
  STORAGE: "STORAGE",
  CHESS_ENGINE: "CHESS_ENGINE",
  RENDERING: "RENDERING",
  AUDIO: "AUDIO",
  ASSET: "ASSET",
  UNKNOWN: "UNKNOWN"
});

function createErrorId() {
  return `ERR-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function normalizeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack || null
    };
  }

  return {
    name: "UnknownError",
    message: String(error ?? "Unknown error"),
    stack: null
  };
}

function storeError(record) {
  errorHistory.unshift(record);

  if (errorHistory.length > ERROR_CONFIG.maxStoredErrors) {
    errorHistory.length = ERROR_CONFIG.maxStoredErrors;
  }
}

function safeConsoleLog(record) {
  if (!ERROR_CONFIG.logToConsole) return;

  console.error(
    `[APPARA CHESS] ${record.type}: ${record.message}`,
    record
  );
}

export const ErrorHandler = {
  /**
   * Record and handle an error.
   */
  handle(error, options = {}) {
    const normalized = normalizeError(error);

    const record = Object.freeze({
      id: createErrorId(),
      type: Object.values(ERROR_TYPES).includes(options.type)
        ? options.type
        : ERROR_TYPES.GENERAL,
      message: normalized.message,
      name: normalized.name,
      stack: normalized.stack,
      context: String(options.context || "Application"),
      severity: ["info", "warning", "error", "critical"].includes(
        options.severity
      )
        ? options.severity
        : "error",
      timestamp: new Date().toISOString()
    });

    storeError(record);
    safeConsoleLog(record);

    return record;
  },

  /**
   * Record a warning without throwing an exception.
   */
  warn(message, context = "Application") {
    return this.handle(
      new Error(String(message)),
      {
        type: ERROR_TYPES.GENERAL,
        context,
        severity: "warning"
      }
    );
  },

  /**
   * Record an informational event.
   */
  info(message, context = "Application") {
    return this.handle(
      new Error(String(message)),
      {
        type: ERROR_TYPES.GENERAL,
        context,
        severity: "info"
      }
    );
  },

  /**
   * Return a copy of recent errors.
   */
  getHistory() {
    return errorHistory.map(record => ({ ...record }));
  },

  /**
   * Get errors filtered by type.
   */
  getByType(type) {
    return errorHistory
      .filter(record => record.type === type)
      .map(record => ({ ...record }));
  },

  /**
   * Remove all in-memory error records.
   */
  clearHistory() {
    errorHistory.length = 0;
  },

  /**
   * Create a user-friendly error message.
   * Internal stack traces are never exposed.
   */
  getUserMessage(errorType) {
    const messages = {
      [ERROR_TYPES.VALIDATION]:
        "Please check the information and try again.",

      [ERROR_TYPES.NETWORK]:
        "Connection problem. Please check your internet connection.",

      [ERROR_TYPES.AUTHENTICATION]:
        "We could not verify your account. Please try again.",

      [ERROR_TYPES.STORAGE]:
        "Your data could not be saved on this device.",

      [ERROR_TYPES.CHESS_ENGINE]:
        "The chess game encountered a problem. Please try again.",

      [ERROR_TYPES.RENDERING]:
        "The 3D scene could not be displayed correctly.",

      [ERROR_TYPES.AUDIO]:
        "Audio could not be played.",

      [ERROR_TYPES.ASSET]:
        "A game resource could not be loaded.",

      [ERROR_TYPES.UNKNOWN]:
        "An unexpected problem occurred.",

      [ERROR_TYPES.GENERAL]:
        "Something went wrong. Please try again."
    };

    return messages[errorType] || messages[ERROR_TYPES.UNKNOWN];
  },

  /**
   * Install global error listeners.
   * Call only once during application startup.
   */
  installGlobalHandlers() {
    if (typeof window === "undefined") {
      return false;
    }

    if (window.__APPARA_ERROR_HANDLERS_INSTALLED__) {
      return false;
    }

    if (ERROR_CONFIG.captureGlobalErrors) {
      window.addEventListener("error", event => {
        this.handle(
          event.error || event.message,
          {
            type: ERROR_TYPES.UNKNOWN,
            context: "Global JavaScript error",
            severity: "critical"
          }
        );
      });
    }

    if (ERROR_CONFIG.captureUnhandledRejections) {
      window.addEventListener("unhandledrejection", event => {
        this.handle(
          event.reason,
          {
            type: ERROR_TYPES.UNKNOWN,
            context: "Unhandled promise rejection",
            severity: "critical"
          }
        );
      });
    }

    window.__APPARA_ERROR_HANDLERS_INSTALLED__ = true;

    return true;
  }
};

export { ERROR_TYPES, ERROR_CONFIG };

/* =========================================================
   FILE END: js/core/error-handler.js
   ========================================================= */
