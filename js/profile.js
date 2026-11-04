/* =========================================================
   APPARA CHESS — PART 21L
   PROFILE CONTROLLER
   FILE: js/profile.js
   PART 1/3 — STATE, HELPERS, LOAD & SAVE
========================================================= */

window.APPARA_PROFILE = (function () {
  "use strict";

  const STORAGE_KEY = "appara_chess_profile_v1";
  const HISTORY_LIMIT = 50;

  const config = window.APPARA_CONFIG || {};
  const playerConfig = config.player || {};

  const state = {
    initialized: false,
    profile: null,
    history: [],
    elements: {},
    eventsBound: false
  };

  function createPlayerId() {
    const prefix = playerConfig.idPrefix || "AP";
    const random = Math.floor(100000 + Math.random() * 900000);
    return prefix + "-" + random;
  }

  function getDefaultProfile() {
    return {
      id: createPlayerId(),
      name: playerConfig.defaultName || "Guest Player",
      avatar: playerConfig.defaultAvatar || "♟",
      rating: Number(playerConfig.defaultRating) || 1000,
      coins: Number(playerConfig.startingCoins) || 2500,

      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,

      puzzlesSolved: 0,
      tournamentsPlayed: 0,

      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  function normalizeProfile(profile) {
    const defaults = getDefaultProfile();
    const source = profile && typeof profile === "object"
      ? profile
      : {};

    return {
      ...defaults,
      ...source,

      id: String(source.id || defaults.id),
      name: String(source.name || defaults.name).slice(0, 24),
      avatar: String(source.avatar || defaults.avatar),

      rating: Math.max(0, Number(source.rating) || defaults.rating),
      coins: Math.max(0, Number(source.coins) || 0),

      games: Math.max(0, Number(source.games) || 0),
      wins: Math.max(0, Number(source.wins) || 0),
      losses: Math.max(0, Number(source.losses) || 0),
      draws: Math.max(0, Number(source.draws) || 0),

      puzzlesSolved: Math.max(0, Number(source.puzzlesSolved) || 0),
      tournamentsPlayed: Math.max(
        0,
        Number(source.tournamentsPlayed) || 0
      ),

      createdAt: Number(source.createdAt) || Date.now(),
      updatedAt: Number(source.updatedAt) || Date.now()
    };
  }

  function notify(message, type) {
    if (
      window.APPARA_APP &&
      typeof window.APPARA_APP.showNotification === "function"
    ) {
      window.APPARA_APP.showNotification(
        message,
        type || "info"
      );
      return;
    }

    if (typeof window.APPARA_APP?.notify === "function") {
      window.APPARA_APP.notify(message, type || "info");
    }
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        state.profile = getDefaultProfile();
        state.history = [];
        save();
        return true;
      }

      const parsed = JSON.parse(saved);

      state.profile = normalizeProfile(parsed.profile);
      state.history = Array.isArray(parsed.history)
        ? parsed.history.slice(0, HISTORY_LIMIT)
        : [];

      return true;

    } catch (error) {
      console.error("APPARA PROFILE LOAD ERROR:", error);

      state.profile = getDefaultProfile();
      state.history = [];

      save();
      return false;
    }
  }

  function save() {
    try {
      if (!state.profile) {
        state.profile = getDefaultProfile();
      }

      state.profile.updatedAt = Date.now();

      const data = {
        profile: state.profile,
        history: state.history.slice(0, HISTORY_LIMIT)
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      );

      return true;

    } catch (error) {
      console.error("APPARA PROFILE SAVE ERROR:", error);
      return false;
    }
  }

  function getProfile() {
    if (!state.profile) {
      load();
    }

    return { ...state.profile };
  }

  function getPlayerId() {
    return state.profile
      ? state.profile.id
      : "";
  }

  function setName(name) {
    const cleanName = String(name || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 24);

    if (cleanName.length < 2) {
      notify("Name must contain at least 2 characters.", "error");
      return false;
    }

    state.profile.name = cleanName;

    save();
    render();

    notify("Profile name updated.", "success");
    return true;
  }

  function setAvatar(avatar) {
    const cleanAvatar = String(avatar || "").trim();

    if (!cleanAvatar || cleanAvatar.length > 12) {
      return false;
    }

    state.profile.avatar = cleanAvatar;

    save();
    render();

    return true;
  }

  function updateProfile(updates) {
    if (!updates || typeof updates !== "object") {
      return false;
    }

    if (typeof updates.name === "string") {
      const cleanName = updates.name
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 24);

      if (cleanName.length >= 2) {
        state.profile.name = cleanName;
      }
    }

    if (typeof updates.avatar === "string") {
      const avatar = updates.avatar.trim();

      if (avatar && avatar.length <= 12) {
        state.profile.avatar = avatar;
      }
    }

    save();
    render();

    return true;
  }

  /* =======================================================
     PART 1/3 END
     CONTINUE DIRECTLY WITH PART 2/3 BELOW
  ======================================================= */

   /* =========================================================
   APPARA CHESS — PART 21L
   PART 2/3 — GAME RESULTS, RATING & STATISTICS
========================================================= */

  function calculateRatingChange(result, opponentRating) {
    const currentRating = Number(state.profile.rating) || 1000;
    const opponent = Number(opponentRating) || 1000;

    const expectedScore =
      1 / (1 + Math.pow(10, (opponent - currentRating) / 400));

    let actualScore = 0.5;

    if (result === "win") actualScore = 1;
    if (result === "loss") actualScore = 0;

    const gamesPlayed = Number(state.profile.games) || 0;
    const kFactor = gamesPlayed < 30 ? 32 : 20;

    return Math.round(
      kFactor * (actualScore - expectedScore)
    );
  }

  function normalizeResult(record) {
    if (typeof record === "string") {
      const result = record.toLowerCase();

      if (["win", "loss", "draw"].includes(result)) {
        return {
          result,
          mode: "unknown",
          opponent: "Opponent",
          opponentRating: 1000,
          moves: 0,
          date: Date.now()
        };
      }

      return null;
    }

    if (!record || typeof record !== "object") {
      return null;
    }

    const rawResult = String(
      record.result || record.outcome || ""
    ).toLowerCase();

    let result = rawResult;

    if (["won", "victory", "victorious"].includes(rawResult)) {
      result = "win";
    }

    if (["lost", "defeat", "defeated"].includes(rawResult)) {
      result = "loss";
    }

    if (["tie", "stalemate", "drawn"].includes(rawResult)) {
      result = "draw";
    }

    if (!["win", "loss", "draw"].includes(result)) {
      return null;
    }

    return {
      result,
      mode: String(record.mode || "unknown"),
      opponent: String(
        record.opponentName ||
        record.opponent ||
        "Opponent"
      ).slice(0, 32),

      opponentRating: Number(record.opponentRating) || 1000,
      moves: Math.max(0, Number(record.moves) || 0),
      date: Number(record.date || record.finishedAt) || Date.now(),
      ratingChange: Number(record.ratingChange) || 0
    };
  }

  function recordGame(gameRecord) {
    if (!state.profile) {
      load();
    }

    const game = normalizeResult(gameRecord);

    if (!game) {
      console.warn(
        "APPARA PROFILE: Invalid game result.",
        gameRecord
      );
      return false;
    }

    state.profile.games += 1;

    if (game.result === "win") {
      state.profile.wins += 1;
    } else if (game.result === "loss") {
      state.profile.losses += 1;
    } else {
      state.profile.draws += 1;
    }

    let ratingChange = 0;

    if (
      game.mode === "online" ||
      game.mode === "computer"
    ) {
      ratingChange = calculateRatingChange(
        game.result,
        game.opponentRating
      );

      state.profile.rating = Math.max(
        100,
        state.profile.rating + ratingChange
      );
    }

    const savedGame = {
      id: "GAME-" + Date.now() + "-" +
        Math.floor(Math.random() * 1000),

      result: game.result,
      mode: game.mode,
      opponent: game.opponent,
      opponentRating: game.opponentRating,
      moves: game.moves,
      date: game.date,
      ratingChange
    };

    state.history.unshift(savedGame);

    if (state.history.length > HISTORY_LIMIT) {
      state.history.length = HISTORY_LIMIT;
    }

    save();
    render();

    return true;
  }

  function getStats() {
    const profile = getProfile();

    const winRate = profile.games > 0
      ? Math.round((profile.wins / profile.games) * 100)
      : 0;

    return {
      games: profile.games,
      wins: profile.wins,
      losses: profile.losses,
      draws: profile.draws,
      rating: profile.rating,
      coins: profile.coins,
      puzzlesSolved: profile.puzzlesSolved,
      tournamentsPlayed: profile.tournamentsPlayed,
      winRate
    };
  }

  function getHistory(limit) {
    const count = Number(limit);

    const history = state.history.map(function (item) {
      return { ...item };
    });

    return Number.isFinite(count) && count > 0
      ? history.slice(0, count)
      : history;
  }

  function addCoins(amount) {
    const value = Math.floor(Number(amount));

    if (!Number.isFinite(value) || value <= 0) {
      return false;
    }

    state.profile.coins += value;

    save();
    render();

    return true;
  }

  function spendCoins(amount) {
    const value = Math.floor(Number(amount));

    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      state.profile.coins < value
    ) {
      return false;
    }

    state.profile.coins -= value;

    save();
    render();

    return true;
  }

  function addPuzzleSolved() {
    state.profile.puzzlesSolved += 1;

    save();
    render();

    return state.profile.puzzlesSolved;
  }

  function addTournamentPlayed() {
    state.profile.tournamentsPlayed += 1;

    save();
    render();

    return state.profile.tournamentsPlayed;
  }

  function getWinRate() {
    const games = state.profile.games;

    if (!games) return 0;

    return Math.round(
      (state.profile.wins / games) * 100
    );
  }

  /* =======================================================
     PART 2/3 END
     CONTINUE DIRECTLY WITH PART 3/3 BELOW
  ======================================================= */
