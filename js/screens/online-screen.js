/* =========================================================
   APPARA CHESS — FILE 55A
   SCREEN: ONLINE LOBBY
   PART 1/2 — SAME FILE
========================================================= */

const ONLINE_MODES = [
  {
    id: "ranked",
    title: "Ranked Match",
    subtitle: "Play for rating and rank",
    icon: "🏆",
    description: "Compete against players of similar strength."
  },
  {
    id: "casual",
    title: "Casual Match",
    subtitle: "Play without rating pressure",
    icon: "♟️",
    description: "Enjoy a friendly online chess match."
  },
  {
    id: "private",
    title: "Private Room",
    subtitle: "Create or join a room",
    icon: "🔐",
    description: "Play with friends using a room code."
  }
];

const ONLINE_TIME_CONTROLS = [
  { id: "bullet-1", label: "1 + 0", category: "Bullet" },
  { id: "bullet-2", label: "2 + 1", category: "Bullet" },
  { id: "blitz-3", label: "3 + 0", category: "Blitz" },
  { id: "blitz-5", label: "5 + 3", category: "Blitz" },
  { id: "rapid-10", label: "10 + 0", category: "Rapid" },
  { id: "rapid-15", label: "15 + 10", category: "Rapid" },
  { id: "classical-30", label: "30 + 20", category: "Classical" }
];

export class OnlineScreen {
  constructor(options = {}) {
    this.container = options.container || null;
    this.navigation = options.navigation || null;
    this.matchmakingService = options.matchmakingService || null;
    this.friendsService = options.friendsService || null;
    this.onlineGameService = options.onlineGameService || null;
    this.playerService = options.playerService || null;
    this.modalManager = options.modalManager || null;

    this.selectedMode = "ranked";
    this.selectedTime = "blitz-5";
    this.selectedColor = "random";
    this.selectedRoomSize = 2;

    this.roomCode = "";
    this.searching = false;
    this.loading = false;
    this.destroyed = false;

    this.searchTimer = null;
    this.unsubscribeMatch = null;
    this.unsubscribeFriends = null;

    this.friends = [];
    this.errorMessage = "";
    this.statusMessage = "";

    this.elements = {};
    this.boundEvents = [];
  }

  mount(container = this.container) {
    if (!container) {
      throw new Error("OnlineScreen requires a container element.");
    }

    this.container = container;
    this.destroyed = false;

    this.render();
    this.bindEvents();
    this.loadFriends();

    return this;
  }

