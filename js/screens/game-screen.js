/* =========================================================
   APPARA CHESS
   FILE 54: GAME SCREEN
   Path: js/screens/game-screen.js
   PURPOSE: Main Chess Match Interface
   PART 1/4
   ========================================================= */

const PIECE_SYMBOLS = {
  w: {
    k: "♔", q: "♕", r: "♖",
    b: "♗", n: "♘", p: "♙"
  },
  b: {
    k: "♚", q: "♛", r: "♜",
    b: "♝", n: "♞", p: "♟"
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

    this.orientation = this.playerColor === "black"
      ? "black"
      : "white";

    this.isPaused = false;
    this.isGameOver = false;
    this.isThinking = false;
    this.moveInProgress = false;
    this.destroyed = false;

    this.moveHistory = [];
    this.lastMove = null;

    this.clockInterval = null;
    this.unsubscribe = [];

    const initialSeconds =
      Math.max(1, Number(this.timeControl.minutes) || 10) * 60;

    this.whiteTime = initialSeconds;
    this.blackTime = initialSeconds;

    this.playerName = options.playerName || "You";

    this.opponentName = options.opponentName ||
      (this.mode === "online" ? "Opponent" : "APPARA AI");

    this.root = null;
    this.boardElement = null;
    this.historyElement = null;
    this.statusElement = null;
    this.whiteClockElement = null;
    this.blackClockElement = null;
  }


  /* -------------------------------------------------------
     1. MOUNT
  ------------------------------------------------------- */

  mount(container = this.container) {

    if (!container) {
      throw new Error("GameScreen requires a container element.");
    }

    this.container = container;
    this.destroyed = false;

    this.render();
    this.bindEvents();

    this.rebuildHistoryFromGameState();
    this.renderBoard();
    this.renderHistory();

    this.updateClockDisplay();
    this.checkGameStatus();
    this.startClock();

    return this.root;
  }


  /* -------------------------------------------------------
     2. MAIN INTERFACE
  ------------------------------------------------------- */

  render() {

    const doc = this.document;

    this.root = doc.createElement("section");
    this.root.className = "ac-game-screen";

    this.root.innerHTML = `
      <header class="ac-game-topbar">

        <button class="ac-game-back"
          data-action="back"
          aria-label="Back">
          <span>‹</span>
        </button>

        <div class="ac-game-heading">
          <span class="ac-game-eyebrow">
            APPARA CHESS ARENA
          </span>
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

            <div class="ac-game-clock" data-clock="black">
              10:00
            </div>

          </section>

          <div class="ac-board-frame">

            <div class="ac-board-coordinates ac-coordinates-top"></div>

            <div class="ac-board-with-files">

              <div class="ac-board-coordinates ac-coordinates-left"></div>

              <div class="ac-chess-board"
                role="grid"
                aria-label="Chess board">
              </div>

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

            <div class="ac-game-clock" data-clock="white">
              10:00
            </div>

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

            <button data-action="resign"
              class="ac-control-button ac-danger-button">
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

          <p class="ac-overlay-description">
            Take your time.
          </p>

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

    this.whiteClockElement =
      this.root.querySelector('[data-clock="white"]');

    this.blackClockElement =
      this.root.querySelector('[data-clock="black"]');

    this.root.querySelector(".ac-opponent-name").textContent =
      this.opponentName;

    this.root.querySelector(".ac-player-name").textContent =
      this.playerName;

    this.root.querySelector(".ac-mode-label").textContent =
      this.mode === "online" ? "Online" : "Offline";

    this.root.querySelector(".ac-time-label").textContent =
      this.timeControl.label || "10+0";

    this.root.querySelector(".ac-color-label").textContent =
      this.orientation === "white" ? "White" : "Black";

    this.renderCoordinates();
  }
   
  /* -------------------------------------------------------
     3. EVENT BINDING
  ------------------------------------------------------- */

  bindEvents() {

    this.handleClick = event => {

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

        if (this.destroyed) return;

        this.syncFromGameState();
      });

      if (typeof unsubscribe === "function") {
        this.unsubscribe.push(unsubscribe);
      }
    }
  }


  /* -------------------------------------------------------
     4. ACTION ROUTER
  ------------------------------------------------------- */

  handleAction(action) {

    switch (action) {

      case "back":
      case "exit":
        this.goBack();
        break;

      case "pause":
        this.pause();
        break;

      case "resume":
        this.resume();
        break;

      case "flip":
        this.flipBoard();
        break;

      case "undo":
        this.undoMove();
        break;

      case "draw":
        this.offerDraw();
        break;

      case "resign":
        this.resign();
        break;
    }
  }


  /* -------------------------------------------------------
     5. GAME SNAPSHOT
  ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     6. FEN PARSER
  ------------------------------------------------------- */

  parseFEN(fen) {

    const board = Array.from(
      { length: 8 },
      () => Array(8).fill(null)
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

        const color =
          character === character.toUpperCase() ? "w" : "b";

        board[rank][file] = {
          color,
          type: character.toLowerCase()
        };

        file += 1;
      }
    });

    return board;
  }


  /* -------------------------------------------------------
     7. GET RAW 8x8 BOARD
  ------------------------------------------------------- */

  getBoardPosition() {

    // Preferred: GameSessionState.getBoard() returns raw 8x8.
    if (this.gameState?.getBoard) {

      const directBoard = this.gameState.getBoard();

      if (
        Array.isArray(directBoard) &&
        directBoard.length === 8 &&
        directBoard.every(row => Array.isArray(row) && row.length === 8)
      ) {
        return directBoard;
      }
    }

    const snapshot = this.getSnapshot();

    // Some snapshots wrap the raw board inside board.board.
    if (
      Array.isArray(snapshot?.board?.board) &&
      snapshot.board.board.length === 8
    ) {
      return snapshot.board.board;
    }

    // Fallback: reconstruct from FEN.
    return this.parseFEN(this.getFEN());
  }


  /* -------------------------------------------------------
     8. RENDER 2D BOARD
  ------------------------------------------------------- */

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

        square.classList.add(
          isLight ? "light-square" : "dark-square"
        );

        if (this.selectedSquare === squareName) {
          square.classList.add("selected");
        }

        if (this.legalTargets.includes(squareName)) {
          square.classList.add("legal-target");
        }

        if (
          this.lastMove &&
          (
            this.lastMove.from === squareName ||
            this.lastMove.to === squareName
          )
        ) {
          square.classList.add("last-move");
        }

        if (piece) {

          const pieceElement = this.document.createElement("span");

          pieceElement.className =
            `ac-chess-piece ${
              piece.color === "w" ? "white-piece" : "black-piece"
            }`;

          pieceElement.textContent =
            PIECE_SYMBOLS[piece.color]?.[piece.type] || "";

          square.appendChild(pieceElement);
        }

        fragment.appendChild(square);
      }
    }

    this.boardElement.appendChild(fragment);

    this.renderCoordinates();
  }


  /* -------------------------------------------------------
     9. BOARD COORDINATES
  ------------------------------------------------------- */

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
   
  /* -------------------------------------------------------
     10. HUMAN MOVE PERMISSION
  ------------------------------------------------------- */

  canHumanMove() {

    if (
      this.destroyed ||
      this.isPaused ||
      this.isGameOver ||
      this.isThinking ||
      this.moveInProgress
    ) {
      return false;
    }

    if (this.mode === "online" && this.isOpponentTurn()) {
      return false;
    }

    if (this.mode === "offline") {

      const activeColor = this.getActiveColor();

      const humanColor = this.playerColor === "black"
        ? "b"
        : "w";

      if (activeColor !== humanColor) {
        return false;
      }
    }

    return true;
  }


  /* -------------------------------------------------------
     11. SQUARE SELECTION
  ------------------------------------------------------- */

  handleSquareClick(square) {

    if (!this.canHumanMove()) return;

    if (
      this.selectedSquare &&
      this.legalTargets.includes(square)
    ) {
      this.makeMove(this.selectedSquare, square);
      return;
    }

    const piece = this.getPieceAt(square);

    if (!piece) {
      this.clearSelection();
      return;
    }

    const playerColor = this.playerColor === "black" ? "b" : "w";

    if (piece.color !== playerColor) {
      this.clearSelection();
      return;
    }

    this.selectedSquare = square;
    this.legalTargets = this.getLegalTargets(square);

    this.renderBoard();

    this.dispatchBoardRefresh();
  }


  /* -------------------------------------------------------
     12. PIECE ACCESS
  ------------------------------------------------------- */

  getPieceAt(square) {

    const board = this.getBoardPosition();

    const file = FILES.indexOf(square[0]);
    const rank = 8 - Number(square[1]);

    if (file < 0 || rank < 0 || rank > 7) {
      return null;
    }

    return board[rank]?.[file] || null;
  }


  /* -------------------------------------------------------
     13. LEGAL MOVE TARGETS
  ------------------------------------------------------- */

  getLegalTargets(square) {

    if (this.gameState?.getLegalMoves) {

      const moves = this.gameState.getLegalMoves(square);

      if (Array.isArray(moves)) {

        return moves.map(move => {

          if (typeof move === "string") {
            return move.slice(2, 4);
          }

          return move.to || move.destination || "";

        }).filter(Boolean);
      }
    }

    if (this.gameState?.getMovesFrom) {

      const moves = this.gameState.getMovesFrom(square);

      if (Array.isArray(moves)) {

        return moves.map(move => {
          return move.to || move.destination || "";
        }).filter(Boolean);
      }
    }

    return [];
  }


  /* -------------------------------------------------------
     14. PLAYER MOVE
  ------------------------------------------------------- */

  async makeMove(from, to) {

    if (!this.gameState?.makeMove) {
      this.setStatus("Game engine is not connected");
      return false;
    }

    if (this.moveInProgress || this.isGameOver || this.isPaused) {
      return false;
    }

    this.moveInProgress = true;

    try {

      const move = {
        from,
        to,
        promotion: "q"
      };

      const result = await this.gameState.makeMove(move);

      if (!result || result.success === false) {

        this.setStatus(result?.error || "Illegal move");

        this.clearSelection();

        return false;
      }

      this.lastMove = { from, to };

      this.moveHistory.push({
        from,
        to,
        timestamp: Date.now(),
        san: result.move?.san || null
      });

      this.clearSelection();

      this.addClockIncrement();

      this.syncFromGameState();

      this.checkGameStatus();

      return true;

    } catch (error) {

      console.error(
        "[APPARA CHESS] Player move failed:",
        error
      );

      this.setStatus("Move could not be completed");

      this.clearSelection();

      return false;

    } finally {

      this.moveInProgress = false;
    }
  }


  /* -------------------------------------------------------
     15. AI MOVE
  ------------------------------------------------------- */

  async makeAIMove() {

    if (
      !this.aiEngine ||
      this.isGameOver ||
      this.isPaused ||
      this.destroyed
    ) {
      return false;
    }

    this.isThinking = true;

    this.setStatus("APPARA AI is thinking...");

    try {

      const result = await this.aiEngine.getBestMove?.(
        this.getFEN(),
        this.difficulty
      );

      if (
        !result ||
        this.isGameOver ||
        this.isPaused ||
        this.destroyed
      ) {
        return false;
      }

      const move = typeof result === "string"
        ? {
            from: result.slice(0, 2),
            to: result.slice(2, 4),
            promotion: result[4] || "q"
          }
        : result;

      if (!move?.from || !move?.to) {
        return false;
      }

      const aiResult = await this.gameState.makeMove({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });

      if (!aiResult || aiResult.success === false) {
        this.setStatus("AI move was rejected");
        return false;
      }

      this.lastMove = {
        from: move.from,
        to: move.to
      };

      this.moveHistory.push({
        from: move.from,
        to: move.to,
        timestamp: Date.now(),
        san: aiResult.move?.san || null
      });

      this.syncFromGameState();

      this.checkGameStatus();

      return true;

    } catch (error) {

      console.error(
        "[APPARA CHESS] AI move failed:",
        error
      );

      this.setStatus("AI move could not be completed");

      return false;

    } finally {

      this.isThinking = false;

      if (!this.isGameOver && !this.isPaused) {
        this.checkGameStatus();
      }
    }
  }


  /* -------------------------------------------------------
     16. BOARD REFRESH BRIDGE
  ------------------------------------------------------- */

  dispatchBoardRefresh() {

    if (this.renderer?.refresh) {
      this.renderer.refresh();
    }
  }


  clearSelection() {

    this.selectedSquare = null;
    this.legalTargets = [];

    this.renderBoard();

    this.dispatchBoardRefresh();
  }
   
  /* -------------------------------------------------------
     17. REBUILD MOVE HISTORY
  ------------------------------------------------------- */

  rebuildHistoryFromGameState() {

    const history = this.gameState?.getHistory?.();

    if (!Array.isArray(history)) return;

    this.moveHistory = history.map(move => ({
      from: move.from,
      to: move.to,
      san: move.san || null,
      timestamp: Date.now()
    })).filter(move => move.from && move.to);

    this.lastMove = this.moveHistory.length
      ? this.moveHistory[this.moveHistory.length - 1]
      : null;
  }


  /* -------------------------------------------------------
     18. SYNCHRONIZE SCREEN WITH GAME STATE
  ------------------------------------------------------- */

  syncFromGameState() {

    if (this.destroyed) return;

    this.rebuildHistoryFromGameState();

    this.renderBoard();
    this.renderHistory();

    this.updateClockDisplay();

    this.checkGameStatus();

    this.dispatchBoardRefresh();
  }


  /* -------------------------------------------------------
     19. MOVE HISTORY UI
  ------------------------------------------------------- */

  renderHistory() {

    if (!this.historyElement) return;

    this.historyElement.replaceChildren();

    if (!this.moveHistory.length) {

      const empty = this.document.createElement("div");

      empty.className = "ac-history-empty";
      empty.textContent = "Moves will appear here";

      this.historyElement.appendChild(empty);

    } else {

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

    if (move.san) {
      return move.san;
    }

    return `${move.from}–${move.to}`;
  }


  /* -------------------------------------------------------
     20. CHESS CLOCK
  ------------------------------------------------------- */

  startClock() {

    if (this.clockInterval || this.destroyed) return;

    this.clockInterval = setInterval(() => {

      if (this.isPaused || this.isGameOver || this.isThinking) {
        return;
      }

      const activeColor = this.getActiveColor();

      if (activeColor === "w") {
        this.whiteTime = Math.max(0, this.whiteTime - 1);
      } else {
        this.blackTime = Math.max(0, this.blackTime - 1);
      }

      this.updateClockDisplay();

      if (
        (activeColor === "w" && this.whiteTime <= 0) ||
        (activeColor === "b" && this.blackTime <= 0)
      ) {
        this.handleTimeout(activeColor);
      }

    }, 1000);
  }


  getActiveColor() {

    const snapshot = this.getSnapshot();

    if (snapshot?.turn === "b" || snapshot?.turn === "black") {
      return "b";
    }

    if (snapshot?.turn === "w" || snapshot?.turn === "white") {
      return "w";
    }

    return this.moveHistory.length % 2 === 0 ? "w" : "b";
  }


  isOpponentTurn() {

    const active = this.getActiveColor();

    const player = this.playerColor === "black" ? "b" : "w";

    return active !== player;
  }


  addClockIncrement() {

    const previousColor =
      this.getActiveColor() === "w" ? "b" : "w";

    const increment = Number(this.timeControl.increment) || 0;

    if (previousColor === "w") {
      this.whiteTime += increment;
    } else {
      this.blackTime += increment;
    }

    this.updateClockDisplay();
  }


  updateClockDisplay() {

    if (this.whiteClockElement) {
      this.whiteClockElement.textContent =
        this.formatTime(this.whiteTime);
    }

    if (this.blackClockElement) {
      this.blackClockElement.textContent =
        this.formatTime(this.blackTime);
    }

    this.whiteClockElement?.classList.toggle(
      "clock-low",
      this.whiteTime <= 30
    );

    this.blackClockElement?.classList.toggle(
      "clock-low",
      this.blackTime <= 30
    );
  }


  formatTime(seconds) {

    const safeSeconds = Math.max(0, Math.floor(seconds));

    const minutes = Math.floor(safeSeconds / 60);
    const remaining = safeSeconds % 60;

    return (
      `${String(minutes).padStart(2, "0")}:` +
      `${String(remaining).padStart(2, "0")}`
    );
  }


  /* -------------------------------------------------------
     21. TIMEOUT
  ------------------------------------------------------- */

  handleTimeout(activeColor) {

    if (this.isGameOver) return;

    this.isGameOver = true;

    this.stopClock();

    const winner = activeColor === "w" ? "Black" : "White";

    this.setStatus(`${winner} wins on time`);

    this.showResult(
      "Time Out",
      `${winner} wins on time.`
    );
  }


  /* -------------------------------------------------------
     22. GAME STATUS
  ------------------------------------------------------- */

  checkGameStatus() {

    const status = this.gameState?.getGameStatus?.();

    if (!status) return;

    const gameOver = Boolean(
      status.isGameOver ||
      status.gameOver
    );

    if (gameOver) {

      const wasAlreadyOver = this.isGameOver;

      this.isGameOver = true;

      this.stopClock();

      const message =
        status.message ||
        status.reason ||
        status.result ||
        "The game has ended.";

      this.setStatus(message);

      if (!wasAlreadyOver) {
        this.showResult("Game Over", message);
      }

      return;
    }

    if (status.inCheck || status.isCheck) {
      this.setStatus("Check!");
    } else {
      this.setStatus(
        this.isOpponentTurn()
          ? "Opponent's move"
          : "Your move"
      );
    }
  }


  setStatus(message) {

    if (this.statusElement) {
      this.statusElement.textContent = message;
    }
  }


  /* -------------------------------------------------------
     23. PAUSE AND RESUME
  ------------------------------------------------------- */

  pause() {

    if (this.isGameOver || this.isPaused) return;

    const result = this.gameState?.pause?.();

    if (result && result.success === false) {
      this.setStatus(result.error || "Unable to pause game");
      return;
    }

    this.isPaused = true;

    const overlay = this.root?.querySelector(".ac-game-overlay");

    if (overlay) {
      overlay.hidden = false;
    }

    this.setStatus("Game paused");

    this.dispatchBoardRefresh();
  }


  resume() {

    if (this.isGameOver || !this.isPaused) return;

    const result = this.gameState?.resume?.();

    if (result && result.success === false) {
      this.setStatus(result.error || "Unable to resume game");
      return;
    }

    this.isPaused = false;

    const overlay = this.root?.querySelector(".ac-game-overlay");

    if (overlay) {
      overlay.hidden = true;
    }

    this.checkGameStatus();

    this.dispatchBoardRefresh();
  }


  /* -------------------------------------------------------
     24. FLIP BOARD
  ------------------------------------------------------- */

  flipBoard() {

    this.orientation = this.orientation === "white"
      ? "black"
      : "white";

    const colorLabel = this.root?.querySelector(".ac-color-label");

    if (colorLabel) {
      colorLabel.textContent =
        this.orientation === "white" ? "White" : "Black";
    }

    this.clearSelection();
  }


  /* -------------------------------------------------------
     25. UNDO
  ------------------------------------------------------- */

  async undoMove() {

    if (
      this.isGameOver ||
      this.isPaused ||
      this.mode === "online"
    ) {
      this.setStatus("Undo is unavailable in this match");
      return false;
    }

    if (!this.gameState?.undoMove) {
      this.setStatus("Undo is not supported");
      return false;
    }

    try {

      // In offline AI mode, undo the AI reply and
      // the player's previous move as one turn.
      const undoCount =
        this.mode === "offline" &&
        this.moveHistory.length >= 2
          ? 2
          : 1;

      for (let index = 0; index < undoCount; index += 1) {

        const result = await this.gameState.undoMove();

        if (!result || result.success === false) {
          break;
        }
      }

      this.clearSelection();

      this.syncFromGameState();

      this.setStatus("Move undone");

      return true;

    } catch (error) {

      console.error(
        "[APPARA CHESS] Undo failed:",
        error
      );

      this.setStatus("Unable to undo move");

      return false;
    }
  }


  /* -------------------------------------------------------
     26. DRAW OFFER
  ------------------------------------------------------- */

  async offerDraw() {

    if (
      this.mode === "online" &&
      this.onlineGameService?.offerDraw
    ) {

      try {

        await this.onlineGameService.offerDraw();

        this.setStatus("Draw offer sent");

      } catch (error) {

        this.setStatus("Could not send draw offer");
      }

      return;
    }

    this.setStatus(
      "Draw offers are available in online matches"
    );
  }


  /* -------------------------------------------------------
     27. RESIGN
  ------------------------------------------------------- */

  async resign() {

    if (this.isGameOver) return;

    const confirmed = await this.confirmAction(
      "Resign Game",
      "Are you sure you want to resign this match?"
    );

    if (!confirmed) return;

    try {

      if (
        this.mode === "online" &&
        this.onlineGameService?.resign
      ) {

        await this.onlineGameService.resign();

      } else {

        const color = this.playerColor === "black" ? "b" : "w";

        const result = this.gameState?.resign?.(color);

        if (result?.success === false) {
          this.setStatus(result.error || "Unable to resign");
          return;
        }
      }

      this.isGameOver = true;

      this.stopClock();

      this.setStatus("You resigned");

      this.showResult(
        "You Resigned",
        "This match has ended."
      );

    } catch (error) {

      console.error(
        "[APPARA CHESS] Resignation failed:",
        error
      );

      this.setStatus("Unable to resign");
    }
  }


  /* -------------------------------------------------------
     28. MODALS
  ------------------------------------------------------- */

  async confirmAction(title, message) {

    if (this.modalManager?.confirm) {

      return this.modalManager.confirm({
        title,
        message,
        confirmText: "Confirm",
        cancelText: "Cancel"
      });
    }

    return this.document.defaultView.confirm(
      `${title}\n${message}`
    );
  }


  showResult(title, message) {

    if (this.modalManager?.alert) {

      this.modalManager.alert({
        title,
        message,
        buttonText: "Continue"
      });

    } else {

      this.document.defaultView.alert(
        `${title}\n${message}`
      );
    }
  }


  /* -------------------------------------------------------
     29. NAVIGATION
  ------------------------------------------------------- */

  goBack() {

    this.stopClock();

    if (this.navigation?.back) {
      this.navigation.back();
    } else if (this.navigation?.navigate) {
      this.navigation.navigate("home");
    }
  }


  /* -------------------------------------------------------
     30. CLEANUP
  ------------------------------------------------------- */

  stopClock() {

    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }


  destroy() {

    if (this.destroyed) return;

    this.destroyed = true;

    this.stopClock();

    for (const unsubscribe of this.unsubscribe) {

      try {
        unsubscribe();
      } catch (error) {
        console.warn(
          "[APPARA CHESS] Cleanup warning:",
          error
        );
      }
    }

    this.unsubscribe = [];

    if (this.renderer?.dispose) {
      this.renderer.dispose();
    }

    this.root?.remove();

    this.root = null;
    this.boardElement = null;
    this.historyElement = null;
  }

}


/* ---------------------------------------------------------
   31. FACTORY
--------------------------------------------------------- */

export function createGameScreen(options = {}) {
  return new GameScreen(options);
}


/* =========================================================
   FILE 54 COMPLETE
   Path: js/screens/game-screen.js
   PART 4/4 — FULL FILE COMPLETE
   ========================================================= */
