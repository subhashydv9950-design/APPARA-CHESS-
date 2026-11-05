/* =========================================================
   APPARA CHESS
   CORRECTION 14A — PART 1/2
   FILE: js/screens/puzzles-screen.js
   ========================================================= */

const PUZZLE_CATEGORIES = [
  { id: "daily", title: "Daily Challenge", subtitle: "A fresh challenge every day", icon: "📅" },
  { id: "mate", title: "Checkmate Puzzles", subtitle: "Find the winning checkmate", icon: "♔" },
  { id: "tactics", title: "Tactical Puzzles", subtitle: "Forks, pins and combinations", icon: "⚔" },
  { id: "endgame", title: "Endgame Puzzles", subtitle: "Master the final phase", icon: "♜" }
];

const PUZZLE_DIFFICULTIES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
  { id: "expert", label: "Expert" }
];

const PUZZLE_PIECES = {
  K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
  k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟"
};

export class PuzzlesScreen {
  constructor(options = {}) {
    this.container = options.container || null;
    this.navigation = options.navigation || null;
    this.puzzleService = options.puzzleService || null;
    this.playerService = options.playerService || null;
    this.progressionService = options.progressionService || null;

    this.selectedCategory = "daily";
    this.selectedDifficulty = "easy";

    this.currentPuzzle = null;
    this.puzzleList = [];
    this.currentIndex = 0;

    this.solvedPuzzles = new Set();
    this.attempts = 0;
    this.hintsUsed = 0;

    this.boardPosition = [];
    this.playerColor = "w";
    this.positionTurn = "w";

    this.selectedSquare = null;
    this.loading = false;
    this.solved = false;
    this.destroyed = false;
    this.loadToken = 0;

    this.elements = {};
    this.boundClick = event => this.handleClick(event);
  }

  mount(container = this.container) {
    if (!container) {
      throw new Error("PuzzlesScreen requires a container.");
    }

    this.container = container;
    this.destroyed = false;

    this.render();
    this.container.addEventListener("click", this.boundClick);

    this.loadPuzzleProgress();
    this.loadSelectedCategory();

    return this;
  }

