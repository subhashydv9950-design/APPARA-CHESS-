
/* =========================================
   APPARA CHESS
   PART 14 — GAME CONTROLLER
========================================= */

class ApparaChessGame {
  constructor() {
    this.engine = window.apparaChess;
    this.board = window.apparaBoard;
    this.timer = window.apparaTimer;
    this.multiplayer = window.apparaMultiplayer;
    this.sound = window.apparaSound;

    this.selectedSquare = null;
    this.isInitialized = false;
    this.gameMode = "offline";
    this.gamePaused = false;
    this.moveNumber = 0;

    this.init();
  }

  init() {
    if (!this.engine || !this.board || !this.multiplayer) {
      console.error("APPARA CHESS: Required modules are missing.");
      return;
    }

    this.connectBoard();
    this.connectControls();
    this.connectTimer();
    this.refreshInterface();

    this.isInitialized = true;
  }

  /* BOARD INPUT CONNECTION */

  connectBoard() {
    this.board.onSquareClick = (square) => {
      this.handleSquareClick(square);
    };
  }

  handleSquareClick(square) {
    if (this.gamePaused || this.engine.isGameOver()) return;

    const game = this.engine.game;
    const piece = game.get(square);

    if (this.gameMode === "online" &&
        !this.multiplayer.isMyTurn()) {
      return;
    }

    if (!this.selectedSquare) {
      if (piece && piece.color === game.turn()) {
        this.selectSquare(square);
      }
      return;
    }

    if (square === this.selectedSquare) {
      this.clearSelection();
      return;
    }

    if (piece && piece.color === game.turn()) {
      this.selectSquare(square);
      return;
    }

    const from = this.selectedSquare;
    const success = this.multiplayer.playMove(from, square, "q");

    if (success) {
      this.selectedSquare = null;
      this.board.clearSelection();
      this.refreshInterface();
    } else if (piece) {
      this.selectSquare(square);
    }
  }

  selectSquare(square) {
    this.selectedSquare = square;
    this.board.selectSquare(square);
  }

  clearSelection() {
    this.selectedSquare = null;
    this.board.clearSelection();
  }

  /* GAME START METHODS */

  startOffline() {
    this.gameMode = "offline";
    this.gamePaused = false;
    this.selectedSquare = null;

    this.multiplayer.startOffline();

    this.resetGameInterface();
    this.showPage("game-page");
    this.refreshInterface();
  }

  startComputer(difficulty = "medium", playerColor = "w") {
    this.gameMode = "computer";
    this.gamePaused = false;
    this.selectedSquare = null;

    if (window.apparaAI) {
      window.apparaAI.setDifficulty?.(difficulty);
    }

    this.multiplayer.startComputer(difficulty, playerColor);

    this.resetGameInterface();
    this.showPage("game-page");
    this.refreshInterface();
  }

  async createOnlineMatch() {
    this.gameMode = "online";
    this.gamePaused = false;

    const result = await this.multiplayer.createOnlineMatch();

    if (result) {
      this.resetGameInterface();
      this.showPage("game-page");
      this.refreshInterface();
    }

    return result;
  }

  async joinOnlineMatch(roomCode) {
    this.gameMode = "online";
    this.gamePaused = false;

    const result = await this.multiplayer.joinOnlineMatch(roomCode);

    if (result) {
      this.resetGameInterface();
      this.showPage("game-page");
      this.refreshInterface();
    }

    return result;
  }

  resetGameInterface() {
    this.selectedSquare = null;
    this.moveNumber = 0;

    if (this.board) {
      this.board.clearSelection();
      this.board.render();
    }

    this.refreshHistory();
    this.refreshStatus();
    this.refreshClocks();
  }

  /* MOVE HISTORY */

  refreshHistory() {
    const container = document.getElementById("move-history");
    if (!container) return;

    const history = this.engine.getHistory();
    container.innerHTML = "";

    if (!history.length) {
      container.innerHTML =
        '<div class="empty-history">Moves will appear here</div>';
      return;
    }

    for (let i = 0; i < history.length; i += 2) {
      const row = document.createElement("div");
      row.className = "move-row";

      const number = document.createElement("span");
      number.className = "move-number";
      number.textContent = `${Math.floor(i / 2) + 1}.`;

      const white = document.createElement("span");
      white.className = "move-white";
      white.textContent = history[i]?.san || "";

      const black = document.createElement("span");
      black.className = "move-black";
      black.textContent = history[i + 1]?.san || "";

      row.append(number, white, black);
      container.appendChild(row);
    }

    container.scrollTop = container.scrollHeight;
  }

