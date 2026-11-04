
/* =========================================================
   APPARA CHESS — FILE 61
   SCREEN: LEADERBOARD
   PATH: js/screens/leaderboard-screen.js
========================================================= */

const LEADERBOARD_MODES = [
  { id: "overall", label: "Overall" },
  { id: "bullet", label: "Bullet" },
  { id: "blitz", label: "Blitz" },
  { id: "rapid", label: "Rapid" },
  { id: "classical", label: "Classical" }
];

const LEADERBOARD_PERIODS = [
  { id: "all-time", label: "All Time" },
  { id: "monthly", label: "Monthly" },
  { id: "weekly", label: "Weekly" }
];

export class LeaderboardScreen {
  constructor(options = {}) {
    this.container = options.container || null;
    this.rankService = options.rankService || null;
    this.playerService = options.playerService || null;
    this.navigation = options.navigation || null;
    this.modalManager = options.modalManager || null;

    this.selectedMode = "overall";
    this.selectedPeriod = "all-time";

    this.players = [];
    this.currentPlayer = null;
    this.currentPlayerId = null;

    this.loading = false;
    this.destroyed = false;

    this.elements = {};
    this.boundClickHandler = this.handleClick.bind(this);
  }

  mount(container = this.container) {
    if (!container) {
      throw new Error("LeaderboardScreen requires a container.");
    }

    this.container = container;
    this.destroyed = false;

    this.loadCurrentPlayer();
    this.render();
    this.cacheElements();
    this.bindEvents();
    this.loadLeaderboard();

    return this;
  }

  loadCurrentPlayer() {
    try {
      this.currentPlayer = this.playerService?.getProfile?.() || null;

      this.currentPlayerId =
        this.currentPlayer?.playerId ||
        this.currentPlayer?.id ||
        this.currentPlayer?.uid ||
        null;
    } catch (error) {
      console.warn("Unable to load current player:", error);
    }
  }

