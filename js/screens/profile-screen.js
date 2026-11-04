/* =========================================================
   APPARA CHESS
   FILE 62: js/screens/profile-screen.js
   PART A
   ========================================================= */

import { createElement, escapeHTML } from "../core/dom-utils.js";

export class ProfileScreen {
  constructor(options = {}) {
    this.playerService = options.playerService || null;
    this.rankService = options.rankService || null;
    this.progressionService = options.progressionService || null;
    this.navigation = options.navigation || null;
    this.modalManager = options.modalManager || null;
    this.eventBus = options.eventBus || null;
    this.authService = options.authService || null;

    this.container = options.container || null;
    this.profile = null;
    this.stats = {};
    this.ratings = {};
    this.achievements = [];
    this.recentMatches = [];

    this.loading = false;
    this.destroyed = false;
    this.editingName = false;
    this.errorMessage = "";
    this.successMessage = "";

    this.boundClick = this.handleClick.bind(this);
    this.boundSubmit = this.handleSubmit.bind(this);
  }

  async mount(container) {
    this.container = container || this.container;

    if (!this.container) {
      throw new Error("ProfileScreen: container is required.");
    }

    this.destroyed = false;

    this.container.innerHTML = `
      <section class="profile-screen screen">
        <header class="screen-header profile-header">
          <button class="icon-button" data-action="back"
            aria-label="Go back">←</button>

          <div class="screen-heading">
            <span class="eyebrow">YOUR CHESS JOURNEY</span>
            <h1>My Profile</h1>
          </div>

          <button class="icon-button" data-action="refresh"
            aria-label="Refresh profile">↻</button>
        </header>

        <div class="profile-content" data-profile-content>
          <div class="profile-loading">
            <span class="loading-spinner"></span>
            <p>Loading your profile...</p>
          </div>
        </div>
      </section>
    `;

    this.container.addEventListener("click", this.boundClick);
    this.container.addEventListener("submit", this.boundSubmit);

    await this.loadProfile();
    return this;
  }

  async loadProfile() {
    if (this.loading || this.destroyed) return;

    this.loading = true;
    this.showLoading();

    try {
      this.profile = await this.getPlayerProfile();

      if (!this.profile) {
        this.profile = this.getGuestProfile();
      }

      await Promise.all([
        this.loadStats(),
        this.loadRatings(),
        this.loadAchievements(),
        this.loadRecentMatches()
      ]);

      if (!this.destroyed) {
        this.renderProfile();
      }
    } catch (error) {
      console.error("Profile loading failed:", error);
      this.errorMessage = "Profile could not be loaded.";
      this.renderError();
    } finally {
      this.loading = false;
    }
  }

  async getPlayerProfile() {
    if (!this.playerService) return null;

    const methods = [
      "getProfile",
      "getCurrentProfile",
      "getPlayerProfile"
    ];

    for (const method of methods) {
      if (typeof this.playerService[method] === "function") {
        try {
          const result = await this.playerService[method]();

          if (result && typeof result === "object") {
            return result.profile || result.player || result;
          }
        } catch (error) {
          console.warn(`Profile method ${method} failed:`, error);
        }
      }
    }

    return null;
  }

  getGuestProfile() {
    return {
      displayName: "Guest Player",
      playerId: "GUEST",
      level: 1,
      xp: 0,
      coins: 0,
      diamonds: 0,
      avatar: "",
      rank: "Unranked",
      stats: {},
      ratings: {},
      achievements: [],
      recentMatches: []
    };
  }

  async loadStats() {
    const profileStats = this.profile?.stats || {};

    this.stats = {
      gamesPlayed: this.toNumber(
        profileStats.gamesPlayed ??
        profileStats.totalGames ??
        this.profile?.gamesPlayed
      ),
      wins: this.toNumber(
        profileStats.wins ?? this.profile?.wins
      ),
      losses: this.toNumber(
        profileStats.losses ?? this.profile?.losses
      ),
      draws: this.toNumber(
        profileStats.draws ?? this.profile?.draws
      )
    };

    if (
      this.stats.gamesPlayed === 0 &&
      this.playerService &&
      typeof this.playerService.getStats === "function"
    ) {
      try {
        const result = await this.playerService.getStats();

        if (result) {
          this.stats = {
            gamesPlayed: this.toNumber(
              result.gamesPlayed ?? result.totalGames
            ),
            wins: this.toNumber(result.wins),
            losses: this.toNumber(result.losses),
            draws: this.toNumber(result.draws)
          };
        }
      } catch (error) {
        console.warn("Could not load player statistics:", error);
      }
    }
  }

