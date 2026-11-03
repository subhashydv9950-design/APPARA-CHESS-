
/* =========================================================
   APPARA CHESS — PLAYER PROFILE MANAGER
   PART 15 — js/profile.js
   ========================================================= */

window.APPARA_PROFILE = (function () {
  "use strict";

  const CONFIG = window.APPARA_CONFIG || {};
  const STORAGE_KEY =
    (CONFIG.storageKeys && CONFIG.storageKeys.profile) ||
    "appara_chess_profile_v1";

  const DEFAULTS = {
    name: "Guest Player",
    avatar: "♟",
    id: "",
    rating: 1000,
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    coins: 2500,
    history: [],
    createdAt: null,
    updatedAt: null
  };

  let profile = null;
  let initialized = false;

  /* ---------- SAFE STORAGE ---------- */

  function readStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn("Profile storage read failed:", error);
      return null;
    }
  }

  function writeStorage() {
    try {
      profile.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return true;
    } catch (error) {
      console.warn("Profile storage save failed:", error);
      return false;
    }
  }

  /* ---------- PLAYER ID ---------- */

  function generatePlayerId() {
    const random = Math.floor(100000 + Math.random() * 900000);
    return "AP" + random;
  }

  function ensurePlayerId() {
    if (!profile.id) {
      profile.id = generatePlayerId();
    }
  }

  /* ---------- PROFILE DATA ---------- */

  function normalizeProfile(data) {
    const result = Object.assign({}, DEFAULTS, data || {});

    result.name =
      typeof result.name === "string" && result.name.trim()
        ? result.name.trim().slice(0, 30)
        : DEFAULTS.name;

    result.avatar =
      typeof result.avatar === "string" && result.avatar
        ? result.avatar
        : DEFAULTS.avatar;

    result.rating = Math.max(0, Number(result.rating) || 1000);
    result.games = Math.max(0, Number(result.games) || 0);
    result.wins = Math.max(0, Number(result.wins) || 0);
    result.losses = Math.max(0, Number(result.losses) || 0);
    result.draws = Math.max(0, Number(result.draws) || 0);
    result.coins = Math.max(0, Number(result.coins) || 2500);

    result.history = Array.isArray(result.history)
      ? result.history.slice(0, 50)
      : [];

    return result;
  }

  function load() {
    profile = normalizeProfile(readStorage());

    if (!profile.createdAt) {
      profile.createdAt = new Date().toISOString();
    }

    ensurePlayerId();
    writeStorage();

    return getProfile();
  }

  function save() {
    if (!profile) load();

    const saved = writeStorage();
    render();

    return saved;
  }

  function getProfile() {
    if (!profile) load();

    return JSON.parse(JSON.stringify(profile));
  }

  /* ---------- PROFILE UPDATES ---------- */

  function updateProfile(changes) {
    if (!profile) load();

    if (!changes || typeof changes !== "object") {
      return false;
    }

    if (typeof changes.name === "string") {
      const name = changes.name.trim().slice(0, 30);
      if (name) profile.name = name;
    }

    if (typeof changes.avatar === "string" && changes.avatar.trim()) {
      profile.avatar = changes.avatar.trim().slice(0, 12);
    }

    if (Number.isFinite(Number(changes.coins))) {
      profile.coins = Math.max(0, Number(changes.coins));
    }

    save();
    return true;
  }

  function setAvatar(avatar) {
    return updateProfile({ avatar: avatar });
  }

  function setName(name) {
    return updateProfile({ name: name });
  }

  function addCoins(amount) {
    if (!profile) load();

    const value = Number(amount);

    if (!Number.isFinite(value)) return false;

    profile.coins = Math.max(0, profile.coins + value);
    save();

    return profile.coins;
  }

  function spendCoins(amount) {
    if (!profile) load();

    const value = Number(amount);

    if (!Number.isFinite(value) || value < 0) {
      return false;
    }

    if (profile.coins < value) {
      return false;
    }

    profile.coins -= value;
    save();

    return true;
  }

  /* ---------- GAME STATISTICS ---------- */

  function recordGame(result, details) {
    if (!profile) load();

    const outcome = String(result || "").toLowerCase();
    const info = details || {};

    if (!["win", "loss", "draw"].includes(outcome)) {
      return false;
    }

    profile.games += 1;

    if (outcome === "win") {
      profile.wins += 1;
    } else if (outcome === "loss") {
      profile.losses += 1;
    } else {
      profile.draws += 1;
    }

    const historyItem = {
      result: outcome,
      opponent: String(info.opponent || "Opponent").slice(0, 30),
      mode: String(info.mode || "Offline").slice(0, 20),
      date: new Date().toISOString(),
      moves: Math.max(0, Number(info.moves) || 0),
      resultText: String(info.resultText || "").slice(0, 50)
    };

    profile.history.unshift(historyItem);
    profile.history = profile.history.slice(0, 50);

    save();

    return true;
  }

  function updateRating(newRating) {
    if (!profile) load();

    const rating = Number(newRating);

    if (!Number.isFinite(rating)) return false;

    profile.rating = Math.max(0, Math.round(rating));
    save();

    return profile.rating;
  }

  function updateStats(stats) {
    if (!profile) load();
    if (!stats || typeof stats !== "object") return false;

    ["games", "wins", "losses", "draws", "rating", "coins"].forEach(
      function (key) {
        if (stats[key] !== undefined && Number.isFinite(Number(stats[key]))) {
          profile[key] = Math.max(0, Number(stats[key]));
        }
      }
    );

    save();
    return true;
  }

  /* ---------- PROFILE RENDERING ---------- */

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  }

  function setAvatarElement(id, avatar) {
    const element = document.getElementById(id);
    if (element) element.textContent = avatar;
  }

  function renderHistory() {
    const container = document.getElementById("profile-history");
    if (!container) return;

    container.innerHTML = "";

    if (!profile.history.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No games played yet.";
      container.appendChild(empty);
      return;
    }

    profile.history.forEach(function (game) {
      const item = document.createElement("div");
      item.className = "history-item";

      const result = document.createElement("span");
      result.className = "history-result " + game.result;
      result.textContent = game.result.toUpperCase();

      const details = document.createElement("div");
      details.className = "history-details";

      const opponent = document.createElement("strong");
      opponent.textContent = "vs " + game.opponent;

      const mode = document.createElement("small");
      mode.textContent = game.mode + " • " + game.moves + " moves";

      const date = document.createElement("small");
      const parsedDate = new Date(game.date);

      date.textContent = Number.isNaN(parsedDate.getTime())
        ? ""
        : parsedDate.toLocaleDateString();

      details.appendChild(opponent);
      details.appendChild(mode);
      details.appendChild(date);

      item.appendChild(result);
      item.appendChild(details);

      container.appendChild(item);
    });
  }

  function render() {
    if (!profile) return;

    setAvatarElement("header-avatar", profile.avatar);
    setAvatarElement("profile-avatar", profile.avatar);

    setText("profile-name", profile.name);
    setText("profile-id", profile.id);
    setText("profile-rating", profile.rating);
    setText("profile-games", profile.games);
    setText("profile-wins", profile.wins);
    setText("profile-losses", profile.losses);

    renderHistory();
  }

  /* ---------- EDIT PROFILE ---------- */

  function editProfile() {
    if (!profile) load();

    const newName = window.prompt(
      "Enter your player name:",
      profile.name
    );

    if (newName === null) return;

    const cleanName = newName.trim();

    if (!cleanName) {
      notify("Player name cannot be empty.", "error");
      return;
    }

    if (cleanName.length > 30) {
      notify("Name must be 30 characters or less.", "error");
      return;
    }

    updateProfile({ name: cleanName });
    notify("Profile updated successfully.", "success");
  }

  /* ---------- NOTIFICATIONS ---------- */

  function notify(message, type) {
    if (
      window.APPARA_APP &&
      typeof window.APPARA_APP.notify === "function"
    ) {
      window.APPARA_APP.notify(message, type || "info");
      return;
    }

    if (window.APPARA_GAME &&
        typeof window.APPARA_GAME.notify === "function") {
      window.APPARA_GAME.notify(message, type || "info");
      return;
    }

    console.info("[APPARA PROFILE]", message);
  }

  /* ---------- OPTIONAL FIREBASE SYNC ---------- */

  function syncToFirebase() {
    if (!profile) load();

    try {
      if (!window.APPARA_FIREBASE) return false;
      if (!window.APPARA_FIREBASE.isAvailable()) return false;

      const auth = window.APPARA_FIREBASE.getAuth();
      const database = window.APPARA_FIREBASE.getDatabase();

      if (!auth || !auth.currentUser || !database) {
        return false;
      }

      const userId = auth.currentUser.uid;
      const reference = database.ref("users/" + userId);

      return reference.update({
        profile: {
          name: profile.name,
          avatar: profile.avatar,
          playerId: profile.id,
          rating: profile.rating,
          games: profile.games,
          wins: profile.wins,
          losses: profile.losses,
          draws: profile.draws,
          updatedAt: new Date().toISOString()
        }
      }).then(function () {
        return true;
      }).catch(function (error) {
        console.warn("Firebase profile sync failed:", error);
        return false;
      });
    } catch (error) {
      console.warn("Firebase profile sync unavailable:", error);
      return false;
    }
  }

  function getPlayerId() {
    if (!profile) load();
    return profile.id;
  }

  /* ---------- EVENT BINDING ---------- */

  function bindEvents() {
    const editButton = document.getElementById("edit-profile-btn");

    if (editButton && !editButton.dataset.profileBound) {
      editButton.dataset.profileBound = "true";
      editButton.addEventListener("click", editProfile);
    }
  }

  /* ---------- INITIALIZATION ---------- */

  function init() {
    if (initialized) {
      render();
      return getProfile();
    }

    load();
    bindEvents();
    render();

    initialized = true;

    return getProfile();
  }

  function resetProfile() {
    profile = normalizeProfile(DEFAULTS);
    profile.id = generatePlayerId();
    profile.createdAt = new Date().toISOString();

    save();
    return getProfile();
  }

  function destroy() {
    initialized = false;
  }

  return {
    init: init,
    load: load,
    save: save,
    render: render,
    getProfile: getProfile,
    getPlayerId: getPlayerId,
    updateProfile: updateProfile,
    setName: setName,
    setAvatar: setAvatar,
    addCoins: addCoins,
    spendCoins: spendCoins,
    recordGame: recordGame,
    updateRating: updateRating,
    updateStats: updateStats,
    editProfile: editProfile,
    syncToFirebase: syncToFirebase,
    resetProfile: resetProfile,
    destroy: destroy
  };
})();

/* =========================================================
   APPARA CHESS — PROFILE MANAGER
   PART 15 END
   ========================================================= */
        
