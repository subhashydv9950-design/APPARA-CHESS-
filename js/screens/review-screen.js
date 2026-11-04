/**
 * APPARA CHESS
 * Review & Analysis Screen
 *
 * Features:
 * - Move-by-move game review
 * - First / Previous / Next / Last move
 * - Automatic replay with speed control
 * - Move list navigation
 * - Captured pieces and game events
 * - PGN export
 * - FEN copy
 *
 * IMPORTANT:
 * This screen is read-only. It never modifies or undoes
 * the original live game.
 */

export class ReviewScreen {
  constructor(options = {}) {
    this.container = options.container || null;
    this.navigation = options.navigation || null;
    this.modalManager = options.modalManager || null;

    this.gameRecord = options.gameRecord || {};
    this.chessFactory = options.chessFactory || null;
    this.chessEngine = options.chessEngine || null;

    this.moves = Array.isArray(options.moves)
      ? options.moves
      : Array.isArray(this.gameRecord.moves)
        ? this.gameRecord.moves
        : [];

    this.positions = Array.isArray(options.positions)
      ? options.positions
      : Array.isArray(this.gameRecord.positions)
        ? this.gameRecord.positions
        : [];

    this.currentMove = 0;
    this.playing = false;
    this.playTimer = null;
    this.playSpeed = 1;
    this.destroyed = false;

    this.startFEN =
      options.initialFEN ||
      this.gameRecord.initialFEN ||
      this.gameRecord.startFEN ||
      null;

    this.finalFEN =
      options.finalFEN ||
      this.gameRecord.finalFEN ||
      null;

    this.initialPosition = this.getInitialPosition();
    this.currentPosition = this.initialPosition;

    this.boundClick = this.handleClick.bind(this);
    this.boundChange = this.handleChange.bind(this);
  }

  getInitialPosition() {
    if (this.positions.length > 0) {
      return this.positions[0];
    }

    if (this.startFEN) {
      return {
        fen: this.startFEN
      };
    }

    return {
      fen: null,
      board: null
    };
  }

  mount(container = this.container) {
    if (!container) {
      console.error("ReviewScreen: Container not found.");
      return false;
    }

    this.container = container;
    this.destroyed = false;

    this.render();

    this.container.addEventListener("click", this.boundClick);
    this.container.addEventListener("change", this.boundChange);

    return true;
  }

  render() {
    if (!this.container) return;

    const title = this.escapeHTML(
      this.gameRecord.title || "Game Review"
    );

    const whiteName = this.escapeHTML(
      this.gameRecord.whiteName || "White"
    );

    const blackName = this.escapeHTML(
      this.gameRecord.blackName || "Black"
    );

    const result = this.escapeHTML(
      this.gameRecord.result || "Game completed"
    );

    this.container.innerHTML = `
      <section class="review-screen">

        <header class="review-header">
          <button
            type="button"
            class="review-back-button"
            data-action="back"
            aria-label="Go back"
          >
            ←
          </button>

          <div class="review-heading">
            <h1>${title}</h1>
            <p>Review every move of your game</p>
          </div>

          <span class="review-readonly-label">
            READ ONLY
          </span>
        </header>

        <div class="review-game-info">
          <div class="review-player">
            <span class="review-player-symbol">♔</span>
            <span>${whiteName}</span>
          </div>

          <div class="review-result">
            ${result}
          </div>

          <div class="review-player">
            <span class="review-player-symbol">♚</span>
            <span>${blackName}</span>
          </div>
        </div>

        <div class="review-main">

          <section class="review-board-area">
            <div
              class="review-board"
              data-review-board
              aria-label="Chess board position"
            >
              ${this.renderBoard()}
            </div>

            <div class="review-position-info">
              <span data-position-label>
                Starting Position
              </span>

              <span data-move-counter>
                0 / ${this.moves.length}
              </span>
            </div>

            <div class="review-controls">

              <button
                type="button"
                data-action="first"
                title="First position"
              >
                |◀
              </button>

              <button
                type="button"
                data-action="previous"
                title="Previous move"
              >
                ◀
              </button>

              <button
                type="button"
                data-action="play"
                data-review-play
                title="Play replay"
              >
                ▶
              </button>

              <button
                type="button"
                data-action="next"
                title="Next move"
              >
                ▶
              </button>

              <button
                type="button"
                data-action="last"
                title="Last position"
              >
                ▶|
              </button>

            </div>

            <div class="review-speed-control">
              <label for="review-speed">
                Replay Speed
              </label>

              <select id="review-speed" data-review-speed>
                <option value="0.5">0.5x</option>
                <option value="1" selected>1x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>

            <div class="review-export-controls">
              <button
                type="button"
                data-action="copy-fen"
              >
                Copy FEN
              </button>

              <button
                type="button"
                data-action="export-pgn"
              >
                Export PGN
              </button>
            </div>
          </section>

          <aside class="review-sidebar">

            <section class="review-move-section">
              <h2>Move History</h2>

              <div
                class="review-move-list"
                data-review-moves
              >
                ${this.renderMoveList()}
              </div>
            </section>

            <section class="review-capture-section">
              <h2>Captured Pieces</h2>

              <div class="review-captures">
                <div>
                  <span>White captured</span>
                  <p data-white-captures>—</p>
                </div>

                <div>
                  <span>Black captured</span>
                  <p data-black-captures>—</p>
                </div>
              </div>
            </section>

            <section class="review-events-section">
              <h2>Game Events</h2>

              <div data-review-events>
                ${this.renderEvents()}
              </div>
            </section>

          </aside>

        </div>

        <div
          class="review-message"
          data-review-message
          aria-live="polite"
        ></div>

      </section>
    `;

    this.updatePosition();
  }