/* =========================================================
   APPARA CHESS — PART 21L
   PART 3/3 — PROFILE UI & PUBLIC API
========================================================= */

  function cacheElements() {
    state.elements = {
      headerAvatar: document.getElementById("header-avatar"),
      profileAvatar: document.getElementById("profile-avatar"),
      profileName: document.getElementById("profile-name"),
      profileId: document.getElementById("profile-id"),

      profileRating: document.getElementById("profile-rating"),
      profileGames: document.getElementById("profile-games"),
      profileWins: document.getElementById("profile-wins"),
      profileLosses: document.getElementById("profile-losses"),

      profileHistory: document.getElementById("profile-history"),
      editProfileButton: document.getElementById("edit-profile-btn")
    };
  }

  function setText(element, value) {
    if (element) {
      element.textContent = String(value);
    }
  }

  function renderHeader() {
    const profile = state.profile;
    const elements = state.elements;

    if (!profile) return;

    setText(elements.headerAvatar, profile.avatar);
  }

  function renderProfileDetails() {
    const profile = state.profile;
    const elements = state.elements;

    if (!profile) return;

    setText(elements.profileAvatar, profile.avatar);
    setText(elements.profileName, profile.name);
    setText(elements.profileId, profile.id);

    setText(
      elements.profileRating,
      profile.rating.toLocaleString("en-IN")
    );

    setText(elements.profileGames, profile.games);
    setText(elements.profileWins, profile.wins);
    setText(elements.profileLosses, profile.losses);
  }

  function createHistoryItem(game) {
    const item = document.createElement("div");
    item.className = "history-item";

    const result = document.createElement("span");
    result.className = "history-result " + game.result;
    result.textContent = game.result.toUpperCase();

    const details = document.createElement("div");
    details.className = "history-details";

    const opponent = document.createElement("strong");
    opponent.textContent = game.opponent || "Opponent";

    const meta = document.createElement("small");

    const date = new Date(game.date);
    const dateText = Number.isNaN(date.getTime())
      ? "Date unavailable"
      : date.toLocaleDateString();

    meta.textContent =
      String(game.mode || "unknown").toUpperCase() +
      " · " + dateText +
      " · " + (game.moves || 0) + " moves";

    details.appendChild(opponent);
    details.appendChild(meta);

    const rating = document.createElement("span");
    rating.className = "history-rating";

    const change = Number(game.ratingChange) || 0;

    rating.textContent = change > 0
      ? "+" + change
      : String(change);

    item.appendChild(result);
    item.appendChild(details);
    item.appendChild(rating);

    return item;
  }

  function renderHistory() {
    const container = state.elements.profileHistory;

    if (!container) return;

    container.replaceChildren();

    if (state.history.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No games played yet.";

      container.appendChild(empty);
      return;
    }

    state.history.forEach(function (game) {
      container.appendChild(createHistoryItem(game));
    });
  }

  function render() {
    if (!state.profile) return;

    renderHeader();
    renderProfileDetails();
    renderHistory();

    return getProfile();
  }

  function openEditProfile() {
    const currentName = state.profile.name;

    const newName = window.prompt(
      "Enter your chess player name:",
      currentName
    );

    if (newName === null) return;

    setName(newName);
  }

  function bindEvents() {
    if (state.eventsBound) return;

    const button = state.elements.editProfileButton;

    if (button) {
      button.addEventListener("click", openEditProfile);
    }

    state.eventsBound = true;
  }

  function resetStats() {
    const confirmed = window.confirm(
      "Reset your game statistics and history? Your player ID and name will remain unchanged."
    );

    if (!confirmed) return false;

    state.profile.games = 0;
    state.profile.wins = 0;
    state.profile.losses = 0;
    state.profile.draws = 0;
    state.profile.rating = 1000;

    state.history = [];

    save();
    render();

    notify("Game statistics have been reset.", "success");

    return true;
  }

  function init() {
    if (state.initialized) {
      render();
      return true;
    }

    load();
    cacheElements();
    bindEvents();
    render();

    state.initialized = true;

    return true;
  }

  function destroy() {
    const button = state.elements.editProfileButton;

    if (button && state.eventsBound) {
      button.removeEventListener("click", openEditProfile);
    }

    state.eventsBound = false;
    state.initialized = false;
    state.elements = {};
  }

  return {
    init,
    load,
    save,

    getProfile,
    getPlayerId,
    updateProfile,
    setName,
    setAvatar,

    recordGame,
    getStats,
    getHistory,
    getWinRate,

    addCoins,
    spendCoins,
    addPuzzleSolved,
    addTournamentPlayed,

    render,
    renderHeader,
    renderHistory,

    resetStats,
    destroy
  };

})();

/* =========================================================
   APPARA CHESS — PROFILE CONTROLLER
   PART 21L COMPLETE
   FILE: js/profile.js
========================================================= */