  async loadRatings() {
    this.ratings = this.profile?.ratings || {};

    if (
      this.rankService &&
      typeof this.rankService.getPlayerRatings === "function"
    ) {
      try {
        const result = await this.rankService.getPlayerRatings();

        if (result && typeof result === "object") {
          this.ratings = result.ratings || result;
        }
      } catch (error) {
        console.warn("Could not load ratings:", error);
      }
    }
  }

  async loadAchievements() {
    const profileAchievements =
      this.profile?.achievements || [];

    this.achievements = Array.isArray(profileAchievements)
      ? profileAchievements
      : [];

    if (
      this.progressionService &&
      typeof this.progressionService.getAchievements === "function"
    ) {
      try {
        const result =
          await this.progressionService.getAchievements();

        if (Array.isArray(result)) {
          this.achievements = result;
        }
      } catch (error) {
        console.warn("Could not load achievements:", error);
      }
    }
  }

  async loadRecentMatches() {
    const matches =
      this.profile?.recentMatches ||
      this.profile?.matchHistory ||
      [];

    this.recentMatches = Array.isArray(matches)
      ? matches.slice(0, 8)
      : [];

    if (
      this.playerService &&
      typeof this.playerService.getRecentMatches === "function"
    ) {
      try {
        const result =
          await this.playerService.getRecentMatches(8);

        if (Array.isArray(result)) {
          this.recentMatches = result.slice(0, 8);
        }
      } catch (error) {
        console.warn("Could not load recent matches:", error);
      }
    }
  }

  renderProfile() {
    const content =
      this.container?.querySelector("[data-profile-content]");

    if (!content) return;

    const name = this.getDisplayName();
    const playerId = this.getPlayerId();
    const level = Math.max(1, this.toNumber(this.profile?.level) || 1);
    const xp = Math.max(0, this.toNumber(this.profile?.xp));
    const nextLevelXP = this.getNextLevelXP();

    const progress = nextLevelXP > 0
      ? Math.min(100, (xp / nextLevelXP) * 100)
      : 0;

    const winRate = this.stats.gamesPlayed > 0
      ? (
          this.stats.wins /
          this.stats.gamesPlayed *
          100
        ).toFixed(1)
      : "0.0";

    content.innerHTML = `
      ${this.renderMessages()}

      <section class="profile-hero">
        <div class="profile-avatar-wrap">
          ${this.renderAvatar()}
          <span class="profile-level-badge">
            LV ${level}
          </span>
        </div>

        <div class="profile-identity">
          <h2>${this.escape(name)}</h2>
          <p class="profile-player-id">
            PLAYER ID: ${this.escape(playerId)}
          </p>

          <div class="profile-rank">
            <span class="rank-icon">♛</span>
            <span>${this.escape(this.getMainRank())}</span>
          </div>

          <button class="profile-edit-button"
            data-action="edit-name">
            ✎ Edit Display Name
          </button>
        </div>
      </section>

      <section class="profile-xp-card">
        <div class="section-title-row">
          <h3>Player Progress</h3>
          <span class="profile-level-label">
            Level ${level}
          </span>
        </div>

        <div class="xp-progress-track">
          <div class="xp-progress-fill"
            style="width:${progress}%"></div>
        </div>

        <div class="xp-progress-labels">
          <span>${this.formatNumber(xp)} XP</span>
          <span>${this.formatNumber(nextLevelXP)} XP</span>
        </div>
      </section>

      <section class="profile-section">
        <div class="section-title-row">
          <h3>Chess Statistics</h3>
          <span class="section-caption">CAREER</span>
        </div>

        <div class="profile-stats-grid">
          ${this.renderStat("Games", this.stats.gamesPlayed, "♟")}
          ${this.renderStat("Wins", this.stats.wins, "🏆")}
          ${this.renderStat("Losses", this.stats.losses, "◆")}
          ${this.renderStat("Draws", this.stats.draws, "＝")}
        </div>

        <div class="win-rate-card">
          <div>
            <span class="win-rate-label">WIN RATE</span>
            <strong>${winRate}%</strong>
          </div>
          <div class="win-rate-track">
            <div style="width:${winRate}%"></div>
          </div>
        </div>
      </section>

      <section class="profile-section">
        <div class="section-title-row">
          <h3>Chess Ratings</h3>
          <span class="section-caption">BY GAME MODE</span>
        </div>

        <div class="rating-grid">
          ${this.renderRating("Bullet", this.getRating("bullet"))}
          ${this.renderRating("Blitz", this.getRating("blitz"))}
          ${this.renderRating("Rapid", this.getRating("rapid"))}
          ${this.renderRating("Classical", this.getRating("classical"))}
        </div>
      </section>

      <section class="profile-section">
        <div class="section-title-row">
          <h3>Achievements</h3>
          <span class="section-caption">
            ${this.achievements.length} BADGES
          </span>
        </div>

        ${this.renderAchievements()}
      </section>

      <section class="profile-section">
        <div class="section-title-row">
          <h3>Recent Matches</h3>
          <span class="section-caption">LATEST GAMES</span>
        </div>

        ${this.renderRecentMatches()}
      </section>

      <div class="profile-footer">
        <p>APPARA CHESS</p>
        <span>The Royal Chess Experience</span>
      </div>
    `;
  }