  renderBoard() {
    const squares = [];

    for (let rank = 8; rank >= 1; rank--) {
      for (let file = 0; file < 8; file++) {
        const isLight = (rank + file) % 2 === 0;
        const square = String.fromCharCode(97 + file) + rank;

        squares.push(`
          <div
            class="review-square ${isLight ? "light" : "dark"}"
            data-square="${square}"
          >
            <span class="review-piece" data-piece-square="${square}">
            </span>
          </div>
        `);
      }
    }

    return squares.join("");
  }

  renderMoveList() {
    if (!this.moves.length) {
      return `
        <p class="review-empty">
          No move history is available.
        </p>
      `;
    }

    const rows = [];

    for (let i = 0; i < this.moves.length; i += 2) {
      const whiteMove = this.moves[i];
      const blackMove = this.moves[i + 1];

      rows.push(`
        <div class="review-move-row">

          <span class="review-move-number">
            ${Math.floor(i / 2) + 1}.
          </span>

          <button
            type="button"
            class="review-move-button"
            data-action="goto"
            data-move-index="${i + 1}"
          >
            ${this.escapeHTML(this.getMoveNotation(whiteMove))}
          </button>

          ${
            blackMove
              ? `
                <button
                  type="button"
                  class="review-move-button"
                  data-action="goto"
                  data-move-index="${i + 2}"
                >
                  ${this.escapeHTML(this.getMoveNotation(blackMove))}
                </button>
              `
              : `<span class="review-no-move">—</span>`
          }

        </div>
      `);
    }

    return rows.join("");
  }

  renderEvents() {
    const events = Array.isArray(this.gameRecord.events)
      ? this.gameRecord.events
      : [];

    if (!events.length) {
      return `
        <p class="review-empty">
          No special events recorded.
        </p>
      `;
    }

    return events.map(event => {
      const description =
        typeof event === "string"
          ? event
          : event.description || event.type || "Game event";

      return `
        <div class="review-event">
          ${this.escapeHTML(description)}
        </div>
      `;
    }).join("");
  }

  getMoveNotation(move) {
    if (typeof move === "string") {
      return move;
    }

    if (!move || typeof move !== "object") {
      return "—";
    }

    return (
      move.san ||
      move.notation ||
      move.algebraic ||
      move.move ||
      "—"
    );
  }

