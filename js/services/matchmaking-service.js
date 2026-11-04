
/* =========================================================
   APPARA CHESS — FILE 43
   FILE: js/services/matchmaking-service.js
   SECTION: ONLINE MATCHMAKING
   ========================================================= */

export const MATCHMAKING_EVENTS = Object.freeze({
  QUEUE_JOINED: "matchmaking:queue-joined",
  QUEUE_LEFT: "matchmaking:queue-left",
  SEARCHING: "matchmaking:searching",
  MATCH_FOUND: "matchmaking:match-found",
  ROOM_CREATED: "matchmaking:room-created",
  ROOM_JOINED: "matchmaking:room-joined",
  ROOM_UPDATED: "matchmaking:room-updated",
  ERROR: "matchmaking:error"
});

export const MATCH_TYPES = Object.freeze({
  RANKED: "ranked",
  CASUAL: "casual",
  PRIVATE: "private"
});

export class MatchmakingService {
  constructor({ firebaseService, authService, playerService } = {}) {
    this.firebase = firebaseService;
    this.auth = authService;
    this.players = playerService;

    this.listeners = new Map();
    this.queue = null;
    this.currentRoom = null;
    this.searching = false;
    this.initialized = false;
  }

  initialize() {
    if (!this.firebase || !this.auth || !this.players) {
      throw new Error("MatchmakingService dependencies missing.");
    }

    this.initialized = true;
    return this;
  }

  getUID() {
    const user = this.auth.currentUser || this.auth.user;
    return user?.uid || null;
  }

  requireLogin() {
    const uid = this.getUID();

    if (!uid) {
      throw new Error("Online matchmaking के लिए login जरूरी है।");
    }

    return uid;
  }

  getProfile() {
    return this.players.getProfile?.() || {};
  }

  getRating(mode = "rapid") {
    const profile = this.getProfile();
    const ratings = profile.ratings || {};

    const value = Number(
      ratings[mode] ?? ratings.rapid ?? 1000
    );

    return Number.isFinite(value) ? value : 1000;
  }

  getPlayerData() {
    const profile = this.getProfile();
    const uid = this.requireLogin();

    return {
      uid,
      playerId: profile.playerId || "",
      displayName: profile.displayName || profile.name || "Chess Player",
      avatar: profile.avatar || null,
      level: Number(profile.level || 1),
      rating: this.getRating("rapid")
    };
  }

  async callBackend(name, payload = {}) {
    if (typeof this.firebase.callFunction !== "function") {
      throw new Error(
        "Firebase Cloud Function connection configure करना बाकी है।"
      );
    }

    return this.firebase.callFunction(name, payload);
  }

  validateTimeControl(timeControl = {}) {
    const initialTime = Number(timeControl.initialTime);
    const increment = Number(timeControl.increment || 0);

    if (!Number.isFinite(initialTime) || initialTime < 30) {
      throw new Error("Invalid chess time control.");
    }

    if (!Number.isFinite(increment) || increment < 0) {
      throw new Error("Invalid increment value.");
    }

    return {
      initialTime,
      increment
    };
  }

  validateMatchOptions(options = {}) {
    const type = options.type || MATCH_TYPES.CASUAL;

    if (!Object.values(MATCH_TYPES).includes(type)) {
      throw new Error("Invalid match type.");
    }

    const timeControl = this.validateTimeControl(
      options.timeControl || {
        initialTime: 600,
        increment: 0
      }
    );

    const mode = options.mode || "rapid";

    const allowedModes = [
      "bullet",
      "blitz",
      "rapid",
      "classical"
    ];

    if (!allowedModes.includes(mode)) {
      throw new Error("Invalid rating mode.");
    }

    return {
      type,
      mode,
      timeControl
    };
  }

  async joinQueue(options = {}) {
    const player = this.getPlayerData();
    const settings = this.validateMatchOptions(options);

    if (settings.type === MATCH_TYPES.PRIVATE) {
      throw new Error(
        "Private matches के लिए createPrivateRoom() इस्तेमाल करें।"
      );
    }

    if (this.searching) {
      throw new Error("आप पहले से match search कर रहे हैं।");
    }

    const payload = {
      player,
      type: settings.type,
      mode: settings.mode,
      timeControl: settings.timeControl,
      rating: this.getRating(settings.mode)
    };

    this.searching = true;
    this.queue = payload;

    this.emit(MATCHMAKING_EVENTS.QUEUE_JOINED, payload);
    this.emit(MATCHMAKING_EVENTS.SEARCHING, true);

    try {
      const result = await this.callBackend(
        "joinMatchmakingQueue",
        payload
      );

      if (result?.matchFound && result.match) {
        this.searching = false;
        this.currentRoom = result.match;

        this.emit(
          MATCHMAKING_EVENTS.MATCH_FOUND,
          result.match
        );
      }

      return result;
    } catch (error) {
      this.searching = false;
      this.queue = null;

      this.emit(MATCHMAKING_EVENTS.ERROR, error);
      throw error;
    }
  }

