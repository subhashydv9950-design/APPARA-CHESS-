
/* =========================================================
   APPARA CHESS — FILE 58
   PATH: js/screens/tournament-screen.js
   PART 1/2 — START
========================================================= */

const TOURNAMENT_FILTERS = [
  { id: "all", label: "All Tournaments" },
  { id: "upcoming", label: "Upcoming" },
  { id: "live", label: "Live Now" },
  { id: "completed", label: "Completed" }
];

const TOURNAMENT_FORMATS = [
  "Bullet",
  "Blitz",
  "Rapid",
  "Classical",
  "Arena",
  "Swiss"
];

export class TournamentScreen {
  constructor(options = {}) {
    this.container = options.container || null;
    this.tournamentService = options.tournamentService || null;
    this.playerService = options.playerService || null;
    this.navigation = options.navigation || null;
    this.modalManager = options.modalManager || null;
    this.eventBus = options.eventBus || null;

    this.tournaments = [];
    this.filteredTournaments = [];
    this.selectedFilter = "all";
    this.selectedTournament = null;

    this.loading = false;
    this.joining = false;
    this.destroyed = false;

    this.currentPlayerId = null;
    this.joinedTournamentIds = new Set();

    this.elements = {};
    this.boundClickHandler = this.handleClick.bind(this);
  }

  mount(container = this.container) {
    if (!container) {
      throw new Error("TournamentScreen requires a container.");
    }

    this.container = container;
    this.destroyed = false;

    this.render();
    this.cacheElements();
    this.bindEvents();

    this.loadPlayer();
    this.loadTournaments();

    return this;
  }

  initialize(container = this.container) {
    return this.mount(container);
  }

  loadPlayer() {
    try {
      const profile = this.playerService?.getProfile?.();

      this.currentPlayerId =
        profile?.playerId ||
        profile?.id ||
        profile?.uid ||
        null;

      const joined = profile?.tournaments?.joinedIds;

      if (Array.isArray(joined)) {
        this.joinedTournamentIds = new Set(joined);
      }
    } catch (error) {
      console.warn("Unable to load tournament player data:", error);
    }
  }