  render() {
    this.container.innerHTML = `
      <main class="online-screen">

        <header class="online-header">
          <button
            class="online-back-button"
            type="button"
            data-action="back"
            aria-label="Go back"
          >←</button>

          <div class="online-heading">
            <span class="online-eyebrow">APPARA CHESS</span>
            <h1>Online Arena</h1>
            <p>Challenge the world. Build your legacy.</p>
          </div>

          <div class="online-player-status">
            <span class="online-status-dot"></span>
            <span>Online Lobby</span>
          </div>
        </header>

        <section class="online-hero">
          <div class="online-hero-content">
            <span class="online-hero-label">GLOBAL CHESS NETWORK</span>
            <h2>Your next great match awaits.</h2>
            <p>
              Find opponents, challenge friends and compete
              in the APPARA online arena.
            </p>
          </div>
          <div class="online-hero-art" aria-hidden="true">
            <span>♔</span>
            <span>♕</span>
            <span>♖</span>
          </div>
        </section>

        <section class="online-section">
          <div class="online-section-heading">
            <div>
              <span class="online-section-kicker">PLAY YOUR WAY</span>
              <h2>Choose Match Type</h2>
            </div>
          </div>

          <div class="online-mode-grid">
            ${ONLINE_MODES.map(mode => `
              <button
                class="online-mode-card ${mode.id === this.selectedMode ? "selected" : ""}"
                type="button"
                data-mode="${mode.id}"
                aria-pressed="${mode.id === this.selectedMode}"
              >
                <span class="online-mode-icon">${mode.icon}</span>
                <span class="online-mode-title">${mode.title}</span>
                <span class="online-mode-subtitle">${mode.subtitle}</span>
                <span class="online-mode-description">${mode.description}</span>
                <span class="online-mode-check">✓</span>
              </button>
            `).join("")}
          </div>
        </section>

        <section class="online-section online-match-settings">
          <div class="online-section-heading">
            <div>
              <span class="online-section-kicker">MATCH SETTINGS</span>
              <h2>Game Configuration</h2>
            </div>
          </div>

          <div class="online-setting-panel">
            <div class="online-setting-row">
              <div>
                <strong>Time Control</strong>
                <small>Select your game duration</small>
              </div>
              <select data-field="time">
                ${ONLINE_TIME_CONTROLS.map(time => `
                  <option
                    value="${time.id}"
                    ${time.id === this.selectedTime ? "selected" : ""}
                  >
                    ${time.category} · ${time.label}
                  </option>
                `).join("")}
              </select>
            </div>

            <div class="online-setting-row">
              <div>
                <strong>Preferred Color</strong>
                <small>Choose your chess pieces</small>
              </div>
              <select data-field="color">
                <option value="random">Random</option>
                <option value="white">White</option>
                <option value="black">Black</option>
              </select>
            </div>

            <div class="online-setting-row room-size-setting">
              <div>
                <strong>Room Capacity</strong>
                <small>For private rooms</small>
              </div>
              <select data-field="room-size">
                <option value="2">2 Players</option>
                <option value="4">4 Players</option>
                <option value="6">6 Players</option>
                <option value="8">8 Players</option>
                <option value="10">10 Players</option>
                <option value="12">12 Players</option>
              </select>
            </div>
          </div>
        </section>

        <section class="online-section">
          <div class="online-action-panel">
            <div class="online-action-info">
              <span class="online-section-kicker">READY TO PLAY?</span>
              <h2 data-role="action-title">Find an Opponent</h2>
              <p data-role="action-description">
                Search for a player and start your chess match.
              </p>
            </div>

            <button
              class="online-primary-button"
              type="button"
              data-action="primary"
            >
              <span data-role="primary-label">Find Match</span>
              <span aria-hidden="true"> →</span>
            </button>

            <button
              class="online-cancel-button"
              type="button"
              data-action="cancel-search"
              hidden
            >
              Cancel Search
            </button>
          </div>

          <div class="online-status-message" data-role="status" aria-live="polite"></div>
          <div class="online-error-message" data-role="error" role="alert"></div>
        </section>

        <section class="online-section private-room-section" data-section="private">
          <div class="online-section-heading">
            <div>
              <span class="online-section-kicker">PLAY WITH FRIENDS</span>
              <h2>Private Room</h2>
            </div>
          </div>

          <div class="online-private-grid">
            <div class="online-private-card">
              <span class="online-private-icon">＋</span>
              <h3>Create a Room</h3>
              <p>Generate a private room code and invite friends.</p>
              <button type="button" data-action="create-room">
                Create Room
              </button>
            </div>

            <div class="online-private-card">
              <span class="online-private-icon">⌕</span>
              <h3>Join a Room</h3>
              <p>Enter a room code shared by another player.</p>

              <input
                type="text"
                data-field="room-code"
                placeholder="Enter room code"
                maxlength="16"
                autocomplete="off"
                aria-label="Room code"
              >

              <button type="button" data-action="join-room">
                Join Room
              </button>
            </div>
          </div>
        </section>

        <section class="online-section">
          <div class="online-section-heading">
            <div>
              <span class="online-section-kicker">YOUR CHESS CIRCLE</span>
              <h2>Friends</h2>
            </div>
            <button class="online-text-button" type="button" data-action="refresh-friends">
              Refresh
            </button>
          </div>

          <div class="online-friends-list" data-role="friends">
            <div class="online-empty-state">
              <span>♙</span>
              <p>Loading your friends...</p>
            </div>
          </div>
        </section>

        <footer class="online-footer">
          <span>APPARA CHESS</span>
          <span>THE ROYAL CHESS EXPERIENCE</span>
        </footer>

      </main>
    `;

    this.cacheElements();
    this.updateModeUI();
  }

  cacheElements() {
    this.elements.actionTitle =
      this.container.querySelector('[data-role="action-title"]');

    this.elements.actionDescription =
      this.container.querySelector('[data-role="action-description"]');

    this.elements.primaryLabel =
      this.container.querySelector('[data-role="primary-label"]');

    this.elements.primaryButton =
      this.container.querySelector('[data-action="primary"]');

    this.elements.cancelButton =
      this.container.querySelector('[data-action="cancel-search"]');

    this.elements.status =
      this.container.querySelector('[data-role="status"]');

    this.elements.error =
      this.container.querySelector('[data-role="error"]');

    this.elements.friends =
      this.container.querySelector('[data-role="friends"]');

    this.elements.privateSection =
      this.container.querySelector('[data-section="private"]');

    this.elements.roomCode =
      this.container.querySelector('[data-field="room-code"]');
  }