  render() {
    this.container.innerHTML = `
      <section class="leaderboard-screen">

        <header class="leaderboard-header">
          <button
            type="button"
            class="leaderboard-back-button"
            data-action="back"
            aria-label="Go back"
          >
            ←
          </button>

          <div>
            <span class="leaderboard-eyebrow">GLOBAL COMPETITION</span>
            <h1>Leaderboard</h1>
            <p>Discover the strongest players in APPARA CHESS.</p>
          </div>

          <span class="leaderboard-header-icon" aria-hidden="true">
            🏆
          </span>
        </header>

        <section class="leaderboard-feature">
          <span class="leaderboard-eyebrow">THE ROAD TO ROYAL LEGEND</span>
          <h2>Every move counts.</h2>
          <p>
            Compete, improve your rating and rise through
            the royal chess rankings.
          </p>
        </section>

        <section class="leaderboard-controls">

          <div class="leaderboard-control-group">
            <label for="leaderboard-mode">Game Mode</label>

            <select id="leaderboard-mode">
              ${LEADERBOARD_MODES.map(mode => `
                <option
                  value="${mode.id}"
                  ${mode.id === this.selectedMode ? "selected" : ""}
                >
                  ${this.escapeHTML(mode.label)}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="leaderboard-control-group">
            <label for="leaderboard-period">Time Period</label>

            <select id="leaderboard-period">
              ${LEADERBOARD_PERIODS.map(period => `
                <option
                  value="${period.id}"
                  ${period.id === this.selectedPeriod ? "selected" : ""}
                >
                  ${this.escapeHTML(period.label)}
                </option>
              `).join("")}
            </select>
          </div>

        </section>

        <section class="leaderboard-podium" id="leaderboard-podium">
          <div class="leaderboard-loading">
            Loading top players...
          </div>
        </section>

        <section class="leaderboard-list-section">
          <div class="leaderboard-section-heading">
            <div>
              <span class="leaderboard-eyebrow">GLOBAL RANKINGS</span>
              <h2>Top Players</h2>
            </div>

            <button
              type="button"
              class="leaderboard-refresh-button"
              data-action="refresh"
              aria-label="Refresh leaderboard"
            >
              ↻
            </button>
          </div>

          <div
            class="leaderboard-list"
            id="leaderboard-list"
            aria-live="polite"
          >
            <div class="leaderboard-loading">
              Loading rankings...
            </div>
          </div>
        </section>

        <section
          class="leaderboard-player-position"
          id="leaderboard-player-position"
          hidden
        ></section>

      </section>
    `;
  }

  cacheElements() {
    this.elements = {
      mode: this.container.querySelector("#leaderboard-mode"),
      period: this.container.querySelector("#leaderboard-period"),
      podium: this.container.querySelector("#leaderboard-podium"),
      list: this.container.querySelector("#leaderboard-list"),
      playerPosition: this.container.querySelector(
        "#leaderboard-player-position"
      )
    };
  }

  bindEvents() {
    this.container.removeEventListener(
      "click",
      this.boundClickHandler
    );

    this.container.addEventListener(
      "click",
      this.boundClickHandler
    );

    this.elements.mode.addEventListener(
      "change",
      () => {
        this.selectedMode = this.elements.mode.value;
        this.loadLeaderboard();
      }
    );

    this.elements.period.addEventListener(
      "change",
      () => {
        this.selectedPeriod = this.elements.period.value;
        this.loadLeaderboard();
      }
    );
  }

  async handleClick(event) {
    const button = event.target.closest("[data-action]");

    if (!button || !this.container.contains(button)) return;

    if (button.dataset.action === "back") {
      this.goBack();
      return;
    }

    if (button.dataset.action === "refresh") {
      await this.loadLeaderboard();
      return;
    }

    if (button.dataset.action === "player") {
      this.showPlayerDetails(button.dataset.playerId);
    }
  }

  async loadLeaderboard() {
    if (this.loading || this.destroyed) return;

    if (typeof this.rankService?.getLeaderboard !== "function") {
      this.showError("Leaderboard service is not available yet.");
      return;
    }

    this.loading = true;
    this.showLoading();

    try {
      const response = await this.rankService.getLeaderboard({
        mode: this.selectedMode,
        period: this.selectedPeriod
      });

      if (this.destroyed) return;

      const records = Array.isArray(response)
        ? response
        : response?.players || response?.leaderboard;

      this.players = Array.isArray(records)
        ? records
        : [];

      this.players = this.players
        .map(player => ({
          ...player,
          rating: Math.max(
            0,
            Number(player.rating ?? player.elo ?? 0)
          )
        }))
        .sort((a, b) => b.rating - a.rating);

      this.renderPodium();
      this.renderPlayerList();
      this.renderCurrentPlayerPosition();
    } catch (error) {
      console.error("Leaderboard loading failed:", error);

      this.showError(
        error?.message || "Unable to load leaderboard."
      );
    } finally {
      this.loading = false;
    }
  }

  renderPodium() {
    if (!this.elements.podium) return;

    const topPlayers = this.players.slice(0, 3);

    if (!topPlayers.length) {
      this.elements.podium.innerHTML = `
        <div class="leaderboard-empty-podium">
          No ranking data available yet.
        </div>
      `;
      return;
    }

    const podiumOrder = [
      { player: topPlayers[1], position: 2 },
      { player: topPlayers[0], position: 1 },
      { player: topPlayers[2], position: 3 }
    ].filter(item => item.player);

    this.elements.podium.innerHTML = `
      <div class="leaderboard-podium-grid">
        ${podiumOrder.map(item => {
          const player = item.player;

          return `
            <button
              type="button"
              class="leaderboard-podium-player rank-${item.position}"
              data-action="player"
              data-player-id="${this.escapeHTML(
                player.playerId || player.id || ""
              )}"
            >
              <span class="leaderboard-medal">
                ${item.position === 1 ? "👑" : item.position === 2 ? "🥈" : "🥉"}
              </span>

              <span class="leaderboard-avatar">
                ${this.escapeHTML(
                  this.getInitials(player.displayName || player.name)
                )}
              </span>

              <strong>
                ${this.escapeHTML(
                  player.displayName || player.name || "Chess Player"
                )}
              </strong>

              <span class="leaderboard-podium-rating">
                ${this.formatNumber(player.rating)}
              </span>

              <small>RANK #${item.position}</small>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  renderPlayerList() {
    if (!this.elements.list) return;

    const remainingPlayers = this.players.slice(3);

    if (!remainingPlayers.length) {
      this.elements.list.innerHTML = this.players.length
        ? `<p class="leaderboard-list-note">
             All available players are shown above.
           </p>`
        : `
          <div class="leaderboard-empty">
            <span>♟</span>
            <h3>No players yet</h3>
            <p>Rankings will appear when competitive results are available.</p>
          </div>
        `;

      return;
    }

    this.elements.list.innerHTML =
      remainingPlayers.map((player, index) => {
        const rank = index + 4;
        const playerId = player.playerId || player.id || "";
        const isCurrentPlayer =
          playerId && playerId === this.currentPlayerId;

        return `
          <button
            type="button"
            class="leaderboard-player-row ${
              isCurrentPlayer ? "current-player" : ""
            }"
            data-action="player"
            data-player-id="${this.escapeHTML(playerId)}"
          >
            <span class="leaderboard-player-rank">
              #${rank}
            </span>

            <span class="leaderboard-player-avatar">
              ${this.escapeHTML(
                this.getInitials(player.displayName || player.name)
              )}
            </span>

            <span class="leaderboard-player-name">
              <strong>
                ${this.escapeHTML(
                  player.displayName || player.name || "Chess Player"
                )}
              </strong>

              ${
                isCurrentPlayer
                  ? `<small>YOU</small>`
                  : ""
              }
            </span>

            <span class="leaderboard-player-rating">
              ${this.formatNumber(player.rating)}
            </span>
          </button>
        `;
      }).join("");
  }

  renderCurrentPlayerPosition() {
    if (!this.elements.playerPosition) return;

    if (!this.currentPlayerId) {
      this.elements.playerPosition.hidden = true;
      return;
    }

    const index = this.players.findIndex(player =>
      (player.playerId || player.id) === this.currentPlayerId
    );

    this.elements.playerPosition.hidden = false;

    if (index === -1) {
      this.elements.playerPosition.innerHTML = `
        <div class="leaderboard-your-position-content">
          <span>Your Position</span>
          <strong>Not in current top results</strong>
          <p>Keep playing to improve your ranking.</p>
        </div>
      `;
      return;
    }

    const player = this.players[index];

    this.elements.playerPosition.innerHTML = `
      <div class="leaderboard-your-position-content">
        <span>YOUR GLOBAL POSITION</span>
        <strong>#${index + 1}</strong>
        <p>
          ${this.escapeHTML(
            player.displayName || player.name || "You"
          )}
          · ${this.formatNumber(player.rating)} rating
        </p>
      </div>
    `;
  }

  showPlayerDetails(playerId) {
    if (!playerId) return;

    const player = this.players.find(item =>
      (item.playerId || item.id) === playerId
    );

    if (!player) return;

    const name = this.escapeHTML(
      player.displayName || player.name || "Chess Player"
    );

    const rating = this.formatNumber(player.rating);

    const message =
      `${name}\nRating: ${rating}\n` +
      `Rankings are based on the selected game mode.`;

    if (typeof this.modalManager?.alert === "function") {
      this.modalManager.alert(message);
    }
  }

  showLoading() {
    this.elements.podium.innerHTML = `
      <div class="leaderboard-loading">
        Loading top players...
      </div>
    `;

    this.elements.list.innerHTML = `
      <div class="leaderboard-loading">
        Loading rankings...
      </div>
    `;
  }

  showError(message) {
    this.elements.podium.innerHTML = "";

    this.elements.list.innerHTML = `
      <div class="leaderboard-error">
        <h3>Unable to load rankings</h3>
        <p>${this.escapeHTML(message)}</p>

        <button
          type="button"
          data-action="refresh"
        >
          Try Again
        </button>
      </div>
    `;
  }

  getInitials(name) {
    const words = String(name || "AC")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return words
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join("") || "AC";
  }

  formatNumber(value) {
    return new Intl.NumberFormat().format(
      Math.max(0, Number(value) || 0)
    );
  }

  goBack() {
    if (typeof this.navigation?.back === "function") {
      this.navigation.back();
    } else {
      this.navigation?.navigate?.("home");
    }
  }

  escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  destroy() {
    this.destroyed = true;
    this.loading = false;

    if (this.container) {
      this.container.removeEventListener(
        "click",
        this.boundClickHandler
      );

      this.container.innerHTML = "";
    }

    this.players = [];
    this.currentPlayer = null;
    this.elements = {};
  }
}

export function createLeaderboardScreen(options = {}) {
  return new LeaderboardScreen(options);
}

/* =========================================================
   FILE 61 END
   LEADERBOARD SCREEN COMPLETE
========================================================= */
          