  render() {
    this.container.innerHTML = `
      <main class="puzzles-screen">

        <header class="puzzles-header">
          <button type="button" class="puzzles-back-button"
            data-action="back" aria-label="Go back">←</button>

          <div class="puzzles-heading">
            <span class="puzzles-eyebrow">APPARA CHESS ACADEMY</span>
            <h1>Puzzle Arena</h1>
            <p>Train your mind. Discover the winning move.</p>
          </div>

          <div class="puzzles-header-icon">♞</div>
        </header>

        <section class="puzzles-hero">
          <div class="puzzles-hero-content">
            <span class="puzzles-hero-label">SHARPEN YOUR MIND</span>
            <h2>Every position has a secret.</h2>
            <p>Solve chess positions and improve your calculation.</p>
            <button type="button" data-action="daily">
              Daily Challenge →
            </button>
          </div>
          <div class="puzzles-hero-art">♛ ♞</div>
        </section>

        <section class="puzzles-stats">
          <div class="puzzles-stat-card">
            <span>✓</span>
            <strong data-role="solved-count">0</strong>
            <small>Solved</small>
          </div>
          <div class="puzzles-stat-card">
            <span>⚡</span>
            <strong data-role="attempt-count">0</strong>
            <small>Attempts</small>
          </div>
          <div class="puzzles-stat-card">
            <span>🏆</span>
            <strong data-role="success-rate">0%</strong>
            <small>Success Rate</small>
          </div>
        </section>

        <section class="puzzles-section">
          <div class="puzzles-section-heading">
            <h2>Puzzle Categories</h2>
          </div>

          <div class="puzzles-category-grid">
            ${PUZZLE_CATEGORIES.map(category => `
              <button type="button"
                class="puzzles-category-card ${category.id === this.selectedCategory ? "active" : ""}"
                data-category="${category.id}"
                aria-pressed="${category.id === this.selectedCategory}">
                <span class="puzzles-category-icon">${category.icon}</span>
                <strong>${this.escapeHTML(category.title)}</strong>
                <small>${this.escapeHTML(category.subtitle)}</small>
              </button>
            `).join("")}
          </div>
        </section>

        <section class="puzzles-section">
          <h2>Difficulty</h2>
          <div class="puzzles-difficulty-list">
            ${PUZZLE_DIFFICULTIES.map(level => `
              <button type="button"
                class="puzzles-difficulty-button ${level.id === this.selectedDifficulty ? "active" : ""}"
                data-difficulty="${level.id}"
                aria-pressed="${level.id === this.selectedDifficulty}">
                ${level.label}
              </button>
            `).join("")}
          </div>
        </section>

        <section class="puzzles-play-section">
          <div class="puzzles-play-heading">
            <div>
              <span class="puzzles-kicker">YOUR NEXT CHALLENGE</span>
              <h2 data-role="puzzle-title">Loading Puzzle...</h2>
            </div>
            <span class="puzzles-difficulty-badge"
              data-role="puzzle-difficulty">EASY</span>
          </div>

          <div class="puzzles-board-placeholder" data-role="board-area">
            <div class="puzzles-loading">
              <span>♟</span>
              <p>Preparing your puzzle...</p>
            </div>
          </div>

          <p class="puzzles-prompt" data-role="prompt">
            Select a piece and then its destination square.
          </p>

          <div class="puzzles-feedback" data-role="feedback"
            aria-live="polite"></div>

          <div class="puzzles-controls">
            <button type="button" data-action="hint">💡 Hint</button>
            <button type="button" data-action="check">Check Answer</button>
            <button type="button" data-action="next" disabled>
              Next Puzzle →
            </button>
          </div>
        </section>

        <section class="puzzles-section puzzles-extra-section">
          <h2>More Practice</h2>
          <div class="puzzles-extra-grid">
            <button type="button" data-action="training">
              <span>♙</span>
              <strong>Guided Training</strong>
              <small>Learn chess step by step</small>
            </button>
            <button type="button" data-action="play">
              <span>♔</span>
              <strong>Practice Game</strong>
              <small>Play a full chess game</small>
            </button>
          </div>
        </section>

        <footer class="puzzles-footer">
          <span>APPARA CHESS</span>
          <span>THE ROYAL CHESS EXPERIENCE</span>
        </footer>
      </main>
    `;

    this.cacheElements();
    this.updateStats();
  }

  cacheElements() {
    const find = selector => this.container.querySelector(selector);

    this.elements.solvedCount = find('[data-role="solved-count"]');
    this.elements.attemptCount = find('[data-role="attempt-count"]');
    this.elements.successRate = find('[data-role="success-rate"]');
    this.elements.title = find('[data-role="puzzle-title"]');
    this.elements.difficulty = find('[data-role="puzzle-difficulty"]');
    this.elements.board = find('[data-role="board-area"]');
    this.elements.prompt = find('[data-role="prompt"]');
    this.elements.feedback = find('[data-role="feedback"]');
    this.elements.hintButton = find('[data-action="hint"]');
    this.elements.checkButton = find('[data-action="check"]');
    this.elements.nextButton = find('[data-action="next"]');
  }

  handleClick(event) {
    const target = event.target.closest(
      "[data-action], [data-category], [data-difficulty], [data-square]"
    );

    if (!target || !this.container.contains(target)) return;

    if (target.dataset.category) {
      this.selectCategory(target.dataset.category);
      return;
    }

    if (target.dataset.difficulty) {
      this.selectDifficulty(target.dataset.difficulty);
      return;
    }

    if (target.dataset.square) {
      this.selectBoardSquare(target.dataset.square);
      return;
    }

    switch (target.dataset.action) {
      case "back":
        this.goBack();
        break;
      case "daily":
        this.selectCategory("daily");
        break;
      case "hint":
        this.showHint();
        break;
      case "check":
        this.checkAnswer();
        break;
      case "next":
        this.nextPuzzle();
        break;
      case "training":
        this.navigation?.navigate("training");
        break;
      case "play":
        this.navigation?.navigate("game", {
          mode: "offline",
          source: "puzzles"
        });
        break;
    }
  }