  updatePosition() {
    if (!this.container) return;

    this.currentPosition = this.getPositionAt(this.currentMove);

    this.renderPositionOnBoard();

    const counter = this.container.querySelector(
      "[data-move-counter]"
    );

    if (counter) {
      counter.textContent =
        `${this.currentMove} / ${this.moves.length}`;
    }

    const label = this.container.querySelector(
      "[data-position-label]"
    );

    if (label) {
      if (this.currentMove === 0) {
        label.textContent = "Starting Position";
      } else {
        const move = this.moves[this.currentMove - 1];

        label.textContent =
          `Move ${this.currentMove}: ${this.getMoveNotation(move)}`;
      }
    }

    this.updateMoveHighlight();
    this.updateCaptures();
    this.updateControls();
  }

  getPositionAt(moveNumber) {
    if (
      this.positions.length > moveNumber &&
      this.positions[moveNumber]
    ) {
      return this.positions[moveNumber];
    }

    if (moveNumber === 0) {
      return this.initialPosition;
    }

    const move = this.moves[moveNumber - 1];

    if (move && typeof move === "object") {
      if (move.positionAfter) return move.positionAfter;

      if (move.fenAfter) {
        return {
          fen: move.fenAfter,
          board: move.boardAfter || null
        };
      }
    }

    return null;
  }

  renderPositionOnBoard() {
    const boardElement = this.container.querySelector(
      "[data-review-board]"
    );

    if (!boardElement) return;

    const position = this.currentPosition;

    let board = null;

    if (position && Array.isArray(position.board)) {
      board = position.board;
    } else if (
      position &&
      position.position &&
      Array.isArray(position.position)
    ) {
      board = position.position;
    }

    if (!board && position && position.fen) {
      board = this.fenToBoard(position.fen);
    }

    if (!board) {
      boardElement.classList.add("review-position-unavailable");
      return;
    }

    boardElement.classList.remove("review-position-unavailable");

    const pieceSymbols = {
      K: "♔",
      Q: "♕",
      R: "♖",
      B: "♗",
      N: "♘",
      P: "♙",
      k: "♚",
      q: "♛",
      r: "♜",
      b: "♝",
      n: "♞",
      p: "♟"
    };

    const squares = boardElement.querySelectorAll(
      "[data-piece-square]"
    );

    squares.forEach(squareElement => {
      const square = squareElement.dataset.pieceSquare;
      const piece = this.getPieceAt(board, square);

      squareElement.textContent =
        pieceSymbols[piece] || "";

      squareElement.classList.toggle(
        "white-piece",
        Boolean(piece && piece === piece.toUpperCase())
      );

      squareElement.classList.toggle(
        "black-piece",
        Boolean(piece && piece === piece.toLowerCase())
      );
    });
  }

  fenToBoard(fen) {
    if (typeof fen !== "string") return null;

    const placement = fen.trim().split(/\s+/)[0];

    if (!placement) return null;

    const ranks = placement.split("/");

    if (ranks.length !== 8) return null;

    const board = [];

    for (const rank of ranks) {
      const row = [];

      for (const character of rank) {
        if (/^[1-8]$/.test(character)) {
          for (let i = 0; i < Number(character); i++) {
            row.push(null);
          }
        } else if (/^[prnbqkPRNBQK]$/.test(character)) {
          row.push(character);
        } else {
          return null;
        }
      }

      if (row.length !== 8) return null;

      board.push(row);
    }

    return board;
  }