  async leaveQueue() {
    if (!this.searching && !this.queue) {
      return false;
    }

    const uid = this.requireLogin();

    try {
      await this.callBackend("leaveMatchmakingQueue", {
        uid,
        type: this.queue?.type || MATCH_TYPES.CASUAL,
        mode: this.queue?.mode || "rapid"
      });
    } finally {
      this.searching = false;
      this.queue = null;

      this.emit(MATCHMAKING_EVENTS.QUEUE_LEFT, true);
      this.emit(MATCHMAKING_EVENTS.SEARCHING, false);
    }

    return true;
  }

  async createPrivateRoom(options = {}) {
    const player = this.getPlayerData();
    const settings = this.validateMatchOptions({
      ...options,
      type: MATCH_TYPES.PRIVATE
    });

    const maxPlayers = Number(options.maxPlayers || 2);

    if (![2, 4, 6, 8, 10, 12].includes(maxPlayers)) {
      throw new Error("Private room में 2 से 12 players तक चुनें।");
    }

    const payload = {
      host: player,
      mode: settings.mode,
      timeControl: settings.timeControl,
      maxPlayers,
      isPrivate: true,
      allowSpectators: Boolean(options.allowSpectators)
    };

    const result = await this.callBackend(
      "createPrivateChessRoom",
      payload
    );

    if (!result?.room) {
      throw new Error("Private room create नहीं हो पाया।");
    }

    this.currentRoom = result.room;

    this.emit(
      MATCHMAKING_EVENTS.ROOM_CREATED,
      result.room
    );

    return result.room;
  }

  async joinPrivateRoom(roomCode) {
    const player = this.getPlayerData();
    const code = String(roomCode || "").trim().toUpperCase();

    if (!/^[A-Z0-9-]{4,16}$/.test(code)) {
      throw new Error("Invalid room code.");
    }

    const result = await this.callBackend(
      "joinPrivateChessRoom",
      {
        roomCode: code,
        player
      }
    );

    if (!result?.room) {
      throw new Error("Room join नहीं हो पाया।");
    }

    this.currentRoom = result.room;

    this.emit(
      MATCHMAKING_EVENTS.ROOM_JOINED,
      result.room
    );

    return result.room;
  }

  async leaveRoom() {
    const room = this.currentRoom;

    if (!room) {
      return false;
    }

    const uid = this.requireLogin();

    await this.callBackend("leaveChessRoom", {
      roomId: room.roomId || room.id,
      uid
    });

    this.currentRoom = null;
    return true;
  }

  async inviteFriend(friendUID) {
    const uid = this.requireLogin();

    if (!this.currentRoom) {
      throw new Error("पहले private room create या join करें।");
    }

    if (!friendUID || friendUID === uid) {
      throw new Error("Invalid friend.");
    }

    return this.callBackend("inviteFriendToChessRoom", {
      roomId: this.currentRoom.roomId || this.currentRoom.id,
      friendUID
    });
  }

  async getRoomStatus(roomID) {
    this.requireLogin();

    if (!roomID) {
      throw new Error("Room ID जरूरी है।");
    }

    const result = await this.callBackend(
      "getChessRoomStatus",
      { roomID }
    );

    if (result?.room) {
      this.currentRoom = result.room;

      this.emit(
        MATCHMAKING_EVENTS.ROOM_UPDATED,
        result.room
      );
    }

    return result?.room || null;
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  isSearching() {
    return this.searching;
  }

  getQueueInfo() {
    return this.queue ? { ...this.queue } : null;
  }

  on(event, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function.");
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, payload) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error("Matchmaking listener error:", error);
      }
    });
  }

  dispose() {
    this.listeners.clear();
    this.queue = null;
    this.currentRoom = null;
    this.searching = false;
    this.initialized = false;
  }
}

export function createMatchmakingService(dependencies) {
  return new MatchmakingService(dependencies);
}

/* ================= FILE 43 END ================= */
    