  /* ========== PART A END — PART B नीचे जोड़ें ========== */
  renderAvatar() {
    const avatar = this.profile?.avatar ||
      this.profile?.photoURL ||
      this.profile?.photoUrl ||
      "";

    if (avatar && this.isSafeImageURL(avatar)) {
      return `
        <img class="profile-avatar"
          src="${this.escape(avatar)}"
          alt="Player avatar"
          referrerpolicy="no-referrer">
      `;
    }

    const initial = this.getDisplayName()
      .trim()
      .charAt(0)
      .toUpperCase() || "P";

    return `
      <div class="profile-avatar profile-avatar-placeholder">
        ${this.escape(initial)}
      </div>
    `;
  }

  renderStat(label, value, icon) {
    return `
      <article class="profile-stat-card">
        <span class="stat-icon">${icon}</span>
        <strong>${this.formatNumber(value)}</strong>
        <span>${this.escape(label)}</span>
      </article>
    `;
  }

  renderRating(mode, rating) {
    const value = rating?.rating ??
      rating?.value ??
      rating ??
      0;

    const tier = rating?.tier ||
      rating?.rank ||
      (Number(value) > 0 ? "Rated" : "Unranked");

    return `
      <article class="rating-card">
        <span>${this.escape(mode)}</span>
        <strong>${this.formatNumber(value)}</strong>
        <small>${this.escape(tier)}</small>
      </article>
    `;
  }