  /* STATUS */

  refreshStatus() {
    const statusElement = document.getElementById("game-status");
    if (!statusElement) return;

    const game = this.engine.game;

    if (game.in_checkmate()) {
      statusElement.textContent =
        `Checkmate! ${game.turn() === "w" ? "Black" : "White"} wins`;
    } else if (game.in_stalemate()) {
      statusElement.textContent = "Draw — Stalemate";
    } else if (game.in_draw()) {
      statusElement.textContent = "Game drawn";
    } else if (game.in_check()) {
      statusElement.textContent =
        `${game.turn() === "w" ? "White" : "Black"} is in check`;
    } else {
      statusElement.textContent =
        `${game.turn() === "w" ? "White" : "Black"} to move`;
    }
  }

  refreshClocks() {
    if (!this.timer) return;

    this.timer.updateDisplay?.();
  }

  refreshInterface() {
    this.board?.render();
    this.refreshHistory();
    this.refreshStatus();
    this.refreshClocks();
  }

  /* GAME CONTROLS */

  connectControls() {
    this.bindClick("undo-btn", () => this.undoMove());
    this.bindClick("flip-board-btn", () => this.flipBoard());
    this.bindClick("draw-btn", () => this.offerDraw());
    this.bindClick("resign-btn", () => this.resign());
    this.bindClick("pause-btn", () => this.togglePause());

    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.mode;

        if (mode === "offline") this.startOffline();
        if (mode === "computer") this.startComputer();
        if (mode === "online") this.showPage("online-page");
        if (mode === "training") this.showPage("training-page");
      });
    });
  }

  bindClick(id, callback) {
    const element = document.getElementById(id);
    if (element) element.addEventListener("click", callback);
  }

  undoMove() {
    if (this.gameMode === "online") {
      this.notify("Undo is not available in this online match.");
      return;
    }

    const result = this.multiplayer.undoMove();

    if (result) {
      this.clearSelection();
      this.refreshInterface();
    }
  }

  flipBoard() {
    this.board?.flip();
  }

  offerDraw() {
    if (this.engine.isGameOver()) return;

    if (this.gameMode === "online") {
      this.notify("Online draw offers will be available after room integration.");
      return;
    }

    const confirmed = window.confirm("End this game as a draw?");
    if (confirmed) {
      this.multiplayer.endGame?.("draw");
      this.refreshInterface();
    }
  }

  resign() {
    if (this.engine.isGameOver()) return;

    const confirmed = window.confirm("Are you sure you want to resign?");
    if (!confirmed) return;

    this.multiplayer.resign();
    this.refreshInterface();
  }

  togglePause() {
    if (this.engine.isGameOver()) return;

    this.gamePaused = !this.gamePaused;

    if (this.gamePaused) {
      this.timer?.pause();
      this.notify("Game paused");
    } else {
      this.timer?.resume();
      this.notify("Game resumed");
    }

    const button = document.getElementById("pause-btn");
    if (button) {
      button.textContent = this.gamePaused ? "Resume" : "Pause";
    }
  }

  /* TIMER CONNECTION */

  connectTimer() {
    if (!this.timer) return;

    this.timer.onTimeout = (color) => {
      this.notify(
        `${color === "w" ? "White" : "Black"} ran out of time`
      );

      this.multiplayer.endGame?.(
        color === "w" ? "black-timeout" : "white-timeout"
      );

      this.refreshInterface();
    };
  }

  /* NAVIGATION */

  showPage(pageId) {
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
    });

    const target = document.getElementById(pageId);
    if (target) target.classList.add("active");

    document.querySelectorAll("[data-page]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.page === pageId
      );
    });
  }

  notify(message) {
    if (window.apparaApp?.showNotification) {
      window.apparaApp.showNotification(message);
      return;
    }

    console.log("[APPARA CHESS]", message);
  }

  /* PUBLIC REFRESH */

  onMoveCompleted() {
    this.clearSelection();
    this.refreshInterface();
  }

  destroy() {
    this.timer?.stop();
    this.selectedSquare = null;
    this.isInitialized = false;
  }
}

/* GLOBAL INSTANCE */

window.apparaGame = new ApparaChessGame();

/* PART 14 END */
