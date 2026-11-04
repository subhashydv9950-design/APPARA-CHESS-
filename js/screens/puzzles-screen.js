
/* =========================================================
   APPARA CHESS — FILE 57A
   SCREEN: PUZZLES CENTER
   PATH: js/screens/puzzles-screen.js
   PART 1/2 — SAME FILE
========================================================= */

const PUZZLE_CATEGORIES = [
  {
    id: "daily",
    title: "Daily Challenge",
    subtitle: "A fresh challenge every day",
    icon: "📅"
  },
  {
    id: "mate",
    title: "Checkmate Puzzles",
    subtitle: "Find the winning checkmate",
    icon: "♔"
  },
  {
    id: "tactics",
    title: "Tactical Puzzles",
    subtitle: "Forks, pins and combinations",
    icon: "⚔"
  },
  {
    id: "endgame",
    title: "Endgame Puzzles",
    subtitle: "Master the final phase",
    icon: "♜"
  }
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

    this.elements = {};
    this.unsubscribePuzzle = null;
  }

  mount(container = this.container) {
    if (!container) {
      throw new Error("PuzzlesScreen requires a container element.");
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
          <button
            type="button"
            class="puzzles-back-button"
            data-action="back"
            aria-label="Go back"
          >←</button>

          <div class="puzzles-heading">
            <span class="puzzles-eyebrow">APPARA CHESS ACADEMY</span>
            <h1>Puzzle Arena</h1>
            <p>Train your mind. Discover the winning move.</p>
          </div>

          <div class="puzzles-header-icon" aria-hidden="true">♞</div>
        </header>

        <section class="puzzles-hero">
          <div class="puzzles-hero-content">
            <span class="puzzles-hero-label">SHARPEN YOUR MIND</span>
            <h2>Every position has a secret.</h2>
            <p>
              Solve chess positions, improve your calculation
              and become a stronger player.
            </p>
            <button type="button" data-action="daily">
              Daily Challenge →
            </button>
          </div>

          <div class="puzzles-hero-art" aria-hidden="true">
            <span>♛</span>
            <span>♞</span>
          </div>
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
            <div>
              <span class="puzzles-kicker">EXPLORE CHALLENGES</span>
              <h2>Puzzle Categories</h2>
            </div>
          </div>

          <div class="puzzles-category-grid">
            ${PUZZLE_CATEGORIES.map(category => `
              <button
                type="button"
                class="puzzles-category-card ${category.id === this.selectedCategory ? "active" : ""}"
                data-category="${category.id}"
                aria-pressed="${category.id === this.selectedCategory}"
              >
                <span class="puzzles-category-icon">${category.icon}</span>
                <strong>${category.title}</strong>
                <small>${category.subtitle}</small>
              </button>
            `).join("")}
          </div>
        </section>

        <section class="puzzles-section">
          <div class="puzzles-section-heading">
            <div>
              <span class="puzzles-kicker">CHOOSE YOUR LEVEL</span>
              <h2>Difficulty</h2>
            </div>
          </div>

          <div class="puzzles-difficulty-list">
            ${PUZZLE_DIFFICULTIES.map(level => `
              <button
                type="button"
                class="puzzles-difficulty-button ${level.id === this.selectedDifficulty ? "active" : ""}"
                data-difficulty="${level.id}"
                aria-pressed="${level.id === this.selectedDifficulty}"
              >
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

            <span class="puzzles-difficulty-badge" data-role="puzzle-difficulty">
              EASY
            </span>
          </div>

          <div class="puzzles-board-placeholder" data-role="board-area">
            <div class="puzzles-loading">
              <span>♟</span>
              <p>Preparing your puzzle...</p>
            </div>
          </div>

          <div class="puzzles-prompt" data-role="prompt">
            Find the best move for the current position.
          </div>

          <div class="puzzles-feedback" data-role="feedback" aria-live="polite"></div>

          <div class="puzzles-controls">
            <button type="button" data-action="hint">
              💡 Hint
            </button>

            <button type="button" data-action="check">
              Check Answer
            </button>

            <button type="button" data-action="next" disabled>
              Next Puzzle →
            </button>
          </div>
        </section>

        <section class="puzzles-section puzzles-extra-section">
          <div class="puzzles-section-heading">
            <div>
              <span class="puzzles-kicker">KEEP IMPROVING</span>
              <h2>More Practice</h2>
            </div>
          </div>

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
      const categoryButton = event.target.closest("[data-category]");

      if (categoryButton) {
        this.selectCategory(categoryButton.dataset.category);
        return;
      }

      const difficultyButton = event.target.closest("[data-difficulty]");

      if (difficultyButton) {
        this.selectDifficulty(difficultyButton.dataset.difficulty);
        return;
      }

      const actionButton = event.target.closest("[data-action]");

      if (!actionButton) return;

      switch (actionButton.dataset.action) {
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
            setup: true,
            source: "puzzles"
          });
          break;

        default:
          break;
      }
    });
  }

  selectCategory(categoryId) {
    if (!PUZZLE_CATEGORIES.some(item => item.id === categoryId)) {
      return;
    }

    this.selectedCategory = categoryId;

    this.container.querySelectorAll("[data-category]").forEach(button => {
      const active = button.dataset.category === categoryId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    this.loadSelectedCategory();
  }

  selectDifficulty(difficultyId) {
    if (!PUZZLE_DIFFICULTIES.some(item => item.id === difficultyId)) {
      return;
    }

    this.selectedDifficulty = difficultyId;

    this.container.querySelectorAll("[data-difficulty]").forEach(button => {
      const active = button.dataset.difficulty === difficultyId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    this.loadSelectedCategory();
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
    if (!this.puzzleService || this.loading) {
      if (!this.puzzleService) {
        this.showEmptyPuzzle(
          "Puzzle service is not available yet."
        );
      }
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

      if (
        this.selectedCategory === "daily" &&
        typeof this.puzzleService.getDailyPuzzle === "function"
      ) {
        result = await this.puzzleService.getDailyPuzzle();
      } else if (
        typeof this.puzzleService.getPuzzles === "function"
      ) {
        result = await this.puzzleService.getPuzzles({
          category: this.selectedCategory,
          difficulty: this.selectedDifficulty,
          limit: 10
        });
      } else if (
        typeof this.puzzleService.getPuzzleSet === "function"
      ) {
        result = await this.puzzleService.getPuzzleSet({
          category: this.selectedCategory,
          difficulty: this.selectedDifficulty
        });
      }

      if (this.destroyed) return;

      this.setPuzzleResult(result);
    } catch (error) {
      this.showEmptyPuzzle(
        error?.message || "Unable to load puzzles. Please try again."
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
      this.currentIndex = 0;
      this.currentPuzzle = this.puzzleList[0] || null;
    } else if (Array.isArray(result.puzzles)) {
      this.puzzleList = result.puzzles;
      this.currentIndex = 0;
      this.currentPuzzle = this.puzzleList[0] || null;
    } else {
      this.puzzleList = [result];
      this.currentIndex = 0;
      this.currentPuzzle = result.puzzle || result;
    }

    if (!this.currentPuzzle) {
      this.showEmptyPuzzle("No puzzle found in this category.");
      return;
    }

    this.renderCurrentPuzzle();
  }

  resetPuzzleState() {
    this.solved = false;
    this.hintsUsed = 0;
    this.elements.nextButton.disabled = true;
    this.elements.checkButton.disabled = false;
    this.elements.hintButton.disabled = false;
  }

  renderCurrentPuzzle() {
    const puzzle = this.currentPuzzle;

    const title = puzzle.title || "Chess Challenge";
    const difficulty = puzzle.difficulty || this.selectedDifficulty;
    const prompt = puzzle.instruction ||
      puzzle.description ||
      "Find the best move for the current position.";

    this.elements.title.textContent = title;
    this.elements.difficulty.textContent = String(difficulty).toUpperCase();
    this.elements.prompt.textContent = prompt;

    this.elements.feedback.textContent = "";
    this.elements.board.innerHTML = "";

    this.renderPuzzleBoard(puzzle);

    this.elements.nextButton.disabled =
      this.puzzleList.length <= 1 || this.currentIndex >= this.puzzleList.length - 1;
  }

  renderPuzzleBoard(puzzle) {
    const fen = puzzle.fen || puzzle.position || "";

    if (!fen) {
      this.elements.board.innerHTML = `
        <div class="puzzles-board-unavailable">
          <span>♟</span>
          <p>Board position is not available for this puzzle.</p>
        </div>
      `;
      return;
    }

    this.elements.board.innerHTML = `
      <div class="puzzles-board-frame">
        <div class="puzzles-board" data-role="puzzle-board">
          ${this.createBoardSquares(fen)}
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

    let html = "";

    rows.forEach((row, rowIndex) => {
      let column = 0;

      for (const character of row) {
        if (/\d/.test(character)) {
          const emptyCount = Number(character);

          for (let i = 0; i < emptyCount; i++) {
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
    const light = (row + column) % 2 === 0;

    return `
      <div class="puzzles-square ${light ? "light" : "dark"}">
        ${piece ? `<span>${piece}</span>` : ""}
      </div>
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
   FILE 57A END — PART 1/2
   CLASS CONTINUES IN PART 57B.
   DO NOT CLOSE THE CLASS HERE.
========================================================= */
   
/* =========================================================
   APPARA CHESS — FILE 57B
   SCREEN: PUZZLES CENTER
   PART 2/2 — CONTINUATION
========================================================= */

  async showHint() {
    if (!this.currentPuzzle || this.solved || this.loading) return;

    if (typeof this.puzzleService?.getHint !== "function") {
      this.elements.feedback.textContent =
        "Hint is not available for this puzzle.";
      return;
    }

    try {
      this.hintsUsed++;

      const puzzleId =
        this.currentPuzzle.id || this.currentPuzzle.puzzleId;

      const result = await this.puzzleService.getHint(puzzleId);

      if (this.destroyed) return;

      const hint = typeof result === "string"
        ? result
        : result?.hint || result?.message;

      this.elements.feedback.textContent =
        hint || "Think about checks, captures and threats.";
    } catch (error) {
      this.elements.feedback.textContent =
        error?.message || "Unable to get a hint.";
    }
  }

  async checkAnswer() {
    if (!this.currentPuzzle || this.solved || this.loading) return;

    const puzzleId =
      this.currentPuzzle.id || this.currentPuzzle.puzzleId;

    if (!puzzleId) {
      this.elements.feedback.textContent =
        "This puzzle does not have a valid ID.";
      return;
    }

    const answer = this.currentPuzzle.answer ||
      this.currentPuzzle.solution ||
      this.currentPuzzle.moves?.[0];

    if (!answer) {
      this.elements.feedback.textContent =
        "The answer for this puzzle is not available.";
      return;
    }

    this.attempts++;
    this.updateStats();

    this.elements.feedback.textContent =
      "Submit your move on the chessboard to check the answer.";

    this.elements.feedback.classList.remove("success", "error");

    /*
      Puzzle validation must be performed by PuzzleService.
      This screen intentionally does not award rewards locally.
      The actual move-submission flow will be connected with
      the chessboard interaction in the integration stage.
    */

    if (typeof this.puzzleService?.checkSolution === "function") {
      try {
        const result = await this.puzzleService.checkSolution(
          puzzleId,
          answer
        );

        if (this.destroyed) return;

        if (result?.correct === true || result?.success === true) {
          await this.handleCorrectAnswer(puzzleId, result);
        } else {
          this.handleIncorrectAnswer();
        }
      } catch (error) {
        this.elements.feedback.textContent =
          error?.message || "Unable to verify this answer.";
      }

      return;
    }

    this.elements.feedback.textContent =
      "Move submission will be connected to the interactive board.";
  }

  handleIncorrectAnswer() {
    this.elements.feedback.textContent =
      "Not quite. Review the position and try again.";

    this.elements.feedback.classList.remove("success");
    this.elements.feedback.classList.add("error");
  }

  async handleCorrectAnswer(puzzleId, result = {}) {
    this.solved = true;
    this.solvedPuzzles.add(puzzleId);

    this.elements.feedback.textContent =
      result.message || "Excellent! Puzzle solved successfully.";

    this.elements.feedback.classList.remove("error");
    this.elements.feedback.classList.add("success");

    this.elements.nextButton.disabled =
      this.currentIndex >= this.puzzleList.length - 1;

    this.elements.checkButton.disabled = true;
    this.elements.hintButton.disabled = true;

    await this.savePuzzleProgress();

    this.updateStats();
  }

  async savePuzzleProgress() {
    const profile = this.playerService?.getProfile?.();

    if (!profile) return;

    profile.puzzles = profile.puzzles || {};
    profile.puzzles.solvedPuzzleIds = [...this.solvedPuzzles];
    profile.puzzles.attempts = this.attempts;

    if (typeof this.playerService.replaceProfile === "function") {
      await this.playerService.replaceProfile(profile);
    } else if (typeof this.playerService.updateProfile === "function") {
      await this.playerService.updateProfile(current => {
        current.puzzles = current.puzzles || {};
        current.puzzles.solvedPuzzleIds = [...this.solvedPuzzles];
        current.puzzles.attempts = this.attempts;
      });
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
      this.elements.successRate.textContent = `${Math.min(rate, 100)}%`;
    }
  }

  nextPuzzle() {
    if (!this.solved && this.currentPuzzle) {
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
    this.renderCurrentPuzzle();
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
    this.destroyed = true;
    this.loading = false;

    if (typeof this.unsubscribePuzzle === "function") {
      this.unsubscribePuzzle();
      this.unsubscribePuzzle = null;
    }

    this.currentPuzzle = null;
    this.puzzleList = [];
    this.solvedPuzzles.clear();

    if (this.container) {
      this.container.innerHTML = "";
    }

    this.elements = {};
  }
}

export function createPuzzlesScreen(options = {}) {
  return new PuzzlesScreen(options);
}

/* =========================================================
   FILE 57B END — FILE 57 COMPLETE
   PATH: js/screens/puzzles-screen.js
========================================================= */