  renderAchievements() {
    if (!this.achievements.length) {
      return `
        <div class="profile-empty-state">
          <span>🏅</span>
          <p>No achievements yet.</p>
          <small>Play chess and complete challenges to earn badges.</small>
        </div>
      `;
    }

    return `
      <div class="achievement-grid">
        ${this.achievements.slice(0, 12).map(item => {
          const title = item.title ||
            item.name ||
            item.id ||
            "Achievement";

          const icon = item.icon || item.emoji || "🏅";

          return `
            <article class="achievement-card">
              <span class="achievement-icon">
                ${this.escape(icon)}
              </span>
              <strong>${this.escape(title)}</strong>
              <small>
                ${this.escape(item.description || "Achievement unlocked")}
              </small>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  renderRecentMatches() {
    if (!this.recentMatches.length) {
      return `
        <div class="profile-empty-state">
          <span>♟</span>
          <p>No matches played yet.</p>
          <small>Your recent chess games will appear here.</small>
        </div>
      `;
    }

    return `
      <div class="recent-match-list">
        ${this.recentMatches.map(match => {
          const result = String(
            match.result || match.outcome || "unknown"
          ).toLowerCase();

          const resultLabel = this.getResultLabel(result);
          const resultClass = this.getResultClass(result);

          const opponent = match.opponentName ||
            match.opponent?.displayName ||
            match.opponent ||
            "Opponent";

          const mode = match.mode || "Chess";
          const date = this.formatDate(
            match.completedAt || match.date || match.createdAt
          );

          return `
            <article class="recent-match-card">
              <div class="match-result-icon ${resultClass}">
                ${resultClass === "win" ? "✓" :
                  resultClass === "loss" ? "×" : "＝"}
              </div>

              <div class="match-info">
                <strong>${this.escape(opponent)}</strong>
                <span>
                  ${this.escape(mode)} · ${this.escape(date)}
                </span>
              </div>

              <span class="match-result-label ${resultClass}">
                ${this.escape(resultLabel)}
              </span>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  renderMessages() {
    if (this.errorMessage) {
      return `
        <div class="profile-message error" role="alert">
          ${this.escape(this.errorMessage)}
        </div>
      `;
    }

    if (this.successMessage) {
      return `
        <div class="profile-message success" role="status">
          ${this.escape(this.successMessage)}
        </div>
      `;
    }

    return "";
  }

  showLoading() {
    const content =
      this.container?.querySelector("[data-profile-content]");

    if (!content) return;

    content.innerHTML = `
      <div class="profile-loading">
        <span class="loading-spinner"></span>
        <p>Loading your profile...</p>
      </div>
    `;
  }

  renderError() {
    const content =
      this.container?.querySelector("[data-profile-content]");

    if (!content) return;

    content.innerHTML = `
      <div class="profile-error">
        <span>⚠</span>
        <h3>Unable to load profile</h3>
        <p>${this.escape(this.errorMessage)}</p>
        <button class="primary-button" data-action="refresh">
          Try Again
        </button>
      </div>
    `;
  }

  async handleClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button || !this.container.contains(button)) return;

    const action = button.dataset.action;

    switch (action) {
      case "back":
        this.goBack();
        break;

      case "refresh":
        this.errorMessage = "";
        this.successMessage = "";
        await this.loadProfile();
        break;

      case "edit-name":
        this.showNameEditor();
        break;

      case "cancel-name":
        this.renderProfile();
        break;
    }
  }

  showNameEditor() {
    const content =
      this.container?.querySelector("[data-profile-content]");

    if (!content) return;

    const currentName = this.getDisplayName();

    const editor = document.createElement("div");
    editor.className = "profile-edit-panel";

    editor.innerHTML = `
      <div class="profile-edit-backdrop"></div>

      <form class="profile-edit-form" data-profile-edit-form>
        <h3>Edit Display Name</h3>
        <p>Your player ID will remain unchanged.</p>

        <label for="profile-display-name">
          Display Name
        </label>

        <input
          id="profile-display-name"
          name="displayName"
          type="text"
          minlength="3"
          maxlength="20"
          autocomplete="nickname"
          value="${this.escape(currentName)}"
          required
        >

        <small>Use 3–20 characters.</small>

        <div class="profile-edit-actions">
          <button type="button"
            class="secondary-button"
            data-action="cancel-name">
            Cancel
          </button>

          <button type="submit"
            class="primary-button">
            Save Name
          </button>
        </div>

        <p class="profile-edit-error"
          data-edit-error
          role="alert"></p>
      </form>
    `;

    content.prepend(editor);

    editor.querySelector("input")?.focus();
    editor.querySelector("input")?.select();
  }

  async handleSubmit(event) {
    const form = event.target.closest("[data-profile-edit-form]");
    if (!form) return;

    event.preventDefault();

    const input = form.querySelector(
      '[name="displayName"]'
    );

    const errorElement = form.querySelector("[data-edit-error]");
    const saveButton = form.querySelector('[type="submit"]');

    const newName = String(input?.value || "").trim();

    if (!this.isValidDisplayName(newName)) {
      if (errorElement) {
        errorElement.textContent =
          "Name must be 3–20 characters and contain valid characters.";
      }
      return;
    }

    if (newName === this.getDisplayName()) {
      this.renderProfile();
      return;
    }

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving...";
    }