  selectCategory(categoryId) {
    if (!PUZZLE_CATEGORIES.some(item => item.id === categoryId)) {
      return false;
    }

    this.selectedCategory = categoryId;

    this.container.querySelectorAll("[data-category]").forEach(button => {
      const active = button.dataset.category === categoryId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    this.loadSelectedCategory();
    return true;
  }

  selectDifficulty(difficultyId) {
    if (!PUZZLE_DIFFICULTIES.some(item => item.id === difficultyId)) {
      return false;
    }

    this.selectedDifficulty = difficultyId;

    this.container.querySelectorAll("[data-difficulty]").forEach(button => {
      const active = button.dataset.difficulty === difficultyId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    this.loadSelectedCategory();
    return true;
  }

  async loadPuzzleProgress() {
    try {
      const profile = this.playerService?.getProfile?.();
      const saved = profile?.puzzles;

      if (Array.isArray(saved?.solvedPuzzleIds)) {
        this.solvedPuzzles = new Set(saved.solvedPuzzleIds);
      }

      this.attempts = Number(saved?.attempts || 0);
    } catch {
      this.solvedPuzzles = new Set();
      this.attempts = 0;
    }

    this.updateStats();
  }

  async loadSelectedCategory() {
    if (this.destroyed) return;

    const token = ++this.loadToken;

    if (!this.puzzleService) {
      this.showEmptyPuzzle(
        "Puzzle service is not connected yet."
      );
      return;
    }

    this.loading = true;
    this.resetPuzzleState();

    this.elements.title.textContent = "Loading Puzzle...";
    this.elements.feedback.textContent = "";
    this.elements.board.innerHTML = `
      <div class="puzzles-loading">
        <span>♟</span>
        <p>Preparing your puzzle...</p>
      </div>
    `;

    try {
      let result;

      if (this.selectedCategory === "daily") {
        result = await this.puzzleService.getDailyPuzzle();
      } else {
        result = await this.puzzleService.getPuzzleSet({
          difficulty: this.selectedDifficulty,
          theme: this.selectedCategory,
          limit: 10
        });
      }

      if (this.destroyed || token !== this.loadToken) return;

      this.setPuzzleResult(result);

    } catch (error) {
      if (token === this.loadToken) {
        this.showEmptyPuzzle(
          error?.message || "Unable to load puzzles."
        );
      }
    } finally {
      if (token === this.loadToken) {
        this.loading = false;
      }
    }
  }

  setPuzzleResult(result) {
    if (!result) {
      this.showEmptyPuzzle("No puzzle is available right now.");
      return;
    }

    if (Array.isArray(result)) {
      this.puzzleList = result;
    } else if (Array.isArray(result.puzzles)) {
      this.puzzleList = result.puzzles;
    } else {
      this.puzzleList = [result];
    }

    this.currentIndex = 0;
    this.startCurrentPuzzle();
  }

  startCurrentPuzzle() {
    const puzzle = this.puzzleList[this.currentIndex];

    if (!puzzle) {
      this.showEmptyPuzzle("No puzzle found in this category.");
      return;
    }

    try {
      const started = this.puzzleService.startPuzzle(puzzle);

      this.currentPuzzle = started.puzzle;
      this.initializeBoard(this.currentPuzzle);
      this.resetPuzzleState();
      this.renderCurrentPuzzle();

    } catch (error) {
      this.showEmptyPuzzle(
        error?.message || "This puzzle could not be started."
      );
    }
  }

  initializeBoard(puzzle) {
    const fen = String(puzzle.fen || "");
    const fields = fen.split(" ");
    const rows = fields[0]?.split("/") || [];

    if (rows.length !== 8) {
      throw new Error("Invalid puzzle board position.");
    }

    this.boardPosition = [];

    for (const row of rows) {
      const parsed = [];

      for (const character of row) {
        if (/\d/.test(character)) {
          for (let i = 0; i < Number(character); i++) {
            parsed.push("");
          }
        } else if (PUZZLE_PIECES[character]) {
          parsed.push(character);
        } else {
          throw new Error("Invalid piece in puzzle position.");
        }
      }

      if (parsed.length !== 8) {
        throw new Error("Invalid chess board row.");
      }

      this.boardPosition.push(parsed);
    }

    this.positionTurn = fields[1] === "b" ? "b" : "w";
    this.playerColor = puzzle.sideToMove === "b" ||
      puzzle.sideToMove === "w"
      ? puzzle.sideToMove
      : this.positionTurn;
  }

  resetPuzzleState() {
    this.solved = false;
    this.hintsUsed = 0;
    this.selectedSquare = null;

    if (this.elements.nextButton) {
      this.elements.nextButton.disabled = true;
    }

    if (this.elements.checkButton) {
      this.elements.checkButton.disabled = false;
    }

    if (this.elements.hintButton) {
      this.elements.hintButton.disabled = false;
    }
  }

  renderCurrentPuzzle() {
    const puzzle = this.currentPuzzle;

    this.elements.title.textContent =
      puzzle.title || "Chess Challenge";

    this.elements.difficulty.textContent =
      String(puzzle.difficulty || this.selectedDifficulty).toUpperCase();

    this.elements.prompt.textContent =
      puzzle.description || "Find the best move for your side.";

    this.elements.feedback.textContent = "";
    this.elements.feedback.classList.remove("success", "error");

    this.renderPuzzleBoard();
  }

  renderPuzzleBoard() {
    this.elements.board.innerHTML = `
      <div class="puzzles-board-frame">
        <div class="puzzles-board" data-role="puzzle-board">
          ${this.createBoardSquares()}
        </div>
      </div>
    `;
  }

  createBoardSquares() {
    let html = "";

    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 8; column++) {
        const file = "abcdefgh"[column];
        const rank = 8 - row;
        const square = `${file}${rank}`;
        const piece = this.boardPosition[row][column];
        const light = (row + column) % 2 === 0;

        html += `
          <button type="button"
            class="puzzles-square ${light ? "light" : "dark"}"
            data-square="${square}"
            aria-label="${square}${piece ? ` ${piece}` : ""}">
            ${piece ? `<span>${PUZZLE_PIECES[piece]}</span>` : ""}
          </button>
        `;
      }
    }

    return html;
  }

/* =========================================================
   CORRECTION 14A COMPLETE
   FILE NOT COMPLETE YET
   NEXT: CORRECTION 14B — PART 2/2
   ========================================================= */
/* =========================================================
   APPARA CHESS
   CORRECTION 14B — PART 2/2
   FILE: js/screens/puzzles-screen.js
   CONTINUATION
   ========================================================= */

  selectBoardSquare(square) {
    if (!this.currentPuzzle || this.solved || this.loading) return;

    const position = this.getSquarePosition(square);
    if (!position) return;

    const piece = this.boardPosition[position.row][position.column];

    if (!this.selectedSquare) {
      if (!piece) {
        this.setFeedback("Select a square containing your piece.", "error");
        return;
      }

      if (!this.isPlayerPiece(piece)) {
        this.setFeedback("Select one of your own pieces.", "error");
        return;
      }

      this.selectedSquare = square;
      this.highlightSelectedSquare();
      this.setFeedback(
        `Selected ${square}. Now select the destination.`,
        ""
      );
      return;
    }

    const from = this.selectedSquare;
    const to = square;

    if (from === to) {
      this.selectedSquare = null;
      this.renderPuzzleBoard();
      this.setFeedback("Selection cleared.", "");
      return;
    }

    this.selectedSquare = null;
    this.submitMove({ from, to });
  }

  getSquarePosition(square) {
    if (!/^[a-h][1-8]$/.test(square)) return null;

    return {
      row: 8 - Number(square[1]),
      column: "abcdefgh".indexOf(square[0])
    };
  }

  isPlayerPiece(piece) {
    return this.playerColor === "w"
      ? piece === piece.toUpperCase()
      : piece === piece.toLowerCase();
  }

  highlightSelectedSquare() {
    this.renderPuzzleBoard();

    const selected = this.container.querySelector(
      `[data-square="${this.selectedSquare}"]`
    );

    selected?.classList.add("selected");
  }

  submitMove(move) {
    if (!this.puzzleService?.checkMove) {
      this.setFeedback("Puzzle move checker is unavailable.", "error");
      return;
    }

    try {
      const result = this.puzzleService.checkMove(move);

      this.attempts++;
      this.updateStats();

      if (!result.correct) {
        this.setFeedback(
          result.message || "Not quite. Try another move.",
          "error"
        );
        return;
      }

      this.applyBoardMove(move);

      if (result.completed) {
        this.handleCorrectAnswer();
        return;
      }

      this.setFeedback("Correct move! Continue.", "success");

      this.processOpponentReplies();

    } catch (error) {
      this.setFeedback(
        error?.message || "Unable to check this move.",
        "error"
      );
    }
  }

  processOpponentReplies() {
    let safetyCount = 0;

    while (
      this.currentPuzzle &&
      !this.solved &&
      safetyCount < 10
    ) {
      const progress = this.puzzleService.getProgress?.();
      const nextMove = this.puzzleService
        .getCurrentPuzzle?.()
        ?.solution?.[progress?.currentStep];

      if (!nextMove) return;

      const nextColor = this.positionTurn === "w" ? "b" : "w";

      // जब अगली चाल फिर खिलाड़ी की है, तो इंतजार करें।
      if (nextColor === this.playerColor) return;

      const reply = {
        from: nextMove.from,
        to: nextMove.to,
        promotion: nextMove.promotion || null
      };

      const result = this.puzzleService.checkMove(reply);

      if (!result.correct) {
        this.setFeedback(
          "Puzzle response could not be processed.",
          "error"
        );
        return;
      }

      this.applyBoardMove(reply);
      safetyCount++;

      if (result.completed) {
        this.handleCorrectAnswer();
        return;
      }
    }
  }

  applyBoardMove(move) {
    const from = this.getSquarePosition(move.from);
    const to = this.getSquarePosition(move.to);

    if (!from || !to) return false;

    const piece = this.boardPosition[from.row][from.column];

    if (!piece) return false;

    this.boardPosition[from.row][from.column] = "";

    let placedPiece = piece;

    if (move.promotion) {
      const promotion = String(move.promotion).toLowerCase();
      const promoted = promotion === "q" || promotion === "r" ||
        promotion === "b" || promotion === "n"
        ? promotion
        : "q";

      placedPiece = this.playerColor === "w"
        ? promoted.toUpperCase()
        : promoted;
    }

    this.boardPosition[to.row][to.column] = placedPiece;
    this.positionTurn = this.positionTurn === "w" ? "b" : "w";

    this.renderPuzzleBoard();
    return true;
  }

  async handleCorrectAnswer() {
    if (this.solved) return;

    this.solved = true;

    const puzzleId = this.currentPuzzle?.id;

    if (puzzleId) {
      this.solvedPuzzles.add(puzzleId);
    }

    this.setFeedback(
      "Excellent! Puzzle solved successfully.",
      "success"
    );

    this.elements.nextButton.disabled =
      this.currentIndex >= this.puzzleList.length - 1;

    this.elements.checkButton.disabled = true;
    this.elements.hintButton.disabled = true;

    await this.savePuzzleProgress();

    try {
      await this.puzzleService.completePuzzle();
    } catch {
      this.setFeedback(
        "Puzzle solved! Online reward could not be recorded.",
        "success"
      );
    }

    this.updateStats();
  }

  showHint() {
    if (!this.currentPuzzle || this.solved || this.loading) return;

    const progress = this.puzzleService.getProgress?.();
    const step = progress?.currentStep || 0;
    const move = this.currentPuzzle.solution?.[step];

    if (!move) {
      this.setFeedback("Hint is not available.", "error");
      return;
    }

    this.hintsUsed++;

    this.setFeedback(
      `Hint: Look for a move from ${move.from} to ${move.to}.`,
      ""
    );
  }

  checkAnswer() {
    if (!this.currentPuzzle || this.solved || this.loading) return;

    this.setFeedback(
      "Select one of your pieces, then select its destination square.",
      ""
    );
  }

  async savePuzzleProgress() {
    const profile = this.playerService?.getProfile?.();

    if (!profile) return;

    const puzzles = {
      ...(profile.puzzles || {}),
      solvedPuzzleIds: [...this.solvedPuzzles],
      attempts: this.attempts
    };

    try {
      if (typeof this.playerService.updateProfile === "function") {
        await this.playerService.updateProfile({ puzzles });
      }
    } catch (error) {
      console.warn("Puzzle progress could not be saved:", error);
    }
  }

  updateStats() {
    const solved = this.solvedPuzzles.size;

    const rate = this.attempts > 0
      ? Math.round((solved / this.attempts) * 100)
      : 0;

    if (this.elements.solvedCount) {
      this.elements.solvedCount.textContent = String(solved);
    }

    if (this.elements.attemptCount) {
      this.elements.attemptCount.textContent = String(this.attempts);
    }

    if (this.elements.successRate) {
      this.elements.successRate.textContent =
        `${Math.min(rate, 100)}%`;
    }
  }

  nextPuzzle() {
    if (!this.solved) {
      this.setFeedback(
        "Solve the current puzzle before moving to the next one.",
        "error"
      );
      return;
    }

    if (this.currentIndex >= this.puzzleList.length - 1) {
      this.setFeedback("You have reached the end of this puzzle set.", "");
      return;
    }

    this.currentIndex++;
    this.startCurrentPuzzle();
  }

  setFeedback(message, type = "") {
    if (!this.elements.feedback) return;

    this.elements.feedback.textContent = message;
    this.elements.feedback.classList.remove("success", "error");

    if (type) {
      this.elements.feedback.classList.add(type);
    }
  }

  showEmptyPuzzle(message) {
    this.currentPuzzle = null;
    this.puzzleList = [];

    if (this.elements.title) {
      this.elements.title.textContent = "Puzzle Unavailable";
    }

    if (this.elements.board) {
      this.elements.board.innerHTML = `
        <div class="puzzles-empty-state">
          <span>♘</span>
          <p>${this.escapeHTML(message)}</p>
        </div>
      `;
    }

    if (this.elements.feedback) {
      this.elements.feedback.textContent = "";
    }

    if (this.elements.nextButton) {
      this.elements.nextButton.disabled = true;
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

  goBack() {
    if (this.navigation?.back) {
      this.navigation.back();
    } else {
      this.navigation?.navigate?.("home");
    }
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;
    this.loadToken++;

    this.container?.removeEventListener("click", this.boundClick);

    try {
      this.puzzleService?.abandonPuzzle?.();
    } catch {
      // Ignore cleanup errors.
    }

    this.currentPuzzle = null;
    this.puzzleList = [];
    this.boardPosition = [];
    this.selectedSquare = null;
    this.elements = {};

    this.container?.replaceChildren();
  }
}

export function createPuzzlesScreen(options = {}) {
  return new PuzzlesScreen(options);
}

/* =========================================================
   CORRECTION 14B COMPLETE
   FULL FILE COMPLETE — CORRECTION NUMBER 14
   ========================================================= */