  render() {
    this.container.innerHTML = `
      <section class="tournament-screen">

        <header class="tournament-header">
          <button class="tournament-back-button"
            type="button" data-action="back"
            aria-label="Go back">←</button>

          <div class="tournament-heading">
            <span class="tournament-eyebrow">
              COMPETE • RISE • CONQUER
            </span>
            <h1>Chess Tournaments</h1>
            <p>Enter the arena and prove your strategy.</p>
          </div>

          <div class="tournament-header-icon" aria-hidden="true">
            ♛
          </div>
        </header>

        <section class="tournament-feature">
          <div class="tournament-feature-content">
            <span class="tournament-feature-tag">
              THE ROYAL ARENA
            </span>
            <h2>Your next victory awaits.</h2>
            <p>
              Join competitive chess events, challenge new opponents
              and climb the tournament standings.
            </p>

            <button class="tournament-feature-button"
              type="button" data-action="refresh">
              Explore Tournaments
            </button>
          </div>

          <div class="tournament-feature-symbol" aria-hidden="true">
            ♜
          </div>
        </section>

        <section class="tournament-stats">
          <article class="tournament-stat-card">
            <span class="tournament-stat-icon">🏆</span>
            <span class="tournament-stat-label">Joined</span>
            <strong id="tournament-joined-count">0</strong>
          </article>

          <article class="tournament-stat-card">
            <span class="tournament-stat-icon">♟</span>
            <span class="tournament-stat-label">Available</span>
            <strong id="tournament-available-count">0</strong>
          </article>

          <article class="tournament-stat-card">
            <span class="tournament-stat-icon">⚔</span>
            <span class="tournament-stat-label">Live</span>
            <strong id="tournament-live-count">0</strong>
          </article>
        </section>

        <section class="tournament-list-section">
          <div class="tournament-section-heading">
            <div>
              <span class="tournament-eyebrow">COMPETITION HUB</span>
              <h2>Find Your Tournament</h2>
            </div>

            <button class="tournament-refresh-button"
              type="button" data-action="refresh"
              aria-label="Refresh tournaments">↻</button>
          </div>

          <nav class="tournament-filters"
            aria-label="Tournament filters">
            ${TOURNAMENT_FILTERS.map(filter => `
              <button
                class="tournament-filter ${
                  filter.id === "all" ? "active" : ""
                }"
                type="button"
                data-action="filter"
                data-filter="${filter.id}"
                aria-pressed="${filter.id === "all"}">
                ${this.escapeHTML(filter.label)}
              </button>
            `).join("")}
          </nav>

          <div class="tournament-list"
            id="tournament-list" aria-live="polite">
            <div class="tournament-loading">
              Loading tournaments...
            </div>
          </div>
        </section>

        <section class="tournament-format-section">
          <span class="tournament-eyebrow">PLAY YOUR WAY</span>
          <h2>Tournament Formats</h2>

          <div class="tournament-format-grid">
            ${TOURNAMENT_FORMATS.map((format, index) => `
              <article class="tournament-format-card">
                <span class="tournament-format-number">
                  ${String(index + 1).padStart(2, "0")}
                </span>
                <strong>${this.escapeHTML(format)}</strong>
              </article>
            `).join("")}
          </div>
        </section>

        <section class="tournament-details"
          id="tournament-details" hidden>
        </section>

      </section>
    `;
  }

  cacheElements() {
    this.elements = {
      list: this.container.querySelector("#tournament-list"),
      joinedCount: this.container.querySelector(
        "#tournament-joined-count"
      ),
      availableCount: this.container.querySelector(
        "#tournament-available-count"
      ),
      liveCount: this.container.querySelector(
        "#tournament-live-count"
      ),
      details: this.container.querySelector(
        "#tournament-details"
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
  }

  async handleClick(event) {
    const button = event.target.closest("[data-action]");

    if (!button || !this.container.contains(button)) return;

    const action = button.dataset.action;

    if (action === "back") {
      this.goBack();
      return;
    }

    if (action === "refresh") {
      await this.loadTournaments();
      return;
    }

    if (action === "filter") {
      this.selectFilter(button.dataset.filter);
      return;
    }

    if (action === "details") {
      this.showTournamentDetails(button.dataset.id);
      return;
    }

    if (action === "join") {
      await this.joinTournament(button.dataset.id);
      return;
    }

    if (action === "close-details") {
      this.closeTournamentDetails();
    }
  }

  async loadTournaments() {
    if (this.loading || this.destroyed) return;

    if (typeof this.tournamentService?.getTournaments !== "function") {
      this.showError("Tournament service is not available yet.");
      return;
    }

    this.loading = true;
    this.showLoading();

    try {
      const response =
        await this.tournamentService.getTournaments();

      if (this.destroyed) return;

      const items = Array.isArray(response)
        ? response
        : response?.tournaments;

      this.tournaments = Array.isArray(items) ? items : [];

      this.applyFilter();
      this.updateStats();
      this.renderTournamentList();
    } catch (error) {
      console.error("Tournament loading failed:", error);
      this.showError(
        error?.message || "Unable to load tournaments."
      );
    } finally {
      this.loading = false;
    }
  }

  selectFilter(filter) {
    if (!TOURNAMENT_FILTERS.some(item => item.id === filter)) {
      return;
    }

    this.selectedFilter = filter;

    this.container
      .querySelectorAll(".tournament-filter")
      .forEach(button => {
        const active = button.dataset.filter === filter;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });

    this.applyFilter();
    this.renderTournamentList();
  }

  applyFilter() {
    const now = Date.now();

    this.filteredTournaments = this.tournaments.filter(
      tournament => {
        const status = this.getTournamentStatus(tournament, now);

        if (this.selectedFilter === "all") return true;
        return status === this.selectedFilter;
      }
    );
  }

  getTournamentStatus(tournament, now = Date.now()) {
    const explicitStatus = String(
      tournament?.status || ""
    ).toLowerCase();

    if (
      ["live", "active", "in_progress", "ongoing"].includes(
        explicitStatus
      )
    ) {
      return "live";
    }

    if (
      ["completed", "finished", "ended", "cancelled"].includes(
        explicitStatus
      )
    ) {
      return "completed";
    }

    const startTime = this.getTimestamp(
      tournament?.startAt || tournament?.startTime
    );

    const endTime = this.getTimestamp(
      tournament?.endAt || tournament?.endTime
    );

    if (endTime && now > endTime) return "completed";
    if (startTime && now >= startTime) return "live";

    return "upcoming";
  }

  getTimestamp(value) {
    if (!value) return 0;

    if (typeof value?.toMillis === "function") {
      return value.toMillis();
    }

    if (typeof value === "number") {
      return value < 1000000000000
        ? value * 1000
        : value;
    }

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  getTournamentId(tournament) {
    return tournament?.id ||
      tournament?.tournamentID ||
      tournament?.tournamentId ||
      null;
  }

  updateStats() {
    const joinedCount = this.tournaments.filter(tournament =>
      this.joinedTournamentIds.has(
        this.getTournamentId(tournament)
      )
    ).length;

    const availableCount = this.tournaments.filter(
      tournament =>
        this.getTournamentStatus(tournament) === "upcoming"
    ).length;

    const liveCount = this.tournaments.filter(
      tournament =>
        this.getTournamentStatus(tournament) === "live"
    ).length;

    if (this.elements.joinedCount) {
      this.elements.joinedCount.textContent = String(joinedCount);
    }

    if (this.elements.availableCount) {
      this.elements.availableCount.textContent = String(availableCount);
    }

    if (this.elements.liveCount) {
      this.elements.liveCount.textContent = String(liveCount);
    }
  }

  renderTournamentList() {
    if (!this.elements.list) return;

    if (this.filteredTournaments.length === 0) {
      this.elements.list.innerHTML = `
        <div class="tournament-empty">
          <div class="tournament-empty-icon">♙</div>
          <h3>No tournaments found</h3>
          <p>
            There are no tournaments in this category right now.
            Check again later.
          </p>
          <button type="button"
            data-action="refresh"
            class="tournament-empty-button">
            Refresh
          </button>
        </div>
      `;
      return;
    }

    this.elements.list.innerHTML =
      this.filteredTournaments.map(tournament => {
        const id = this.getTournamentId(tournament);
        const status = this.getTournamentStatus(tournament);
        const joined = this.joinedTournamentIds.has(id);

        const title = this.escapeHTML(
          tournament.name ||
          tournament.title ||
          "Chess Tournament"
        );

        const format = this.escapeHTML(
          tournament.format ||
          tournament.timeControl ||
          "Standard"
        );

        const players = Number(
          tournament.currentPlayers ??
          tournament.participantCount ??
          0
        );

        const capacity = Number(tournament.maxPlayers || 0);

        const playerText = capacity > 0
          ? `${players} / ${capacity} Players`
          : `${players} Players`;

        const prize = this.escapeHTML(
          tournament.prizeLabel ||
          tournament.prize ||
          tournament.prizePool ||
          "See event details"
        );

        const statusLabel = {
          upcoming: "UPCOMING",
          live: "LIVE NOW",
          completed: "COMPLETED"
        }[status];

        const actionLabel = joined
          ? "Joined"
          : status === "upcoming"
            ? "Join Tournament"
            : status === "live"
              ? "View Tournament"
              : "View Results";

        const action = joined || status !== "upcoming"
          ? "details"
          : "join";

        return `
          <article class="tournament-card">
            <div class="tournament-card-top">
              <span class="tournament-status ${status}">
                ${statusLabel}
              </span>
              <span class="tournament-format-label">
                ${format}
              </span>
            </div>

            <h3>${title}</h3>

            <div class="tournament-card-info">
              <span>♟ ${this.escapeHTML(playerText)}</span>
              <span>🏆 ${prize}</span>
            </div>

            <div class="tournament-card-footer">
              <span class="tournament-start-time">
                ${this.escapeHTML(
                  this.formatDate(
                    tournament.startAt || tournament.startTime
                  )
                )}
              </span>

              <button type="button"
                class="tournament-action-button"
                data-action="${action}"
                data-id="${this.escapeHTML(id || "")}">
                ${actionLabel}
              </button>
            </div>
          </article>
        `;
      }).join("");
  }

/* =========================================================
   FILE 58 — PART 1/2 END
   PART 2/2 CONTINUES INSIDE TournamentScreen CLASS
========================================================= */
           
/* =========================================================
   FILE 58 — PART 2/2 — START
   CONTINUES INSIDE TournamentScreen CLASS
========================================================= */

  async joinTournament(id) {
    if (!id || this.joining || this.destroyed) return;

    if (!this.currentPlayerId) {
      this.showMessage("Sign in to join tournaments.");
      return;
    }

    const tournament = this.tournaments.find(
      item => this.getTournamentId(item) === id
    );

    if (!tournament) {
      this.showMessage("Tournament not found.");
      return;
    }

    if (this.getTournamentStatus(tournament) !== "upcoming") {
      this.showMessage(
        "This tournament is not open for registration."
      );
      return;
    }

    if (typeof this.tournamentService?.register !== "function") {
      this.showMessage(
        "Tournament registration service is unavailable."
      );
      return;
    }

    this.joining = true;

    try {
      const result =
        await this.tournamentService.register(id);

      if (this.destroyed) return;

      if (result?.success === false) {
        throw new Error(
          result.message || "Unable to join this tournament."
        );
      }

      this.joinedTournamentIds.add(id);
      await this.saveJoinedTournamentIds();

      this.showMessage(
        result?.message || "Tournament registration submitted."
      );

      await this.loadTournaments();
      this.showTournamentDetails(id);
    } catch (error) {
      console.error("Tournament registration failed:", error);

      this.showMessage(
        error?.message || "Could not join tournament."
      );
    } finally {
      this.joining = false;
    }
  }

  async saveJoinedTournamentIds() {
    if (typeof this.playerService?.updateProfile !== "function") {
      return;
    }

    await this.playerService.updateProfile(profile => {
      profile.tournaments = profile.tournaments || {};
      profile.tournaments.joinedIds =
        [...this.joinedTournamentIds];
    });
  }

  showTournamentDetails(id) {
    const tournament = this.tournaments.find(
      item => this.getTournamentId(item) === id
    );

    if (!tournament || !this.elements.details) return;

    this.selectedTournament = tournament;

    const status = this.getTournamentStatus(tournament);
    const joined = this.joinedTournamentIds.has(id);

    const title = this.escapeHTML(
      tournament.name ||
      tournament.title ||
      "Chess Tournament"
    );

    const description = this.escapeHTML(
      tournament.description ||
      "Compete against other chess players in this event."
    );

    const rules = Array.isArray(tournament.rules)
      ? tournament.rules
      : [];

    const rulesHTML = rules.length
      ? rules.map(rule => `
          <li>${this.escapeHTML(rule)}</li>
        `).join("")
      : "<li>Standard chess rules apply.</li>";

    const tournamentFormat = this.escapeHTML(
      tournament.format || "Standard"
    );

    const prize = this.escapeHTML(
      tournament.prizeLabel ||
      tournament.prize ||
      tournament.prizePool ||
      "Not specified"
    );

    this.elements.details.hidden = false;

    this.elements.details.innerHTML = `
      <div class="tournament-details-panel">

        <button type="button"
          class="tournament-details-close"
          data-action="close-details"
          aria-label="Close details">×</button>

        <span class="tournament-eyebrow">
          TOURNAMENT DETAILS
        </span>

        <h2>${title}</h2>
        <p>${description}</p>

        <div class="tournament-detail-grid">
          <div>
            <span>Format</span>
            <strong>${tournamentFormat}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>${this.escapeHTML(status)}</strong>
          </div>

          <div>
            <span>Start</span>
            <strong>
              ${this.escapeHTML(
                this.formatDate(
                  tournament.startAt || tournament.startTime
                )
              )}
            </strong>
          </div>

          <div>
            <span>Prize</span>
            <strong>${prize}</strong>
          </div>
        </div>

        <h3>Rules</h3>
        <ul class="tournament-rules">
          ${rulesHTML}
        </ul>

        ${
          status === "upcoming" && !joined
            ? `
              <button type="button"
                class="tournament-action-button"
                data-action="join"
                data-id="${this.escapeHTML(id)}"
                ${this.joining ? "disabled" : ""}>
                Join Tournament
              </button>
            `
            : joined
              ? `<p class="tournament-joined-note">
                   You are registered for this tournament.
                 </p>`
              : ""
        }

      </div>
    `;

    this.elements.details.scrollIntoView?.({
      behavior: "smooth",
      block: "nearest"
    });
  }

  closeTournamentDetails() {
    if (!this.elements.details) return;

    this.elements.details.hidden = true;
    this.elements.details.innerHTML = "";
    this.selectedTournament = null;
  }

  formatDate(value) {
    const timestamp = this.getTimestamp(value);

    if (!timestamp) return "Date to be announced";

    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(timestamp));
    } catch {
      return "Date to be announced";
    }
  }

  showLoading() {
    if (!this.elements.list) return;

    this.elements.list.innerHTML = `
      <div class="tournament-loading">
        Loading tournaments...
      </div>
    `;
  }

  showError(message) {
    if (!this.elements.list) return;

    this.elements.list.innerHTML = `
      <div class="tournament-error">
        <h3>Unable to load tournaments</h3>
        <p>${this.escapeHTML(message)}</p>
        <button type="button"
          data-action="refresh"
          class="tournament-empty-button">
          Try Again
        </button>
      </div>
    `;
  }

  showMessage(message) {
    if (this.modalManager?.alert) {
      this.modalManager.alert(message);
      return;
    }

    if (this.elements.list) {
      const notice = document.createElement("p");
      notice.className = "tournament-notice";
      notice.textContent = message;
      this.elements.list.prepend(notice);
    }
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
    this.joining = false;

    if (this.container) {
      this.container.removeEventListener(
        "click",
        this.boundClickHandler
      );

      this.container.innerHTML = "";
    }

    this.tournaments = [];
    this.filteredTournaments = [];
    this.joinedTournamentIds.clear();

    this.selectedTournament = null;
    this.elements = {};
  }
}

export function createTournamentScreen(options = {}) {
  return new TournamentScreen(options);
}

/* =========================================================
   FILE 58 END
   TOURNAMENT SCREEN COMPLETE
========================================================= */
     