    try {
      const saved = await this.saveDisplayName(newName);

      if (!saved) {
        throw new Error("Profile update is not available.");
      }

      this.profile.displayName = newName;
      this.profile.name = newName;

      this.successMessage = "Display name updated.";
      this.errorMessage = "";

      this.emitProfileUpdated();
      this.renderProfile();
    } catch (error) {
      console.error("Display name update failed:", error);

      if (errorElement) {
        errorElement.textContent =
          "Name could not be saved. Please try again.";
      }

      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save Name";
      }
    }
  }

  async saveDisplayName(name) {
    if (!this.playerService) return false;

    if (typeof this.playerService.updateProfile === "function") {
      const result = await this.playerService.updateProfile({
        displayName: name,
        name
      });

      return result !== false;
    }

    if (typeof this.playerService.updateDisplayName === "function") {
      const result =
        await this.playerService.updateDisplayName(name);

      return result !== false;
    }

    if (typeof this.playerService.replaceProfile === "function") {
      const updatedProfile = {
        ...this.profile,
        displayName: name,
        name
      };

      const result =
        await this.playerService.replaceProfile(updatedProfile);

      return result !== false;
    }

    return false;
  }

  isValidDisplayName(name) {
    if (name.length < 3 || name.length > 20) return false;

    return /^[\p{L}\p{N}_ -]+$/u.test(name);
  }

  getDisplayName() {
    return String(
      this.profile?.displayName ||
      this.profile?.name ||
      this.profile?.username ||
      "Guest Player"
    );
  }

  getPlayerId() {
    return String(
      this.profile?.playerId ||
      this.profile?.publicId ||
      this.profile?.uid ||
      "GUEST"
    );
  }

  getMainRank() {
    return this.profile?.rank?.title ||
      this.profile?.rank?.name ||
      this.profile?.rankTitle ||
      "Unranked";
  }

  getRating(mode) {
    return this.ratings?.[mode] ??
      this.ratings?.[mode.toUpperCase()] ??
      0;
  }

  getNextLevelXP() {
    if (
      this.progressionService &&
      typeof this.progressionService.getXPForNextLevel === "function"
    ) {
      try {
        const value =
          this.progressionService.getXPForNextLevel(
            this.profile?.level || 1
          );

        if (Number.isFinite(Number(value))) {
          return Number(value);
        }
      } catch (error) {
        console.warn("Could not calculate next level XP:", error);
      }
    }

    return 1000;
  }

  getResultLabel(result) {
    if (["win", "won", "victory"].includes(result)) return "Victory";
    if (["loss", "lost", "defeat"].includes(result)) return "Defeat";
    if (["draw", "tie"].includes(result)) return "Draw";
    return "Completed";
  }

  getResultClass(result) {
    if (["win", "won", "victory"].includes(result)) return "win";
    if (["loss", "lost", "defeat"].includes(result)) return "loss";
    return "draw";
  }

  formatDate(value) {
    if (!value) return "Recent";

    try {
      const date = value?.toDate
        ? value.toDate()
        : new Date(value);

      if (Number.isNaN(date.getTime())) return "Recent";

      return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return "Recent";
    }
  }

  formatNumber(value) {
    return this.toNumber(value).toLocaleString();
  }

  toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  isSafeImageURL(value) {
    try {
      const url = new URL(value, window.location.origin);
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  }

  escape(value) {
    if (typeof escapeHTML === "function") {
      return escapeHTML(String(value ?? ""));
    }

    const element = document.createElement("span");
    element.textContent = String(value ?? "");
    return element.innerHTML;
  }

  emitProfileUpdated() {
    if (
      this.eventBus &&
      typeof this.eventBus.emit === "function"
    ) {
      this.eventBus.emit("profile:updated", {
        displayName: this.getDisplayName(),
        playerId: this.getPlayerId()
      });
    }
  }

  goBack() {
    if (
      this.navigation &&
      typeof this.navigation.back === "function"
    ) {
      this.navigation.back();
      return;
    }

    if (
      this.navigation &&
      typeof this.navigation.navigate === "function"
    ) {
      this.navigation.navigate("home");
    }
  }

  destroy() {
    this.destroyed = true;

    if (this.container) {
      this.container.removeEventListener(
        "click",
        this.boundClick
      );

      this.container.removeEventListener(
        "submit",
        this.boundSubmit
      );

      this.container.innerHTML = "";
    }

    this.profile = null;
    this.stats = {};
    this.ratings = {};
    this.achievements = [];
    this.recentMatches = [];
    this.container = null;
  }
}

export function createProfileScreen(options = {}) {
  return new ProfileScreen(options);
}

/* ================= FILE 62 END ================= */