  getPieceAt(board, square) {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]);

    if (
      !Number.isInteger(file) ||
      file < 0 ||
      file > 7 ||
      rank < 1 ||
      rank > 8
    ) {
      return null;
    }

    if (
      board.length === 8 &&
      Array.isArray(board[0]) &&
      board[0].length === 8
    ) {
      return board[8 - rank][file] || null;
    }

    return null;
  }

  updateMoveHighlight() {
    const buttons = this.container.querySelectorAll(
      "[data-move-index]"
    );

    buttons.forEach(button => {
      const index = Number(button.dataset.moveIndex);

      button.classList.toggle(
        "active",
        index === this.currentMove
      );
    });
  }

  updateCaptures() {
    const whiteElement = this.container.querySelector(
      "[data-white-captures]"
    );

    const blackElement = this.container.querySelector(
      "[data-black-captures]"
    );

    const captures = this.getCapturedPieces();

    if (whiteElement) {
      whiteElement.textContent = captures.white || "—";
    }

    if (blackElement) {
      blackElement.textContent = captures.black || "—";
    }
  }

  getCapturedPieces() {
    const captures = {
      white: "",
      black: ""
    };

    for (let i = 0; i < this.currentMove; i++) {
      const move = this.moves[i];

      if (!move || typeof move !== "object") continue;

      const captured =
        move.capturedPiece ||
        move.captured ||
        null;

      if (!captured) continue;

      const color = move.color || move.playerColor;

      if (color === "w" || color === "white") {
        captures.white += this.getPieceSymbol(captured);
      } else if (color === "b" || color === "black") {
        captures.black += this.getPieceSymbol(captured);
      }
    }

    return captures;
  }

  getPieceSymbol(piece) {
    const symbols = {
      p: "♟",
      n: "♞",
      b: "♝",
      r: "♜",
      q: "♛",
      k: "♚"
    };

    const key = String(piece).toLowerCase();

    return symbols[key] || String(piece);
  }

  updateControls() {
    const playButton = this.container.querySelector(
      "[data-review-play]"
    );

    if (playButton) {
      playButton.textContent = this.playing ? "Ⅱ" : "▶";
      playButton.title = this.playing ? "Pause replay" : "Play replay";
    }

    const first = this.container.querySelector(
      '[data-action="first"]'
    );

    const previous = this.container.querySelector(
      '[data-action="previous"]'
    );

    const next = this.container.querySelector(
      '[data-action="next"]'
    );

    const last = this.container.querySelector(
      '[data-action="last"]'
    );

    if (first) first.disabled = this.currentMove === 0;
    if (previous) previous.disabled = this.currentMove === 0;

    if (next) {
      next.disabled = this.currentMove >= this.moves.length;
    }

    if (last) {
      last.disabled = this.currentMove >= this.moves.length;
    }
  }

  handleClick(event) {
    const button = event.target.closest("[data-action]");

    if (!button || !this.container.contains(button)) return;

    const action = button.dataset.action;

    switch (action) {
      case "back":
        this.stopReplay();

        if (this.navigation?.back) {
          this.navigation.back();
        } else if (this.navigation?.navigate) {
          this.navigation.navigate("home");
        }
        break;

      case "first":
        this.goToMove(0);
        break;

      case "previous":
        this.previousMove();
        break;

      case "next":
        this.nextMove();
        break;

      case "last":
        this.goToMove(this.moves.length);
        break;

      case "play":
        this.toggleReplay();
        break;

      case "goto":
        this.goToMove(Number(button.dataset.moveIndex));
        break;

      case "copy-fen":
        this.copyCurrentFEN();
        break;

      case "export-pgn":
        this.exportPGN();
        break;

      default:
        break;
    }
  }

  handleChange(event) {
    if (!event.target.matches("[data-review-speed]")) return;

    const speed = Number(event.target.value);

    if (![0.5, 1, 1.5, 2].includes(speed)) return;

    this.playSpeed = speed;

    if (this.playing) {
      this.startReplayTimer();
    }
  }

  goToMove(moveNumber) {
    this.stopReplay();

    const safeMove = Math.max(
      0,
      Math.min(this.moves.length, Number(moveNumber) || 0)
    );

    this.currentMove = safeMove;

    this.updatePosition();
  }

  nextMove() {
    if (this.currentMove >= this.moves.length) {
      this.stopReplay();
      return;
    }

    this.currentMove++;
    this.updatePosition();
  }

  previousMove() {
    if (this.currentMove <= 0) return;

    this.currentMove--;
    this.updatePosition();
  }

  toggleReplay() {
    if (this.playing) {
      this.stopReplay();
      return;
    }

    if (this.currentMove >= this.moves.length) {
      this.currentMove = 0;
      this.updatePosition();
    }

    if (!this.moves.length) {
      this.showMessage("No moves are available to replay.");
      return;
    }

    this.playing = true;
    this.startReplayTimer();
    this.updateControls();
  }

  startReplayTimer() {
    this.clearReplayTimer();

    if (!this.playing || this.destroyed) return;

    const delay = 900 / this.playSpeed;

    this.playTimer = setInterval(() => {
      if (this.destroyed || !this.playing) {
        this.stopReplay();
        return;
      }

      if (this.currentMove >= this.moves.length) {
        this.stopReplay();
        return;
      }

      this.currentMove++;
      this.updatePosition();

      if (this.currentMove >= this.moves.length) {
        this.stopReplay();
      }
    }, delay);
  }

  stopReplay() {
    this.playing = false;
    this.clearReplayTimer();
    this.updateControls();
  }

  clearReplayTimer() {
    if (this.playTimer !== null) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }

  getCurrentFEN() {
    const position = this.currentPosition;

    if (position && typeof position.fen === "string") {
      return position.fen;
    }

    if (position && typeof position.FEN === "string") {
      return position.FEN;
    }

    if (this.currentMove === this.moves.length && this.finalFEN) {
      return this.finalFEN;
    }

    return null;
  }

  async copyCurrentFEN() {
    const fen = this.getCurrentFEN();

    if (!fen) {
      this.showMessage("FEN is not available for this position.");
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fen);
      } else {
        this.copyUsingFallback(fen);
      }

      this.showMessage("FEN copied.");
    } catch (error) {
      this.showMessage("Could not copy FEN.");
    }
  }

  copyUsingFallback(text) {
    const textarea = document.createElement("textarea");

    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.select();

    const successful = document.execCommand("copy");

    textarea.remove();

    if (!successful) {
      throw new Error("Copy failed.");
    }
  }

  buildPGN() {
    const headers = this.gameRecord.headers || {};

    const date = this.gameRecord.date
      ? String(this.gameRecord.date).replace(/-/g, ".")
      : new Date().toISOString().slice(0, 10).replace(/-/g, ".");

    const pgnHeaders = {
      Event: headers.Event || this.gameRecord.title || "APPARA CHESS Game",
      Site: headers.Site || "APPARA CHESS",
      Date: headers.Date || date,
      Round: headers.Round || "1",
      White: headers.White || this.gameRecord.whiteName || "White",
      Black: headers.Black || this.gameRecord.blackName || "Black",
      Result: headers.Result || this.gameRecord.result || "*"
    };

    const headerText = Object.entries(pgnHeaders)
      .map(([key, value]) => {
        const safeValue = String(value)
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .replace(/[\r\n]/g, " ");

        return `[${key} "${safeValue}"]`;
      })
      .join("\n");

    const moveText = [];

    for (let i = 0; i < this.moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = this.getMoveNotation(this.moves[i]);

      const blackMove = this.moves[i + 1]
        ? this.getMoveNotation(this.moves[i + 1])
        : "";

      moveText.push(
        `${moveNumber}. ${whiteMove}${blackMove ? " " + blackMove : ""}`
      );
    }
    const result = pgnHeaders.Result || "*";

    return `${headerText}\n\n${moveText.join(" ")} ${result}`;
  }

  exportPGN() {
    if (!this.moves.length) {
      this.showMessage("There are no moves to export.");
      return;
    }

    const pgn = this.buildPGN();

    try {
      const blob = new Blob(
        [pgn],
        { type: "application/x-chess-pgn;charset=utf-8" }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "apparachess-review.pgn";

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      this.showMessage("PGN export started.");
    } catch (error) {
      this.showMessage("Could not export PGN.");
    }
  }

  showMessage(message) {
    const element = this.container?.querySelector(
      "[data-review-message]"
    );

    if (!element) return;
    element.textContent = message;
    element.classList.add("visible");

    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
    }

    this.messageTimer = setTimeout(() => {
      element.classList.remove("visible");
      this.messageTimer = null;
    }, 2500);
  }

  escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  destroy() {
    this.stopReplay();
    this.destroyed = true;

    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }

    if (this.container) {
      this.container.removeEventListener("click", this.boundClick);
      this.container.removeEventListener("change", this.boundChange);
      this.container.innerHTML = "";
    }

    this.container = null;
  }
}

export default ReviewScreen;
    
