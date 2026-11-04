
/* =========================================================
   APPARA CHESS — FILE 46
   FILE: js/services/tournament-service.js
   SECTION: TOURNAMENT MANAGEMENT
   ========================================================= */

export const TOURNAMENT_EVENTS = Object.freeze({
  LIST_LOADED: "tournament:list-loaded",
  DETAILS_LOADED: "tournament:details-loaded",
  REGISTERED: "tournament:registered",
  UNREGISTERED: "tournament:unregistered",
  TOURNAMENT_STARTED: "tournament:started",
  ROUND_UPDATED: "tournament:round-updated",
  RESULT_UPDATED: "tournament:result-updated",
  COMPLETED: "tournament:completed",
  ERROR: "tournament:error"
});

export const TOURNAMENT_FORMATS = Object.freeze({
  SWISS: "swiss",
  KNOCKOUT: "knockout",
  ROUND_ROBIN: "round-robin"
});

export const TOURNAMENT_STATUS = Object.freeze({
  UPCOMING: "upcoming",
  REGISTRATION: "registration",
  LIVE: "live",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
});

export class TournamentService {
  constructor({
    firebaseService,
    authService,
    playerService
  } = {}) {
    this.firebase = firebaseService;
    this.auth = authService;
    this.players = playerService;

    this.listeners = new Map();
    this.tournaments = [];
    this.currentTournament = null;
    this.initialized = false;
  }

  initialize() {
    if (!this.firebase || !this.auth || !this.players) {
      throw new Error("TournamentService dependencies missing.");
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
      throw new Error("Tournament में भाग लेने के लिए login जरूरी है।");
    }

    return uid;
  }

  getPlayer() {
    const profile = this.players.getProfile?.() || {};
    const uid = this.requireLogin();

    return {
      uid,
      playerId: profile.playerId || "",
      displayName: profile.displayName || profile.name || "Chess Player",
      avatar: profile.avatar || null,
      level: Number(profile.level || 1)
    };
  }

  async callBackend(name, payload = {}) {
    if (typeof this.firebase.callFunction !== "function") {
      throw new Error(
        "Tournament Cloud Functions configure करना बाकी है।"
      );
    }

    return this.firebase.callFunction(name, payload);
  }

  normalizeTournament(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid tournament data.");
    }

    const formats = Object.values(TOURNAMENT_FORMATS);
    const statuses = Object.values(TOURNAMENT_STATUS);

    const format = formats.includes(data.format)
      ? data.format
      : TOURNAMENT_FORMATS.SWISS;

    const status = statuses.includes(data.status)
      ? data.status
      : TOURNAMENT_STATUS.UPCOMING;

