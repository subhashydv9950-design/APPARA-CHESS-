/* =========================================================
   APPARA CHESS — PLAYER SERVICE
   FILE: js/services/player-service.js
   PURPOSE: Player profile, identity, stats and persistence
   ========================================================= */

export const PLAYER_EVENTS = Object.freeze({
  PROFILE_LOADED: "profileLoaded",
  PROFILE_UPDATED: "profileUpdated",
  AVATAR_UPDATED: "avatarUpdated",
  STATS_UPDATED: "statsUpdated",
  PLAYER_CREATED: "playerCreated",
  PLAYER_ERROR: "playerError"
});

export const PLAYER_DEFAULTS = Object.freeze({
  displayName: "Chess Player",
  avatar: "",
  bio: "",
  country: "",
  level: 1,
  xp: 0,
  coins: 2500,
  diamonds: 0,
  trophies: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  gamesPlayed: 0
});

function clone(value) {
  if (value === undefined || value === null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

export class PlayerService {
  constructor(options = {}) {
    this.options = {
      collection: "players",
      idPrefix: "AC",
      maxDisplayNameLength: 24,
      ...options
    };

    this.firebase = options.firebaseService || null;
    this.auth = options.authService || null;
    this.storage = options.storageService || null;

    this.player = null;
    this.playerId = null;

    this.listeners = new Map();

    this.initialized = false;
    this.loading = false;
    this.disposed = false;

    this.lastError = null;
  }

  /* -------------------------------------------------------
     INITIALIZATION
     ------------------------------------------------------- */

  async initialize({
    firebaseService = this.firebase,
    authService = this.auth
  } = {}) {
    this.ensureActive();

    if (
      !firebaseService ||
      !firebaseService.isInitialized
    ) {
      throw new Error(
        "FirebaseService must be initialized first."
      );
    }

    if (
      !authService ||
      typeof authService.isLoggedIn !== "function" ||
      !authService.isLoggedIn()
    ) {
      throw new Error(
        "A signed-in player is required."
      );
    }

    this.firebase = firebaseService;
    this.auth = authService;
    this.initialized = true;

    return this.loadProfile();
  }

  /* -------------------------------------------------------
     LOAD PROFILE
     ------------------------------------------------------- */

  async loadProfile() {
    this.ensureInitialized();

    if (this.loading) {
      return this.getProfile();
    }

    this.loading = true;

    try {
      const user = this.auth.getCurrentUser();

      if (!user?.uid) {
        throw new Error(
          "Player account is unavailable."
        );
      }

      const document = await this.firebase.getDocument(
        this.options.collection,
        user.uid
      );

      if (document?.data) {
        this.player = this.normalizeProfile({
          ...document.data,
          uid: user.uid
        });
      } else {
        this.player = this.createDefaultProfile(user);

        await this.saveProfile();

        this.emit(PLAYER_EVENTS.PLAYER_CREATED, {
          player: this.getProfile()
        });
      }

      this.playerId = this.player.playerId;

      this.emit(PLAYER_EVENTS.PROFILE_LOADED, {
        player: this.getProfile()
      });

      return this.getProfile();
    } catch (error) {
      this.handleError(error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /* -------------------------------------------------------
     DEFAULT PROFILE
     ------------------------------------------------------- */

  createDefaultProfile(user = {}) {
    const displayName = this.validateDisplayName(
      user.displayName ||
      PLAYER_DEFAULTS.displayName
    );

    return {
      uid: user.uid || "",
      playerId: this.generatePlayerId(),

      displayName,
      email: "",
      avatar: user.photoURL || "",
      bio: "",
      country: "",

      level: 1,
      xp: 0,
      coins: 2500,
      diamonds: 0,
      trophies: 0,

      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0,
        currentWinStreak: 0,
        bestWinStreak: 0
      },

      ratings: {
        bullet: 1000,
        blitz: 1000,
        rapid: 1000,
        classical: 1000
      },

      preferences: {
        language: "en",
        theme: "royal-purple",
        showOnlineStatus: true,
        friendRequests: true
      },

      inventory: {
        boards: ["royal-classic"],
        pieces: ["royal-classic"],
        tables: ["royal-classic"],
        environments: ["royal-palace"]
      },

      achievements: [],

      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSeenAt: Date.now(),

      isGuest: false,
      isBanned: false
    };
  }

  /* -------------------------------------------------------
     PLAYER ID
     ------------------------------------------------------- */

  generatePlayerId() {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {
      code += chars.charAt(
        Math.floor(Math.random() * chars.length)
      );
    }

    return `${this.options.idPrefix}-${code}`;
  }

  /* -------------------------------------------------------
     PROFILE NORMALIZATION
     ------------------------------------------------------- */

  normalizeProfile(profile = {}) {
    const defaults = this.createDefaultProfile({
      uid: profile.uid || "",
      displayName:
        profile.displayName ||
        PLAYER_DEFAULTS.displayName,
      photoURL: profile.avatar || ""
    });

    return {
      ...defaults,
      ...profile,

      stats: {
        ...defaults.stats,
        ...(profile.stats || {})
      },

      ratings: {
        ...defaults.ratings,
        ...(profile.ratings || {})
      },

      preferences: {
        ...defaults.preferences,
        ...(profile.preferences || {})
      },

      inventory: {
        ...defaults.inventory,
        ...(profile.inventory || {})
      },

      achievements: Array.isArray(profile.achievements)
        ? profile.achievements
        : []
    };
  }

  /* -------------------------------------------------------
     SAVE PROFILE
     ------------------------------------------------------- */

  async saveProfile(profile = null) {
    this.ensurePlayer();

    /*
     * Accepting a profile argument allows other services
     * to save an updated profile explicitly.
     */
    if (profile !== null) {
      if (
        typeof profile !== "object" ||
        Array.isArray(profile)
      ) {
        throw new TypeError(
          "Profile must be a valid object."
        );
      }

      if (profile.uid !== this.player.uid) {
        throw new Error(
          "Profile account ID does not match."
        );
      }

      this.player = this.normalizeProfile(profile);
    }

    this.player.updatedAt = Date.now();

    try {
      await this.firebase.setDocument(
        this.options.collection,
        this.player.uid,
        this.player
      );

      this.emit(PLAYER_EVENTS.PROFILE_UPDATED, {
        player: this.getProfile()
      });

      return true;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /* -------------------------------------------------------
     PROFILE READ / UPDATE
     ------------------------------------------------------- */

  getProfile() {
    if (!this.player) {
      return null;
    }

    /*
     * Return the active profile reference.
     * Existing services update this object and then call
     * saveProfile(). Returning a clone here would silently
     * discard those updates.
     */
    return this.player;
  }

  getProfileSnapshot() {
    return clone(this.player);
  }

  async replaceProfile(profile) {
    this.ensurePlayer();

    if (
      !profile ||
      typeof profile !== "object" ||
      Array.isArray(profile)
    ) {
      throw new TypeError("Invalid profile.");
    }

    if (profile.uid !== this.player.uid) {
      throw new Error(
        "Cannot replace a different player's profile."
      );
    }

    this.player = this.normalizeProfile(profile);

    await this.saveProfile();

    return this.getProfileSnapshot();
  }

  async updateProfile(updates = {}) {
    this.ensurePlayer();

    if (
      !updates ||
      typeof updates !== "object" ||
      Array.isArray(updates)
    ) {
      throw new TypeError(
        "Profile updates must be an object."
      );
    }

    const protectedFields = [
      "uid",
      "playerId",
      "createdAt",
      "isBanned"
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (protectedFields.includes(key)) continue;

      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        this.player[key] = {
          ...(this.player[key] || {}),
          ...value
        };
      } else {
        this.player[key] = value;
      }
    }

    await this.saveProfile();

    return this.getProfileSnapshot();
  }

  getPlayerId() {
    return this.playerId;
  }

  getDisplayName() {
    return this.player?.displayName || "Chess Player";
  }

  getLevel() {
    return this.player?.level || 1;
  }

  getXP() {
    return this.player?.xp || 0;
  }

  /* -------------------------------------------------------
     DISPLAY NAME
     ------------------------------------------------------- */

  async updateDisplayName(value) {
    this.ensurePlayer();

    const displayName = this.validateDisplayName(value);

    this.player.displayName = displayName;

    await this.saveProfile();

    return displayName;
  }

  /* -------------------------------------------------------
     BIO
     ------------------------------------------------------- */

  async updateBio(value) {
    this.ensurePlayer();

    const bio = String(value || "").trim();

    if (bio.length > 160) {
      throw new Error(
        "Bio cannot exceed 160 characters."
      );
    }

    this.player.bio = bio;

    await this.saveProfile();

    return bio;
  }

  /* -------------------------------------------------------
     COUNTRY
     ------------------------------------------------------- */

  async updateCountry(value) {
    this.ensurePlayer();

    const country = String(value || "").trim();

    if (country.length > 60) {
      throw new Error(
        "Country name is too long."
      );
    }

    this.player.country = country;

    await this.saveProfile();

    return country;
  }

  /* -------------------------------------------------------
     AVATAR
     ------------------------------------------------------- */

  async updateAvatar(photoURL) {
    this.ensurePlayer();

    const url = String(photoURL || "").trim();

    if (url.length > 2048) {
      throw new Error("Avatar URL is too long.");
    }

    if (url && !/^https:\/\//i.test(url)) {
      throw new Error(
        "Avatar must use a secure HTTPS URL."
      );
    }

    this.player.avatar = url;

    await this.saveProfile();

    this.emit(PLAYER_EVENTS.AVATAR_UPDATED, {
      avatar: url
    });

    return url;
  }

  /* -------------------------------------------------------
     PREFERENCES
     ------------------------------------------------------- */

  async updatePreferences(preferences = {}) {
    this.ensurePlayer();

    const allowed = [
      "language",
      "theme",
      "showOnlineStatus",
      "friendRequests"
    ];

    for (const key of allowed) {
      if (preferences[key] !== undefined) {
        this.player.preferences[key] =
          preferences[key];
      }
    }

    await this.saveProfile();

    return clone(this.player.preferences);
  }

  /* -------------------------------------------------------
     LAST SEEN
     ------------------------------------------------------- */

  async updateLastSeen() {
    this.ensurePlayer();

    this.player.lastSeenAt = Date.now();

    await this.saveProfile();

    return this.player.lastSeenAt;
  }

  /* -------------------------------------------------------
     GAME STATISTICS
     ------------------------------------------------------- */

  async recordGameResult(result) {
    this.ensurePlayer();

    const validResults = [
      "win",
      "loss",
      "draw"
    ];

    if (!validResults.includes(result)) {
      throw new Error("Invalid game result.");
    }

    const stats = this.player.stats;

    stats.gamesPlayed += 1;

    if (result === "win") {
      stats.wins += 1;
      stats.currentWinStreak += 1;

      stats.bestWinStreak = Math.max(
        stats.bestWinStreak,
        stats.currentWinStreak
      );
    } else if (result === "loss") {
      stats.losses += 1;
      stats.currentWinStreak = 0;
    } else {
      stats.draws += 1;
      stats.currentWinStreak = 0;
    }

    await this.saveProfile();

    this.emit(PLAYER_EVENTS.STATS_UPDATED, {
      stats: clone(stats)
    });

    return clone(stats);
  }

  /* -------------------------------------------------------
     RATINGS
     ------------------------------------------------------- */

  getRating(mode = "blitz") {
    this.ensurePlayer();

    const allowed = [
      "bullet",
      "blitz",
      "rapid",
      "classical"
    ];

    if (!allowed.includes(mode)) {
      throw new Error("Unknown rating mode.");
    }

    return this.player.ratings[mode];
  }

  getAllRatings() {
    this.ensurePlayer();

    return clone(this.player.ratings);
  }

  /* -------------------------------------------------------
     DISPLAY NAME VALIDATION
     ------------------------------------------------------- */

  validateDisplayName(value) {
    const name = String(value || "").trim();

    if (name.length < 2) {
      throw new Error(
        "Name must contain at least 2 characters."
      );
    }

    if (
      name.length >
      this.options.maxDisplayNameLength
    ) {
      throw new Error(
        `Name cannot exceed ${this.options.maxDisplayNameLength} characters.`
      );
    }

    if (/[<>]/.test(name)) {
      throw new Error(
        "Name contains unsupported characters."
      );
    }

    return name;
  }

  /* -------------------------------------------------------
     ERROR HANDLING
     ------------------------------------------------------- */

  handleError(error) {
    this.lastError = {
      message:
        error?.message || "Player service error.",
      code: error?.code || "player/unknown",
      timestamp: Date.now()
    };

    this.emit(PLAYER_EVENTS.PLAYER_ERROR, {
      error: this.lastError
    });

    return error;
  }

  /* -------------------------------------------------------
     EVENT SYSTEM
     ------------------------------------------------------- */

  on(eventName, callback) {
    this.ensureActive();

    if (typeof callback !== "function") {
      throw new TypeError(
        "Callback must be a function."
      );
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(
        eventName,
        new Set()
      );
    }

    this.listeners.get(eventName).add(callback);

    return () => this.off(eventName, callback);
  }

  off(eventName, callback) {
    const group = this.listeners.get(eventName);

    if (!group) return false;

    const removed = group.delete(callback);

    if (group.size === 0) {
      this.listeners.delete(eventName);
    }

    return removed;
  }

  emit(eventName, payload = {}) {
    const group = this.listeners.get(eventName);

    if (!group) return;

    for (const callback of [...group]) {
      try {
        callback(payload);
      } catch (error) {
        console.error(
          `[PlayerService] ${eventName} listener error:`,
          error
        );
      }
    }
  }

  /* -------------------------------------------------------
     GUARDS
     ------------------------------------------------------- */

  ensureActive() {
    if (this.disposed) {
      throw new Error(
        "PlayerService has been disposed."
      );
    }
  }

  ensureInitialized() {
    this.ensureActive();

    if (
      !this.initialized ||
      !this.firebase ||
      !this.auth
    ) {
      throw new Error(
        "PlayerService is not initialized."
      );
    }
  }

  ensurePlayer() {
    this.ensureInitialized();

    if (!this.player) {
      throw new Error(
        "Player profile is not loaded."
      );
    }
  }

  /* -------------------------------------------------------
     DISPOSAL
     ------------------------------------------------------- */

  dispose() {
    if (this.disposed) return;

    this.listeners.clear();

    this.player = null;
    this.playerId = null;

    this.initialized = false;
    this.loading = false;
    this.disposed = true;
  }
}

/* ---------------------------------------------------------
   FACTORY
   --------------------------------------------------------- */

export function createPlayerService(options = {}) {
  return new PlayerService(options);
}

/* =========================================================
   FILE 4 COMPLETE
   FILE: js/services/player-service.js
   ========================================================= */
      
