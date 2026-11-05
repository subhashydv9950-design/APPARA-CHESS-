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

    this.loading = false;
    this.solved = false;
    this.destroyed = false;

    this.selectedSquare = null;
    this.unsubscribePuzzle = null;
    this.elements = {};
  }

  mount(container = this.container) {
    if (!container) {
      throw new Error("PuzzlesScreen requires a container.");
    }

    this.container = container;
    this.destroyed = false;

    this.render();
    this.bindEvents();
    this.loadPuzzleProgress();
    this.loadSelectedCategory();

    return this;
  }

  render() {
    this.container.innerHTML = `
      <main class="puzzles-screen">

        <header class="puzzles-header">
          <button type="button" class="puzzles-back-button"
            data-action="back">←</button>

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
            Select the piece and then its destination square.
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

  bindEvents() {
    this.container.addEventListener("click", event => {
      const category = event.target.closest("[data-category]");

      if (category) {
        this.selectCategory(category.dataset.category);
        return;
      }

      const difficulty = event.target.closest("[data-difficulty]");

      if (difficulty) {
        this.selectDifficulty(difficulty.dataset.difficulty);
        return;
      }

      const square = event.target.closest("[data-square]");

      if (square) {
        this.selectBoardSquare(square.dataset.square);
        return;
      }

      const action = event.target.closest("[data-action]");

      if (!action) return;

      switch (action.dataset.action) {
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
    });
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
    if (this.loading || this.destroyed) return;

    if (!this.puzzleService) {
      this.showEmptyPuzzle("Puzzle service is not connected yet.");
      return;
    }

    this.loading = true;
    this.resetPuzzleState();

    this.elements.title.textContent = "Loading Puzzle...";
    this.elements.feedback.textContent = "";
    this.elements.board.innerHTML = `
      <div class="puzzles-loading">
        <span>♟</span><p>Preparing your puzzle...</p>
      </div>
    `;

    try {
      let result;

      if (this.selectedCategory === "daily") {
        result = await this.puzzleService.getDailyPuzzle();
      } else {
        const themeMap = {
          mate: "mate",
          tactics: "tactics",
          endgame: "endgame"
        };

        result = await this.puzzleService.getPuzzleSet({
          difficulty: this.selectedDifficulty,
          theme: themeMap[this.selectedCategory],
          limit: 10
        });
      }

      if (this.destroyed) return;

      this.setPuzzleResult(result);

    } catch (error) {
      this.showEmptyPuzzle(
        error?.message || "Unable to load puzzles."
      );

    } finally {
      this.loading = false;
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
    this.currentPuzzle = this.puzzleList[0] || null;

    if (!this.currentPuzzle) {
      this.showEmptyPuzzle("No puzzle found in this category.");
      return;
    }

    // PuzzleService requires startPuzzle before checkMove.
    const started = this.puzzleService.startPuzzle(
      this.currentPuzzle
    );

    this.currentPuzzle = started.puzzle;
    this.renderCurrentPuzzle();
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
      puzzle.description || "Select a piece, then its destination square.";

    this.elements.feedback.textContent = "";
    this.elements.board.innerHTML = "";

    this.renderPuzzleBoard(puzzle);
  }

  renderPuzzleBoard(puzzle) {
    if (!puzzle.fen) {
      this.showEmptyPuzzle("Board position is missing from this puzzle.");
      return;
    }

    this.elements.board.innerHTML = `
      <div class="puzzles-board-frame">
        <div class="puzzles-board" data-role="puzzle-board">
          ${this.createBoardSquares(puzzle.fen)}
        </div>
      </div>
    `;
  }

  createBoardSquares(fen) {
    const rows = fen.split(" ")[0].split("/");
    const symbols = {
      K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
      k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟"
    };

    if (rows.length !== 8) return "";

    let html = "";

    rows.forEach((row, rowIndex) => {
      let column = 0;

      for (const character of row) {
        if (/\d/.test(character)) {
          const count = Number(character);

          for (let i = 0; i < count; i++) {
            html += this.createSquare(rowIndex, column, "");
            column++;
          }
        } else {
          html += this.createSquare(
            rowIndex,
            column,
            symbols[character] || ""
          );
          column++;
        }
      }
    });

    return html;
  }

  createSquare(row, column, piece) {
    const file = "abcdefgh"[column];
    const rank = 8 - row;
    const square = `${file}${rank}`;
    const light = (row + column) % 2 === 0;

    return `
      <button type="button"
        class="puzzles-square ${light ? "light" : "dark"}"
        data-square="${square}"
        aria-label="${square}">
        ${piece ? `<span>${piece}</span>` : ""}
      </button>
    `;
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

    const button = this.container.querySelector(
      `[data-square="${square}"]`
    );

    if (!button) return;

    if (!this.selectedSquare) {
      this.selectedSquare = square;
      button.classList.add("selected");
      this.elements.feedback.textContent =
        `Selected ${square}. Now select the destination square.`;
      return;
    }

    const from = this.selectedSquare;
    const to = square;

    this.container.querySelectorAll(".puzzles-square.selected")
      .forEach(item => item.classList.remove("selected"));

    this.selectedSquare = null;

    if (from === to) {
      this.elements.feedback.textContent = "Select a different destination square.";
      return;
    }

    this.submitMove({ from, to });
  }

  submitMove(move) {
    if (!this.puzzleService?.checkMove) {
      this.elements.feedback.textContent =
        "Puzzle move checker is not available.";
      return;
    }

    try {
      const result = this.puzzleService.checkMove(move);

      this.attempts++;
      this.updateStats();

      if (!result.correct) {
        this.handleIncorrectAnswer(result);
        return;
      }

      if (result.completed) {
        this.handleCorrectAnswer(result);
        return;
      }

      this.elements.feedback.textContent =
        "Correct move! Continue with the next move in the solution.";

      this.elements.feedback.classList.remove("error");
      this.elements.feedback.classList.add("success");

      if (result.nextMove) {
        this.applyAutomaticReply(result.nextMove);
      }

    } catch (error) {
      this.elements.feedback.textContent =
        error?.message || "Unable to check this move.";
    }
  }

  applyAutomaticReply(move) {
    /*
      The service solution can contain both sides' moves.
      The reply is applied to the visual position only when
      the puzzle board can be updated safely.
    */
    if (!move?.from || !move?.to) return;

    const fromButton = this.container.querySelector(
      `[data-square="${move.from}"]`
    );

    const toButton = this.container.querySelector(
      `[data-square="${move.to}"]`
    );

    if (!fromButton || !toButton) return;

    const piece = fromButton.querySelector("span");

    toButton.replaceChildren();

    if (piece) {
      toButton.append(piece.cloneNode(true));
    }

    fromButton.replaceChildren();
  }

  handleIncorrectAnswer(result = {}) {
    this.elements.feedback.textContent =
      result.message || "Not quite. Review the position and try again.";

    this.elements.feedback.classList.remove("success");
    this.elements.feedback.classList.add("error");
  }

  async handleCorrectAnswer(result = {}) {
    this.solved = true;

    const puzzleId = this.currentPuzzle?.id;

    if (puzzleId) {
      this.solvedPuzzles.add(puzzleId);
    }

    this.elements.feedback.textContent =
      "Excellent! Puzzle solved successfully.";

    this.elements.feedback.classList.remove("error");
    this.elements.feedback.classList.add("success");

    this.elements.nextButton.disabled =
      this.currentIndex >= this.puzzleList.length - 1;

    this.elements.checkButton.disabled = true;
    this.elements.hintButton.disabled = true;

    await this.savePuzzleProgress();

    // Completion is recorded by the backend when the player is logged in.
    try {
      await this.puzzleService.completePuzzle();
    } catch (error) {
      this.elements.feedback.textContent +=
        " Your local result is saved; online reward could not be recorded.";
    }

    this.updateStats();
  }

  async showHint() {
    if (!this.currentPuzzle || this.solved || this.loading) return;

    const solution = this.currentPuzzle.solution;

    if (!Array.isArray(solution) || !solution.length) {
      this.elements.feedback.textContent =
        "Hint is not available for this puzzle.";
      return;
    }

    this.hintsUsed++;

    const move = solution[0];

    this.elements.feedback.textContent =
      `Hint: Look carefully at the move from ${move.from} to ${move.to}.`;
  }

  async checkAnswer() {
    if (!this.currentPuzzle || this.solved || this.loading) return;

    this.elements.feedback.textContent =
      "Select a piece on the board, then select its destination square.";
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
        await this.playerService.updateProfile({
          puzzles
        });
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
      this.elements.feedback.textContent =
        "Solve the current puzzle before moving to the next one.";
      return;
    }

    if (this.currentIndex >= this.puzzleList.length - 1) {
      this.elements.feedback.textContent =
        "You have reached the end of this puzzle set.";
      return;
    }

    this.currentIndex++;
    this.currentPuzzle = this.puzzleList[this.currentIndex];

    this.resetPuzzleState();

    try {
      const started = this.puzzleService.startPuzzle(
        this.currentPuzzle
      );

      this.currentPuzzle = started.puzzle;
      this.renderCurrentPuzzle();

    } catch (error) {
      this.showEmptyPuzzle(
        error?.message || "The next puzzle could not be started."
      );
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
    this.loading = false;

    this.unsubscribePuzzle?.();
    this.unsubscribePuzzle = null;

    if (this.puzzleService?.abandonPuzzle) {
      try {
        this.puzzleService.abandonPuzzle();
      } catch {
        // Ignore cleanup errors.
      }
    }

    this.currentPuzzle = null;
    this.puzzleList = [];
    this.solvedPuzzles.clear();
    this.selectedSquare = null;

    if (this.container) {
      this.container.replaceChildren();
    }

    this.elements = {};
  }
}

export function createPuzzlesScreen(options = {}) {
  return new PuzzlesScreen(options);
}

/* =========================================================
   CORRECTION 14B COMPLETE
   FULL FILE COMPLETE — CORRECTION NUMBER 14
   ========================================================= */