    return {
      ...data,
      id: data.id || data.tournamentID || null,
      title: data.title || "APPARA CHESS Tournament",
      description: data.description || "",
      format,
      status,
      maxPlayers: Number(data.maxPlayers || 32),
      participantCount: Number(data.participantCount || 0),
      entryFee: Number(data.entryFee || 0),
      prizePool: Number(data.prizePool || 0),
      rounds: Number(data.rounds || 0),
      startAt: data.startAt || null
    };
  }

  async getTournaments(options = {}) {
    const result = await this.callBackend(
      "getChessTournaments",
      {
        status: options.status || null,
        format: options.format || null,
        limit: Math.min(
          Math.max(Number(options.limit || 20), 1),
          50
        ),
        cursor: options.cursor || null
      }
    );

    this.tournaments = (result?.tournaments || []).map(
      tournament => this.normalizeTournament(tournament)
    );

    this.emit(
      TOURNAMENT_EVENTS.LIST_LOADED,
      this.tournaments
    );

    return {
      tournaments: [...this.tournaments],
      nextCursor: result?.nextCursor || null
    };
  }

  async getTournamentDetails(tournamentID) {
    if (!tournamentID) {
      throw new Error("Tournament ID जरूरी है।");
    }

    const result = await this.callBackend(
      "getChessTournamentDetails",
      { tournamentID }
    );

    if (!result?.tournament) {
      throw new Error("Tournament नहीं मिला।");
    }

    this.currentTournament = this.normalizeTournament(
      result.tournament
    );

    this.emit(
      TOURNAMENT_EVENTS.DETAILS_LOADED,
      this.currentTournament
    );

    return this.currentTournament;
  }

  async register(tournamentID) {
    const player = this.getPlayer();

    if (!tournamentID) {
      throw new Error("Tournament ID जरूरी है।");
    }

    const result = await this.callBackend(
      "registerChessTournament",
      {
        tournamentID,
        player
      }
    );

    if (!result?.success) {
      throw new Error(
        result?.message || "Tournament registration failed."
      );
    }

    this.emit(TOURNAMENT_EVENTS.REGISTERED, {
      tournamentID,
      player
    });

    return result;
  }

  async unregister(tournamentID) {
    const uid = this.requireLogin();

    if (!tournamentID) {
      throw new Error("Tournament ID जरूरी है।");
    }

    const result = await this.callBackend(
      "unregisterChessTournament",
      {
        tournamentID,
        uid
      }
    );

    if (!result?.success) {
      throw new Error(
        result?.message || "Registration cancel नहीं हो पाई।"
      );
    }

    this.emit(
      TOURNAMENT_EVENTS.UNREGISTERED,
      { tournamentID }
    );

    return result;
  }

  async getParticipants(tournamentID, options = {}) {
    this.requireLogin();

    if (!tournamentID) {
      throw new Error("Tournament ID जरूरी है।");
    }

    const result = await this.callBackend(
      "getTournamentParticipants",
      {
        tournamentID,
        limit: Math.min(
          Math.max(Number(options.limit || 50), 1),
          100
        ),
        cursor: options.cursor || null
      }
    );

    return {
      participants: result?.participants || [],
      nextCursor: result?.nextCursor || null
    };
  }

  async getBracket(tournamentID) {
    this.requireLogin();

    if (!tournamentID) {
      throw new Error("Tournament ID जरूरी है।");
    }

    const result = await this.callBackend(
      "getTournamentBracket",
      { tournamentID }
    );

    return {
      rounds: Array.isArray(result?.rounds)
        ? result.rounds
        : [],
      currentRound: Number(result?.currentRound || 0),
      champion: result?.champion || null
    };
  }

  async getMyTournamentHistory() {
    const uid = this.requireLogin();

    const result = await this.callBackend(
      "getMyTournamentHistory",
      { uid }
    );

    return Array.isArray(result?.tournaments)
      ? result.tournaments.map(item => this.normalizeTournament(item))
      : [];
  }

  async getMyActiveTournaments() {
    const uid = this.requireLogin();

    const result = await this.callBackend(
      "getMyActiveTournaments",
      { uid }
    );

    return Array.isArray(result?.tournaments)
      ? result.tournaments.map(item => this.normalizeTournament(item))
      : [];
  }

  async getRoundMatches(tournamentID, roundNumber) {
    this.requireLogin();

    const round = Number(roundNumber);

    if (!tournamentID || !Number.isInteger(round) || round < 1) {
      throw new Error("Valid tournament और round जरूरी हैं।");
    }

    const result = await this.callBackend(
      "getTournamentRoundMatches",
      {
        tournamentID,
        round
      }
    );

    return Array.isArray(result?.matches)
      ? result.matches
      : [];
  }

  async reportMatchResult(tournamentID, matchID, result) {
    const uid = this.requireLogin();

    const allowedResults = [
      "win",
      "loss",
      "draw"
    ];

    if (!allowedResults.includes(result)) {
      throw new Error("Invalid match result.");
    }

    return this.callBackend(
      "reportTournamentMatchResult",
      {
        tournamentID,
        matchID,
        uid,
        result
      }
    );
  }

  async getLeaderboard(tournamentID) {
    this.requireLogin();

    const result = await this.callBackend(
      "getTournamentLeaderboard",
      { tournamentID }
    );

    return Array.isArray(result?.standings)
      ? result.standings
      : [];
  }

  getTournament(id) {
    return this.tournaments.find(
      tournament => tournament.id === id
    ) || null;
  }

  getCurrentTournament() {
    return this.currentTournament
      ? { ...this.currentTournament }
      : null;
  }

  isRegistered(tournamentID) {
    const uid = this.getUID();

    if (!uid) return false;

    const tournament = this.getTournament(tournamentID);

    return Boolean(
      tournament?.participants?.some(
        participant => participant.uid === uid
      )
    );
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
        console.error("TournamentService listener error:", error);
      }
    });
  }

  dispose() {
    this.listeners.clear();
    this.tournaments = [];
    this.currentTournament = null;
    this.initialized = false;
  }
}

export function createTournamentService(dependencies) {
  return new TournamentService(dependencies);
}

/* ================= FILE 46 END ================= */
        
