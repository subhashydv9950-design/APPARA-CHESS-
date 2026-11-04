
/* =========================================================
   APPARA CHESS — VALIDATION SYSTEM
   FILE: js/core/validation.js
   PURPOSE: Validate user input and application data
   ========================================================= */

export const VALIDATION_RULES = Object.freeze({
  displayName: {
    minLength: 3,
    maxLength: 20
  },

  email: {
    maxLength: 254
  },

  playerId: {
    minLength: 6,
    maxLength: 20
  },

  roomCode: {
    minLength: 4,
    maxLength: 12
  },

  bio: {
    maxLength: 160
  },

  customTime: {
    minSeconds: 10,
    maxSeconds: 7200
  }
});

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

export const Validation = {
  /**
   * Check a display name.
   */
  displayName(value) {
    if (typeof value !== "string") return false;

    const name = value.trim();

    return (
      name.length >= VALIDATION_RULES.displayName.minLength &&
      name.length <= VALIDATION_RULES.displayName.maxLength &&
      /^[\p{L}\p{N} _.-]+$/u.test(name)
    );
  },

  /**
   * Check an email address.
   */
  email(value) {
    if (typeof value !== "string") return false;

    const email = value.trim();

    if (email.length > VALIDATION_RULES.email.maxLength) {
      return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  },

  /**
   * Check password input format.
   * Authentication provider must enforce the actual password policy.
   */
  password(value) {
    return (
      typeof value === "string" &&
      value.length >= 8 &&
      value.length <= 128
    );
  },

  /**
   * Check a permanent player ID.
   */
  playerId(value) {
    if (typeof value !== "string") return false;

    return new RegExp(
      `^[A-Z0-9-]{${VALIDATION_RULES.playerId.minLength},${VALIDATION_RULES.playerId.maxLength}}$`
    ).test(value.trim().toUpperCase());
  },

  /**
   * Check a private room code.
   */
  roomCode(value) {
    if (typeof value !== "string") return false;

    const code = value.trim().toUpperCase();

    return (
      code.length >= VALIDATION_RULES.roomCode.minLength &&
      code.length <= VALIDATION_RULES.roomCode.maxLength &&
      /^[A-Z0-9]+$/.test(code)
    );
  },

  /**
   * Check a profile bio.
   */
  bio(value) {
    return (
      typeof value === "string" &&
      value.trim().length <= VALIDATION_RULES.bio.maxLength
    );
  },

  /**
   * Check a positive integer.
   */
  positiveInteger(value, maximum = Number.MAX_SAFE_INTEGER) {
    return (
      Number.isSafeInteger(value) &&
      value > 0 &&
      value <= maximum
    );
  },

  /**
   * Check a non-negative integer.
   */
  nonNegativeInteger(value, maximum = Number.MAX_SAFE_INTEGER) {
    return (
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value <= maximum
    );
  },

  /**
   * Check a percentage value.
   */
  percentage(value) {
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 100
    );
  },

  /**
   * Check custom chess time in seconds.
   */
  customTime(seconds) {
    return (
      Number.isInteger(seconds) &&
      seconds >= VALIDATION_RULES.customTime.minSeconds &&
      seconds <= VALIDATION_RULES.customTime.maxSeconds
    );
  },

  /**
   * Check a chess difficulty level.
   */
  difficulty(value) {
    return ["easy", "normal", "hard", "expert"].includes(value);
  },

  /**
   * Check a chess clock mode.
   */
  timeControl(value) {
    return ["bullet", "blitz", "rapid", "classical", "custom"]
      .includes(value);
  },

  /**
   * Check a player color.
   */
  playerColor(value) {
    return value === "white" || value === "black" || value === "random";
  },

  /**
   * Check an application language code.
   */
  languageCode(value) {
    return (
      typeof value === "string" &&
      /^[a-z]{2}(-[A-Z]{2})?$/.test(value)
    );
  },

  /**
   * Check an application quality setting.
   */
  graphicsQuality(value) {
    return ["low", "medium", "high", "ultra"].includes(value);
  },

  /**
   * Check a supported chessboard square.
   * Examples: e4, a1, h8.
   */
  chessSquare(value) {
    return (
      typeof value === "string" &&
      /^[a-h][1-8]$/.test(value)
    );
  },

  /**
   * Check a standard chess piece symbol.
   */
  chessPiece(value) {
    return (
      typeof value === "string" &&
      /^[KQRBNPkqrbnp]$/.test(value)
    );
  },

  /**
   * Check an array of unique non-empty string IDs.
   */
  uniqueIdArray(value) {
    if (!Array.isArray(value)) return false;

    if (!value.every(
      item => typeof item === "string" && item.trim().length > 0
    )) {
      return false;
    }

    return new Set(value).size === value.length;
  },

  /**
   * Check a plain data object.
   */
  plainObject(value) {
    return isPlainObject(value);
  },

  /**
   * Check a URL.
   * Only HTTP and HTTPS protocols are accepted.
   */
  webURL(value) {
    if (typeof value !== "string") return false;

    try {
      const url = new URL(value);

      return (
        url.protocol === "https:" ||
        url.protocol === "http:"
      );
    } catch {
      return false;
    }
  },

  /**
   * Validate a complete profile form.
   * Returns errors instead of only true/false.
   */
  profileForm(profile) {
    const errors = {};

    if (!isPlainObject(profile)) {
      return {
        valid: false,
        errors: {
          profile: "Invalid profile data."
        }
      };
    }

    if (!this.displayName(profile.displayName)) {
      errors.displayName = "Name must contain 3–20 valid characters.";
    }

    if (
      profile.bio !== undefined &&
      !this.bio(profile.bio)
    ) {
      errors.bio = "Bio cannot exceed 160 characters.";
    }

    if (
      profile.email !== undefined &&
      !this.email(profile.email)
    ) {
      errors.email = "Invalid email address.";
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Validate game setup options.
   */
  gameSetup(options) {
    const errors = {};

    if (!isPlainObject(options)) {
      return {
        valid: false,
        errors: {
          options: "Invalid game setup."
        }
      };
    }

    if (!this.playerColor(options.playerColor)) {
      errors.playerColor = "Invalid player color.";
    }

    if (!this.difficulty(options.difficulty)) {
      errors.difficulty = "Invalid difficulty.";
    }

    if (!this.timeControl(options.timeControl)) {
      errors.timeControl = "Invalid time control.";
    }

    if (
      options.timeControl === "custom" &&
      (
        !this.customTime(options.initialSeconds) ||
        !this.nonNegativeInteger(options.incrementSeconds, 60)
      )
    ) {
      errors.customTime = "Invalid custom clock settings.";
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
};

/**
 * Convenience function for simple checks.
 */
export function validateValue(type, value) {
  const validator = Validation[type];

  if (typeof validator !== "function") {
    return false;
  }

  return validator(value);
}

/* =========================================================
   FILE END: js/core/validation.js
   ========================================================= */
    