  bindEvents() {
    this.container.addEventListener("click", event => {
      const modeButton = event.target.closest("[data-mode]");

      if (modeButton) {
        this.selectMode(modeButton.dataset.mode);
        return;
      }

      const actionButton = event.target.closest("[data-action]");

      if (!actionButton) return;

      const action = actionButton.dataset.action;

      switch (action) {
        case "back":
          this.goBack();
          break;

        case "primary":
          this.handlePrimaryAction();
          break;

        case "cancel-search":
          this.cancelSearch();
          break;

        case "create-room":
          this.createPrivateRoom();
          break;

        case "join-room":
          this.joinPrivateRoom();
          break;

        case "refresh-friends":
          this.loadFriends();
          break;

        case "challenge-friend":
          this.challengeFriend(actionButton.dataset.playerId);
          break;

        default:
          break;
      }
    });

    this.container.addEventListener("change", event => {
      const field = event.target.dataset.field;

      if (field === "time") {
        this.selectedTime = event.target.value;
      }

      if (field === "color") {
        this.selectedColor = event.target.value;
      }

      if (field === "room-size") {
        this.selectedRoomSize = Number(event.target.value);
      }
    });
  }

  selectMode(mode) {
    if (!ONLINE_MODES.some(item => item.id === mode)) return;

    if (this.searching) {
      this.cancelSearch();
    }

    this.selectedMode = mode;
    this.clearMessages();
    this.updateModeUI();

    this.container.querySelectorAll("[data-mode]").forEach(button => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  updateModeUI() {
    const privateMode = this.selectedMode === "private";

    if (this.elements.privateSection) {
      this.elements.privateSection.hidden = !privateMode;
    }

    if (!this.elements.actionTitle) return;

    if (this.selectedMode === "ranked") {
      this.elements.actionTitle.textContent = "Find a Ranked Opponent";
      this.elements.actionDescription.textContent =
        "Play competitive chess and improve your rating.";
      this.elements.primaryLabel.textContent = "Find Ranked Match";
    } else if (this.selectedMode === "casual") {
      this.elements.actionTitle.textContent = "Find a Casual Opponent";
      this.elements.actionDescription.textContent =
        "Enjoy a friendly game without rating pressure.";
      this.elements.primaryLabel.textContent = "Find Casual Match";
    } else {
      this.elements.actionTitle.textContent = "Private Chess Room";
      this.elements.actionDescription.textContent =
        "Create a room or join one using a room code.";
      this.elements.primaryLabel.textContent = "Create Private Room";
    }
  }

  async handlePrimaryAction() {
    if (this.loading || this.searching) return;

    if (this.selectedMode === "private") {
      await this.createPrivateRoom();
      return;
    }

    await this.findMatch();
  }

  async findMatch() {
    if (!this.matchmakingService) {
      this.showError("Online matchmaking service is not available.");
      return;
    }

    this.clearMessages();
    this.searching = true;
    this.setLoading(true);
    this.showStatus("Searching for an opponent...");

    try {
      const result = await this.matchmakingService.joinQueue({
        mode: this.selectedMode,
        timeControl: this.selectedTime,
        preferredColor: this.selectedColor
      });

      if (this.destroyed) return;

      if (result?.gameId || result?.matchId) {
        await this.handleMatchFound(result);
        return;
      }

      this.showStatus(
        "You are in the matchmaking queue. Waiting for an opponent..."
      );

      this.subscribeToMatchmaking(result);
    } catch (error) {
      this.searching = false;
      this.setLoading(false);
      this.showError(this.getErrorMessage(error));
    }
  }

  subscribeToMatchmaking(result) {
    if (!this.matchmakingService) return;

    const queueId = result?.queueId || result?.id;

    if (!queueId || typeof this.matchmakingService.onMatchFound !== "function") {
      this.showStatus(
        "Matchmaking request submitted. Waiting for server confirmation..."
      );
      return;
    }

    try {
      this.unsubscribeMatch = this.matchmakingService.onMatchFound(
        queueId,
        match => {
          if (this.destroyed || !match) return;
          this.handleMatchFound(match);
        }
      );
    } catch (error) {
      this.showError(this.getErrorMessage(error));
    }
  }

  async handleMatchFound(match) {
    this.searching = false;
    this.setLoading(false);
    this.showStatus("Opponent found! Preparing your chess board...");

    if (this.unsubscribeMatch) {
      this.unsubscribeMatch();
      this.unsubscribeMatch = null;
    }

    const gameId = match.gameId || match.matchId || match.id;

    if (!gameId) {
      this.showError("The match response did not contain a valid game ID.");
      return;
    }

    if (this.navigation) {
      this.navigation.navigate("game", {
        mode: "online",
        gameId,
        match
      });
    }
  }

  async cancelSearch() {
    if (!this.searching) return;

    this.searching = false;
    this.setLoading(false);

    if (this.unsubscribeMatch) {
      this.unsubscribeMatch();
      this.unsubscribeMatch = null;
    }

    try {
      if (this.matchmakingService?.leaveQueue) {
        await this.matchmakingService.leaveQueue();
      }
    } catch (error) {
      this.showError(this.getErrorMessage(error));
    }

    this.showStatus("Matchmaking search cancelled.");
  }

  async createPrivateRoom() {
    if (!this.matchmakingService) {
      this.showError("Private room service is not available.");
      return;
    }

    if (this.loading) return;

    this.clearMessages();
    this.setLoading(true);
    this.showStatus("Creating your private room...");

    try {
      const result = await this.matchmakingService.createPrivateRoom({
        timeControl: this.selectedTime,
        preferredColor: this.selectedColor,
        maxPlayers: this.selectedRoomSize
      });

      if (this.destroyed) return;

      const roomCode = result?.roomCode || result?.code;

      if (!roomCode) {
        throw new Error("The server did not return a room code.");
      }

      this.roomCode = String(roomCode);

      this.showStatus(`Room created successfully. Code: ${this.roomCode}`);

      this.showRoomCodeModal(this.roomCode, result);
    } catch (error) {
      this.showError(this.getErrorMessage(error));
    } finally {
      this.setLoading(false);
    }
  }

/* =========================================================
   FILE 55A END — PART 1/2
   CLASS CONTINUES IN PART 55B.
   DO NOT CLOSE THE CLASS HERE.
========================================================= */
        
/* =========================================================
   APPARA CHESS — FILE 55B
   SCREEN: ONLINE LOBBY
   PART 2/2 — CONTINUATION
========================================================= */

  joinPrivateRoom() {
    if (!this.matchmakingService) {
      this.showError("Private room service is not available.");
      return;
    }

    if (this.loading) return;

    const code = this.elements.roomCode?.value?.trim();

    if (!code || code.length < 4) {
      this.showError("Please enter a valid room code.");
      return;
    }

    this.clearMessages();
    this.setLoading(true);
    this.showStatus("Joining private room...");

    this.matchmakingService.joinPrivateRoom(code)
      .then(result => {
        if (this.destroyed) return;

        const gameId = result?.gameId || result?.matchId || result?.id;

        if (!gameId) {
          throw new Error("The room response did not contain a valid game ID.");
        }

        this.navigation?.navigate("game", {
          mode: "online",
          gameId,
          roomCode: code,
          match: result
        });
      })
      .catch(error => {
        this.showError(this.getErrorMessage(error));
      })
      .finally(() => {
        this.setLoading(false);
      });
  }

  showRoomCodeModal(code, room) {
    const content = `
      <div class="online-room-created">
        <span class="online-room-created-icon">♔</span>
        <h2>Private Room Created</h2>
        <p>Share this code with your friends.</p>
        <div class="online-room-code">${this.escapeHTML(code)}</div>
        <p class="online-room-note">
          Your room is waiting for players to join.
        </p>
        <button type="button" data-action="copy-room-code">
          Copy Room Code
        </button>
        <button type="button" data-action="open-room">
          Open Room
        </button>
      </div>
    `;

    if (this.modalManager?.open) {
      this.modalManager.open({
        title: "Private Room",
        content
      });
    } else {
      this.showStatus(`Your room code is ${code}. Share it with your friends.`);
    }

    const modal = document.querySelector(".modal");

    if (!modal) return;

    const copyButton = modal.querySelector('[data-action="copy-room-code"]');
    const openButton = modal.querySelector('[data-action="open-room"]');

    copyButton?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code);
        copyButton.textContent = "Copied!";
      } catch {
        this.showStatus(`Room code: ${code}`);
      }
    });

    openButton?.addEventListener("click", () => {
      const gameId = room?.gameId || room?.matchId || room?.id;

      if (gameId) {
        this.navigation?.navigate("game", {
          mode: "online",
          gameId,
          roomCode: code,
          match: room
        });
      } else {
        this.showStatus("Waiting for the room session to become available.");
      }

      this.modalManager?.close?.();
    });
  }

  async loadFriends() {
    if (!this.elements.friends) return;

    if (!this.friendsService) {
      this.renderFriends([]);
      return;
    }

    this.elements.friends.innerHTML = `
      <div class="online-empty-state">
        <span>♙</span>
        <p>Loading friends...</p>
      </div>
    `;

    try {
      let result = [];

      if (typeof this.friendsService.getFriends === "function") {
        result = await this.friendsService.getFriends();
      } else if (typeof this.friendsService.getFriendList === "function") {
        result = await this.friendsService.getFriendList();
      }

      if (this.destroyed) return;

      this.friends = Array.isArray(result)
        ? result
        : Array.isArray(result?.friends)
          ? result.friends
          : [];

      this.renderFriends(this.friends);
    } catch (error) {
      this.renderFriends([]);
      this.showError(this.getErrorMessage(error));
    }
  }

  renderFriends(friends) {
    if (!this.elements.friends) return;

    if (!friends.length) {
      this.elements.friends.innerHTML = `
        <div class="online-empty-state">
          <span>♙</span>
          <h3>No Friends Yet</h3>
          <p>Add friends to challenge them in the online arena.</p>
        </div>
      `;
      return;
    }

    this.elements.friends.innerHTML = friends.map(friend => {
      const playerId = friend.playerId || friend.uid || friend.id || "";
      const name = friend.displayName || friend.name || "Chess Player";
      const online = friend.online === true || friend.status === "online";
      const avatar = friend.avatarURL || friend.photoURL || "";

      return `
        <article class="online-friend-card">
          <div class="online-friend-avatar">
            ${
              avatar
                ? `<img src="${this.escapeHTML(avatar)}" alt="">`
                : `<span>♙</span>`
            }
          </div>

          <div class="online-friend-info">
            <strong>${this.escapeHTML(name)}</strong>
            <small>${online ? "Online" : "Offline"}</small>
          </div>

          <span class="online-friend-dot ${online ? "is-online" : ""}"></span>

          <button
            type="button"
            data-action="challenge-friend"
            data-player-id="${this.escapeHTML(playerId)}"
            ${!online ? "disabled" : ""}
          >
            Challenge
          </button>
        </article>
      `;
    }).join("");
  }

  async challengeFriend(playerId) {
    if (!playerId || !this.matchmakingService) {
      this.showError("Unable to challenge this player.");
      return;
    }

    if (this.loading) return;

    this.clearMessages();
    this.setLoading(true);
    this.showStatus("Sending your challenge...");

    try {
      const result = await this.matchmakingService.createPrivateRoom({
        timeControl: this.selectedTime,
        preferredColor: this.selectedColor,
        maxPlayers: 2,
        invitedPlayerId: playerId
      });

      if (this.destroyed) return;

      this.showStatus("Challenge room created. Waiting for your friend.");

      const gameId = result?.gameId || result?.matchId || result?.id;

      if (gameId) {
        this.navigation?.navigate("game", {
          mode: "online",
          gameId,
          match: result
        });
      }
    } catch (error) {
      this.showError(this.getErrorMessage(error));
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(value) {
    this.loading = Boolean(value);

    if (this.elements.primaryButton) {
      this.elements.primaryButton.disabled = this.loading || this.searching;
    }

    if (this.elements.cancelButton) {
      this.elements.cancelButton.hidden = !this.searching;
    }

    if (this.elements.primaryLabel && !this.searching) {
      this.elements.primaryLabel.textContent = this.loading
        ? "Please Wait..."
        : this.selectedMode === "ranked"
          ? "Find Ranked Match"
          : this.selectedMode === "casual"
            ? "Find Casual Match"
            : "Create Private Room";
    }
  }

  showStatus(message) {
    if (this.elements.status) {
      this.elements.status.textContent = message || "";
    }
  }

  showError(message) {
    if (this.elements.error) {
      this.elements.error.textContent = message || "Something went wrong.";
    }
  }

  clearMessages() {
    this.showStatus("");
    this.showError("");
  }

  getErrorMessage(error) {
    return error?.message || "Unable to complete this action. Please try again.";
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

  goBack() {
    if (this.navigation?.back) {
      this.navigation.back();
    } else if (this.navigation?.navigate) {
      this.navigation.navigate("home");
    }
  }

  destroy() {
    this.destroyed = true;

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }

    if (this.unsubscribeMatch) {
      this.unsubscribeMatch();
      this.unsubscribeMatch = null;
    }

    if (this.unsubscribeFriends) {
      this.unsubscribeFriends();
      this.unsubscribeFriends = null;
    }

    if (this.searching && this.matchmakingService?.leaveQueue) {
      this.matchmakingService.leaveQueue().catch(() => {});
    }

    this.searching = false;
    this.loading = false;
    this.friends = [];

    if (this.container) {
      this.container.innerHTML = "";
    }

    this.elements = {};
  }
}

export function createOnlineScreen(options = {}) {
  return new OnlineScreen(options);
}

/* =========================================================
   FILE 55B END — FILE 55 COMPLETE
   PATH: js/screens/online-screen.js
========================================================= */
                               
