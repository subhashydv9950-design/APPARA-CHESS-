/* =========================================================
   APPARA CHESS
   FILE 54A: GAME SCREEN — PART 1/3
   Path: js/screens/game-screen.js
   ========================================================= */

const PIECE_SYMBOLS = {
  w: {
    k: "♔",
    q: "♕",
    r: "♖",
    b: "♗",
    n: "♘",
    p: "♙"
  },
  b: {
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟"
  }
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const DEFAULT_CLOCKS = [
  { id: "1+0", label: "Bullet 1+0", minutes: 1, increment: 0 },
  { id: "2+1", label: "Bullet 2+1", minutes: 2, increment: 1 },
  { id: "3+0", label: "Blitz 3+0", minutes: 3, increment: 0 },
  { id: "3+2", label: "Blitz 3+2", minutes: 3, increment: 2 },
  { id: "5+0", label: "Blitz 5+0", minutes: 5, increment: 0 },
  { id: "5+3", label: "Blitz 5+3", minutes: 5, increment: 3 },
  { id: "10+0", label: "Rapid 10+0", minutes: 10, increment: 0 },
  { id: "10+5", label: "Rapid 10+5", minutes: 10, increment: 5 },
  { id: "15+10", label: "Rapid 15+10", minutes: 15, increment: 10 },
  { id: "30+0", label: "Classical 30+0", minutes: 30, increment: 0 }
];

export class GameScreen {
  constructor(options = {}) {
    this.document = options.document || document;
    this.container = options.container || null;

    this.navigation = options.navigation || null;
    this.gameState = options.gameState || null;
    this.chessClock = options.chessClock || null;
    this.aiEngine = options.aiEngine || null;
    this.onlineGameService = options.onlineGameService || null;
    this.playerService = options.playerService || null;
    this.modalManager = options.modalManager || null;
    this.renderer = options.renderer || null;

    this.mode = options.mode || "offline";
    this.difficulty = options.difficulty || "medium";
    this.playerColor = options.playerColor || "white";
    this.timeControl = options.timeControl || DEFAULT_CLOCKS[6];

    this.selectedSquare = null;
    this.legalTargets = [];
    this.orientation = this.playerColor === "black" ? "black" : "white";

    this.isPaused = false;
    this.isGameOver = false;
    this.isThinking = false;
    this.destroyed = false;

    this.moveHistory = [];
    this.lastMove = null;
    this.clockInterval = null;
    this.unsubscribe = [];

    this.whiteTime = this.timeControl.minutes * 60;
    this.blackTime = this.timeControl.minutes * 60;

    this.playerName = "You";
    this.opponentName = this.mode === "online" ? "Opponent" : "APPARA AI";

    this.root = null;
    this.boardElement = null;
    this.historyElement = null;
    this.statusElement = null;
    this.whiteClockElement = null;
    this.blackClockElement = null;
  }

  mount(container = this.container) {
    if (!container) {
      throw new Error("GameScreen requires a container element.");
    }

    this.container = container;
    this.destroyed = false;

    this.render();
    this.bindEvents();
    this.renderBoard();
    this.updateClockDisplay();
    this.startClock();

    return this.root;
  }

  render() {
    const doc = this.document;

    this.root = doc.createElement("section");
    this.root.className = "ac-game-screen";
    this.root.innerHTML = `
      <header class="ac-game-topbar">
        <button class="ac-game-back" data-action="back" aria-label="Back">
          <span>‹</span>
        </button>

        <div class="ac-game-heading">
          <span class="ac-game-eyebrow">APPARA CHESS ARENA</span>
          <h1>Chess Match</h1>
        </div>

        <button class="ac-game-menu" data-action="pause">
          <span>Ⅱ</span>
          <span>Pause</span>
        </button>
      </header>

      <div class="ac-game-layout">
        <main class="ac-game-main">

          <section class="ac-player-card ac-opponent-card">
            <div class="ac-player-avatar">♟</div>
            <div class="ac-player-info">
              <strong class="ac-opponent-name"></strong>
              <span class="ac-opponent-label">Opponent</span>
            </div>
            <div class="ac-game-clock" data-clock="black">10:00</div>
          </section>

          <div class="ac-board-frame">
            <div class="ac-board-coordinates ac-coordinates-top"></div>
            <div class="ac-board-with-files">
              <div class="ac-board-coordinates ac-coordinates-left"></div>
              <div class="ac-chess-board" role="grid" aria-label="Chess board"></div>
              <div class="ac-board-coordinates ac-coordinates-right"></div>
            </div>
            <div class="ac-board-coordinates ac-coordinates-bottom"></div>
          </div>

          <section class="ac-player-card ac-own-card">
            <div class="ac-player-avatar">♔</div>
            <div class="ac-player-info">
              <strong class="ac-player-name"></strong>
              <span class="ac-player-label">Your side</span>
            </div>
            <div class="ac-game-clock" data-clock="white">10:00</div>
          </section>

          <div class="ac-game-status" aria-live="polite">
            <span class="ac-status-dot"></span>
            <span class="ac-status-text">Your move</span>
          </div>
        </main>

        <aside class="ac-game-sidebar">
          <section class="ac-game-panel">
            <div class="ac-panel-heading">
              <h2>Move History</h2>
              <span class="ac-move-count">0 moves</span>
            </div>
            <div class="ac-move-history">
              <div class="ac-history-empty">
                Moves will appear here
              </div>
            </div>
          </section>

          <section class="ac-game-panel ac-game-actions">
            <h2>Game Controls</h2>

            <button data-action="undo" class="ac-control-button">
              <span>↶</span> Undo Move
            </button>

            <button data-action="flip" class="ac-control-button">
              <span>⇅</span> Flip Board
            </button>

            <button data-action="draw" class="ac-control-button">
              <span>＝</span> Offer Draw
            </button>

            <button data-action="resign" class="ac-control-button ac-danger-button">
              <span>⚑</span> Resign
            </button>
          </section>

          <section class="ac-game-panel ac-game-options">
            <h2>Match Details</h2>
            <div class="ac-detail-row">
              <span>Mode</span>
              <strong class="ac-mode-label"></strong>
            </div>
            <div class="ac-detail-row">
              <span>Time Control</span>
              <strong class="ac-time-label"></strong>
            </div>
            <div class="ac-detail-row">
              <span>Your Color</span>
              <strong class="ac-color-label"></strong>
            </div>
          </section>
        </aside>
      </div>

      <div class="ac-game-overlay" hidden>
        <div class="ac-game-overlay-card">
          <span class="ac-overlay-icon">Ⅱ</span>
          <h2 class="ac-overlay-title">Game Paused</h2>
          <p class="ac-overlay-description">Take your time.</p>
          <button class="ac-overlay-primary" data-action="resume">
            Resume Game
          </button>
          <button class="ac-overlay-secondary" data-action="exit">
            Exit Game
          </button>
        </div>
      </div>
    `;

    this.container.replaceChildren(this.root);

    this.boardElement = this.root.querySelector(".ac-chess-board");
    this.historyElement = this.root.querySelector(".ac-move-history");
    this.statusElement = this.root.querySelector(".ac-status-text");

    this.whiteClockElement = this.root.querySelector('[data-clock="white"]');
    this.blackClockElement = this.root.querySelector('[data-clock="black"]');

    this.root.querySelector(".ac-opponent-name").textContent = this.opponentName;
    this.root.querySelector(".ac-player-name").textContent = this.playerName;

    this.root.querySelector(".ac-mode-label").textContent =
      this.mode === "online" ? "Online" : "Offline";

    this.root.querySelector(".ac-time-label").textContent =
      this.timeControl.label;

    this.root.querySelector(".ac-color-label").textContent =
      this.orientation === "white" ? "White" : "Black";

    this.renderCoordinates();
  }

  bindEvents() {
    this.handleClick = (event) => {
      const actionButton = event.target.closest("[data-action]");

      if (actionButton && this.root.contains(actionButton)) {
        this.handleAction(actionButton.dataset.action);
        return;
      }

      const square = event.target.closest("[data-square]");

      if (square && this.boardElement.contains(square)) {
        this.handleSquareClick(square.dataset.square);
      }
    };

    this.root.addEventListener("click", this.handleClick);

    this.unsubscribe.push(() => {
      this.root?.removeEventListener("click", this.handleClick);
    });

    if (this.gameState?.on) {
      const unsubscribe = this.gameState.on("change", () => {
        this.renderBoard();
        this.renderHistory();
      });

      if (typeof unsubscribe === "function") {
        this.unsubscribe.push(unsubscribe);
      }
    }
  }

  handleAction(action) {
    if (action === "back") {
      this.goBack();
      return;
    }

    if (action === "pause") {
      this.pause();
      return;
    }

    if (action === "resume") {
      this.resume();
      return;
    }

    if (action === "exit") {
      this.goBack();
      return;
    }

    if (action === "flip") {
      this.flipBoard();
      return;
    }

    if (action === "undo") {
      this.undoMove();
      return;
    }

    if (action === "draw") {
      this.offerDraw();
      return;
    }

    if (action === "resign") {
      this.resign();
    }
  }

  getSnapshot() {
    if (this.gameState?.getSnapshot) {
      return this.gameState.getSnapshot();
    }

    return null;
  }

  getFEN() {
    if (this.gameState?.getFEN) {
      return this.gameState.getFEN();
    }

    const snapshot = this.getSnapshot();
    return snapshot?.fen || snapshot?.position || null;
  }

  parseFEN(fen) {
    const board = Array.from({ length: 8 }, () =>
      Array(8).fill(null)
    );

    if (!fen || typeof fen !== "string") {
      return board;
    }

    const rows = fen.trim().split(/\s+/)[0].split("/");

    if (rows.length !== 8) {
      return board;
    }

    rows.forEach((row, rank) => {
      let file = 0;

      for (const character of row) {
        if (/\d/.test(character)) {
          file += Number(character);
          continue;
        }

        if (file >= 8) break;

        const color = character === character.toUpperCase() ? "w" : "b";

        board[rank][file] = {
          color,
          type: character.toLowerCase()
        };

        file += 1;
      }
    });

    return board;
  }

  getBoardPosition() {
    const snapshot = this.getSnapshot();

    if (snapshot?.board && Array.isArray(snapshot.board)) {
      return snapshot.board;
    }

    return this.parseFEN(this.getFEN());
  }

  renderBoard() {
    if (!this.boardElement) return;

    const board = this.getBoardPosition();
    const fragment = this.document.createDocumentFragment();

    this.boardElement.replaceChildren();

    for (let displayRank = 0; displayRank < 8; displayRank += 1) {
      for (let displayFile = 0; displayFile < 8; displayFile += 1) {
        const rank = this.orientation === "white"
          ? displayRank
          : 7 - displayRank;

        const file = this.orientation === "white"
          ? displayFile
          : 7 - displayFile;

        const squareName = `${FILES[file]}${8 - rank}`;
        const piece = board[rank]?.[file] || null;

        const square = this.document.createElement("button");
        square.type = "button";
        square.className = "ac-board-square";
        square.dataset.square = squareName;
        square.setAttribute("role", "gridcell");
        square.setAttribute("aria-label", squareName);

        const isLight = (rank + file) % 2 === 0;
        square.classList.add(isLight ? "light-square" : "dark-square");

        if (this.selectedSquare === squareName) {
          square.classList.add("selected");
        }

        if (this.legalTargets.includes(squareName)) {
          square.classList.add("legal-target");
        }

        if (
          this.lastMove &&
          (this.lastMove.from === squareName || this.lastMove.to === squareName)
        ) {
          square.classList.add("last-move");
        }

        if (piece) {
          const pieceElement = this.document.createElement("span");
          pieceElement.className = `ac-chess-piece ${piece.color === "w" ? "white-piece" : "black-piece"}`;
          pieceElement.textContent = PIECE_SYMBOLS[piece.color]?.[piece.type] || "";
          square.appendChild(pieceElement);
        }

        fragment.appendChild(square);
      }
    }

    this.boardElement.appendChild(fragment);
    this.renderCoordinates();
  }

/* ================= FILE 54A END ================= */
/* PART 1/3 COMPLETE — CLASS CONTINUES IN PART 2 */

/* =========================================================
   APPARA CHESS
   FILE 54B: GAME SCREEN — PART 2/3
   Continue inside GameScreen class
   ========================================================= */

  renderCoordinates() {
    if (!this.root) return;

    const files = this.orientation === "white"
      ? FILES
      : [...FILES].reverse();

    const ranks = this.orientation === "white"
      ? ["8", "7", "6", "5", "4", "3", "2", "1"]
      : ["1", "2", "3", "4", "5", "6", "7", "8"];

    const top = this.root.querySelector(".ac-coordinates-top");
    const bottom = this.root.querySelector(".ac-coordinates-bottom");
    const left = this.root.querySelector(".ac-coordinates-left");
    const right = this.root.querySelector(".ac-coordinates-right");

    if (!top || !bottom || !left || !right) return;

    top.textContent = files.join(" ");
    bottom.textContent = files.join(" ");
    left.textContent = ranks.join(" ");
    right.textContent = ranks.join(" ");
  }

  handleSquareClick(square) {
    if (this.isPaused || this.isGameOver || this.isThinking) return;

    if (this.mode === "online" && this.isOpponentTurn()) return;

    if (this.selectedSquare && this.legalTargets.includes(square)) {
      this.makeMove(this.selectedSquare, square);
      return;
    }

    const piece = this.getPieceAt(square);

    if (!piece) {
      this.clearSelection();
      return;
    }

    const playerColor = this.orientation === "white" ? "w" : "b";

    if (piece.color !== playerColor) {
      this.clearSelection();
      return;
    }

    this.selectedSquare = square;
    this.legalTargets = this.getLegalTargets(square);
    this.renderBoard();
  }

  getPieceAt(square) {
    const board = this.getBoardPosition();
    const file = FILES.indexOf(square[0]);
    const rank = 8 - Number(square[1]);

    return board[rank]?.[file] || null;
  }

  getLegalTargets(square) {
    if (this.gameState?.getLegalMoves) {
      const moves = this.gameState.getLegalMoves(square);

      if (Array.isArray(moves)) {
        return moves.map((move) => {
          if (typeof move === "string") return move.slice(2, 4);
          return move.to || move.destination || "";
        }).filter(Boolean);
      }
    }

    if (this.gameState?.getMovesFrom) {
      const moves = this.gameState.getMovesFrom(square);

      if (Array.isArray(moves)) {
        return moves.map((move) => move.to || move.destination).filter(Boolean);
      }
    }

    return [];
  }

  async makeMove(from, to) {
    if (!this.gameState?.makeMove) {
      this.setStatus("Game engine is not connected");
      return false;
    }

    try {
      const move = { from, to, promotion: "q" };
      const result = await this.gameState.makeMove(move);

      if (result === false || result?.success === false) {
        this.setStatus("Illegal move");
        this.clearSelection();
        return false;
      }

      this.lastMove = { from, to };
      this.moveHistory.push({ from, to, timestamp: Date.now() });

      this.clearSelection();
      this.renderBoard();
      this.renderHistory();

      this.addClockIncrement();
      this.checkGameStatus();

      if (this.mode === "offline" && !this.isGameOver) {
        await this.makeAIMove();
      }

      return true;
    } catch (error) {
      console.error("APPARA CHESS move error:", error);
      this.setStatus("Move could not be completed");
      this.clearSelection();
      return false;
    }
  }

  async makeAIMove() {
    if (!this.aiEngine || this.isGameOver || this.isPaused) return;

    this.isThinking = true;
    this.setStatus("APPARA AI is thinking...");

    try {
      const result = await this.aiEngine.getBestMove?.(
        this.getFEN(),
        this.difficulty
      );

      if (!result || this.isGameOver || this.isPaused) return;

      const move = typeof result === "string"
        ? {
            from: result.slice(0, 2),
            to: result.slice(2, 4),
            promotion: result[4] || "q"
          }
        : result;

      if (move?.from && move?.to) {
        await this.gameState.makeMove(move);
        this.lastMove = { from: move.from, to: move.to };
        this.moveHistory.push({
          from: move.from,
          to: move.to,
          timestamp: Date.now()
        });

        this.renderBoard();
        this.renderHistory();
        this.checkGameStatus();
      }
    } catch (error) {
      console.error("APPARA CHESS AI error:", error);
      this.setStatus("AI move could not be completed");
    } finally {
      this.isThinking = false;

      if (!this.isGameOver) {
        this.setStatus("Your move");
      }
    }
  }

  clearSelection() {
    this.selectedSquare = null;
    this.legalTargets = [];
    this.renderBoard();
  }

  renderHistory() {
    if (!this.historyElement) return;

    if (!this.moveHistory.length) {
      this.historyElement.innerHTML =
        '<div class="ac-history-empty">Moves will appear here</div>';
    } else {
      this.historyElement.replaceChildren();

      for (let index = 0; index < this.moveHistory.length; index += 2) {
        const row = this.document.createElement("div");
        row.className = "ac-history-row";

        const number = this.document.createElement("span");
        number.className = "ac-history-number";
        number.textContent = `${Math.floor(index / 2) + 1}.`;

        const whiteMove = this.document.createElement("span");
        whiteMove.textContent = this.formatMove(this.moveHistory[index]);

        const blackMove = this.document.createElement("span");
        blackMove.textContent = this.moveHistory[index + 1]
          ? this.formatMove(this.moveHistory[index + 1])
          : "—";

        row.append(number, whiteMove, blackMove);
        this.historyElement.appendChild(row);
      }
    }

    const count = this.root?.querySelector(".ac-move-count");

    if (count) {
      count.textContent = `${this.moveHistory.length} plies`;
    }
  }

  formatMove(move) {
    return `${move.from}–${move.to}`;
  }

  startClock() {
    if (this.clockInterval || this.destroyed) return;

    this.clockInterval = setInterval(() => {
      if (this.isPaused || this.isGameOver) return;

      const activeColor = this.getActiveColor();

      if (activeColor === "w") {
        this.whiteTime = Math.max(0, this.whiteTime - 1);
      } else {
        this.blackTime = Math.max(0, this.blackTime - 1);
      }

      this.updateClockDisplay();

      if (this.whiteTime <= 0 || this.blackTime <= 0) {
        this.handleTimeout(activeColor);
      }
    }, 1000);
  }

  getActiveColor() {
    const snapshot = this.getSnapshot();

    if (snapshot?.turn === "b" || snapshot?.turn === "black") return "b";
    if (snapshot?.turn === "w" || snapshot?.turn === "white") return "w";

    return this.moveHistory.length % 2 === 0 ? "w" : "b";
  }

  isOpponentTurn() {
    const active = this.getActiveColor();
    const player = this.orientation === "white" ? "w" : "b";

    return active !== player;
  }

  addClockIncrement() {
    const previousColor = this.getActiveColor() === "w" ? "b" : "w";
    const increment = this.timeControl.increment || 0;

    if (previousColor === "w") {
      this.whiteTime += increment;
    } else {
      this.blackTime += increment;
    }

    this.updateClockDisplay();
  }

  updateClockDisplay() {
    if (this.whiteClockElement) {
      this.whiteClockElement.textContent = this.formatTime(this.whiteTime);
    }

    if (this.blackClockElement) {
      this.blackClockElement.textContent = this.formatTime(this.blackTime);
    }

    this.whiteClockElement?.classList.toggle("clock-low", this.whiteTime <= 30);
    this.blackClockElement?.classList.toggle("clock-low", this.blackTime <= 30);
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  }

/* ================= FILE 54B END ================= */
/* PART 2/3 COMPLETE — CLASS CONTINUES IN PART 3 */

/* =========================================================
   APPARA CHESS
   FILE 54C: GAME SCREEN — PART 3/3
   Final continuation and class closing
   ========================================================= */

  handleTimeout(activeColor) {
    if (this.isGameOver) return;

    this.isGameOver = true;
    this.stopClock();

    const winner = activeColor === "w" ? "Black" : "White";
    this.setStatus(`${winner} wins on time`);
    this.showResult("Time Out", `${winner} wins on time.`);
  }

  checkGameStatus() {
    const status = this.gameState?.getGameStatus?.();

    if (!status) return;

    const gameOver = status.isGameOver || status.gameOver;

    if (gameOver) {
      this.isGameOver = true;
      this.stopClock();

      const message =
        status.message ||
        status.reason ||
        status.result ||
        "The game has ended.";

      this.setStatus(message);
      this.showResult("Game Over", message);
      return;
    }

    if (status.inCheck || status.isCheck) {
      this.setStatus("Check!");
    } else {
      this.setStatus(this.isOpponentTurn() ? "Opponent's move" : "Your move");
    }
  }

  setStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
    }
  }

  pause() {
    if (this.isGameOver) return;

    this.isPaused = true;

    const overlay = this.root?.querySelector(".ac-game-overlay");

    if (overlay) overlay.hidden = false;

    this.setStatus("Game paused");
  }

  resume() {
    if (this.isGameOver) return;

    this.isPaused = false;

    const overlay = this.root?.querySelector(".ac-game-overlay");

    if (overlay) overlay.hidden = true;

    this.setStatus("Game resumed");
  }

  flipBoard() {
    this.orientation = this.orientation === "white" ? "black" : "white";

    const colorLabel = this.root?.querySelector(".ac-color-label");

    if (colorLabel) {
      colorLabel.textContent =
        this.orientation === "white" ? "White" : "Black";
    }

    this.clearSelection();
  }

  async undoMove() {
    if (this.isGameOver || this.mode === "online") {
      this.setStatus("Undo is unavailable in this match");
      return false;
    }

    if (!this.gameState?.undoMove) {
      this.setStatus("Undo is not supported");
      return false;
    }

    try {
      const result = await this.gameState.undoMove();

      if (result === false) return false;

      this.moveHistory.splice(-1, 1);
      this.lastMove = this.moveHistory.length
        ? this.moveHistory[this.moveHistory.length - 1]
        : null;

      this.clearSelection();
      this.renderHistory();
      this.setStatus("Move undone");

      return true;
    } catch (error) {
      console.error("APPARA CHESS undo error:", error);
      this.setStatus("Unable to undo move");
      return false;
    }
  }

  async offerDraw() {
    if (this.mode === "online" && this.onlineGameService?.offerDraw) {
      try {
        await this.onlineGameService.offerDraw();
        this.setStatus("Draw offer sent");
      } catch (error) {
        this.setStatus("Could not send draw offer");
      }

      return;
    }

    this.setStatus("Draw offers are available in online matches");
  }

  async resign() {
    const confirmed = await this.confirmAction(
      "Resign Game",
      "Are you sure you want to resign this match?"
    );

    if (!confirmed) return;

    this.isGameOver = true;
    this.stopClock();

    if (this.mode === "online" && this.onlineGameService?.resign) {
      try {
        await this.onlineGameService.resign();
      } catch (error) {
        console.error("APPARA CHESS resign error:", error);
      }
    }

    this.showResult("You Resigned", "This match has ended.");
  }

  async confirmAction(title, message) {
    if (this.modalManager?.confirm) {
      return this.modalManager.confirm({
        title,
        message,
        confirmText: "Confirm",
        cancelText: "Cancel"
      });
    }

    return this.document.defaultView.confirm(`${title}\n${message}`);
  }

  showResult(title, message) {
    if (this.modalManager?.alert) {
      this.modalManager.alert({
        title,
        message,
        buttonText: "Continue"
      });
    } else {
      this.document.defaultView.alert(`${title}\n${message}`);
    }
  }

  goBack() {
    this.stopClock();

    if (this.navigation?.back) {
      this.navigation.back();
    } else if (this.navigation?.navigate) {
      this.navigation.navigate("home");
    }
  }

  stopClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  destroy() {
    this.destroyed = true;
    this.stopClock();

    for (const unsubscribe of this.unsubscribe) {
      try {
        unsubscribe();
      } catch (error) {
        console.warn("GameScreen cleanup warning:", error);
      }
    }

    this.unsubscribe = [];

    if (this.renderer?.dispose) {
      this.renderer.dispose();
    }

    this.root?.remove();
    this.root = null;
    this.boardElement = null;
  }
}

export function createGameScreen(options = {}) {
  return new GameScreen(options);
}

/* ================= FILE 54C END ================= */
/* FILE 54 COMPLETE — ALL THREE PARTS JOINED */
