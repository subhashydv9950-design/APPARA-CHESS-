/* =========================================================
   APPARA CHESS — PART 21M
   CHESS PUZZLE CONTROLLER
   FILE: js/puzzles.js
   PART 1/3 — DATABASE, STATE & CORE FUNCTIONS
========================================================= */

window.APPARA_PUZZLES = (function () {
  "use strict";

  const STORAGE_KEY = "appara_chess_puzzles_v1";

  const state = {
    initialized: false,
    active: false,
    completed: false,
    currentPuzzle: null,
    currentIndex: 0,
    attempts: 0,
    hintsUsed: 0,
    solved: 0,
    selectedLevel: "easy",
    elements: {},
    originalMoveHandler: null
  };

  /*
   * Puzzle positions use standard FEN notation.
   * Solution moves use UCI coordinates.
   */

  const puzzleDatabase = [
    {
      id: "AP-P001",
      title: "The Final Checkmate",
      level: "easy",
      category: "Mate in One",
      description: "Find the winning queen move.",
      fen: "7k/8/5QK1/8/8/8/8/8 w - - 0 1",
      solution: [
        {
          from: "f6",
          to: "f8",
          promotion: "q"
        }
      ],
      hint: "Look for a queen move that attacks the black king.",
      reward: 20,
      points: 100
    }
  ];

  const LEVELS = {
    easy: {
      label: "Easy",
      description: "Beginner-friendly puzzles"
    },
    medium: {
      label: "Medium",
      description: "Intermediate tactics"
    },
    hard: {
      label: "Hard",
      description: "Advanced combinations"
    },
    expert: {
      label: "Expert",
      description: "Challenging chess positions"
    }
  };

  function notify(message, type) {
    if (
      window.APPARA_APP &&
      typeof window.APPARA_APP.showNotification === "function"
    ) {
      window.APPARA_APP.showNotification(
        message,
        type || "info"
      );
    }
  }

  function getEngine() {
    return window.APPARA_ENGINE || null;
  }

  function getBoard() {
    return window.APPARA_BOARD || null;
  }

  function getPuzzleById(id) {
    return puzzleDatabase.find(function (puzzle) {
      return puzzle.id === id;
    }) || null;
  }

  function getPuzzlesByLevel(level) {
    return puzzleDatabase.filter(function (puzzle) {
      return puzzle.level === level;
    });
  }

  function getProgress() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return {
          solved: 0,
          attempts: 0,
          completedIds: [],
          points: 0
        };
      }

      const parsed = JSON.parse(saved);

      return {
        solved: Math.max(0, Number(parsed.solved) || 0),
        attempts: Math.max(0, Number(parsed.attempts) || 0),
        completedIds: Array.isArray(parsed.completedIds)
          ? parsed.completedIds
          : [],
        points: Math.max(0, Number(parsed.points) || 0)
      };

    } catch (error) {
      console.error("APPARA PUZZLE PROGRESS ERROR:", error);

      return {
        solved: 0,
        attempts: 0,
        completedIds: [],
        points: 0
      };
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(progress)
      );

      return true;

    } catch (error) {
      console.error("APPARA PUZZLE SAVE ERROR:", error);
      return false;
    }
  }

  function cacheElements() {
    state.elements = {
      solved: document.getElementById("puzzles-solved"),
      level: document.getElementById("puzzle-level"),
      container: document.getElementById("puzzle-container"),
      startButton: document.getElementById("start-puzzle-btn")
    };
  }

  function updateSolvedDisplay() {
    const progress = getProgress();

    if (state.elements.solved) {
      state.elements.solved.textContent =
        String(progress.solved);
    }
  }

  function updateLevelDisplay(level) {
    if (!state.elements.level) return;

    state.elements.level.textContent =
      LEVELS[level]?.label || "Easy";
  }

  function validatePuzzle(puzzle) {
    if (!puzzle || !puzzle.fen || !Array.isArray(puzzle.solution)) {
      return false;
    }

    const engine = getEngine();

    if (!engine || typeof engine.load !== "function") {
      return false;
    }

    const loaded = engine.load(puzzle.fen);

    return loaded !== false;
  }

  function getCurrentPuzzle() {
    return state.currentPuzzle
      ? { ...state.currentPuzzle }
      : null;
  }

  function getCurrentLevel() {
    return state.selectedLevel;
  }

  function setLevel(level) {
    if (!Object.prototype.hasOwnProperty.call(LEVELS, level)) {
      return false;
    }

    state.selectedLevel = level;
    updateLevelDisplay(level);

    return true;
  }

  function getAvailableLevels() {
    return Object.keys(LEVELS).map(function (key) {
      return {
        id: key,
        label: LEVELS[key].label,
        description: LEVELS[key].description,
        count: getPuzzlesByLevel(key).length
      };
    });
  }

  /* =======================================================
     PART 1/3 END
     CONTINUE DIRECTLY WITH PART 2/3 BELOW
  ======================================================= */
   /* =========================================================
   APPARA CHESS — PART 21M
   PART 2/3 — PUZZLE START, MOVE VALIDATION & HINTS
========================================================= */

  function getNextPuzzle() {
    const puzzles = getPuzzlesByLevel(state.selectedLevel);
    const progress = getProgress();

    if (puzzles.length === 0) {
      return null;
    }

    const available = puzzles.filter(function (puzzle) {
      return !progress.completedIds.includes(puzzle.id);
    });

    const collection = available.length > 0
      ? available
      : puzzles;

    return collection[0] || null;
  }

  function startPuzzle(puzzleId) {
    const puzzle = puzzleId
      ? getPuzzleById(puzzleId)
      : getNextPuzzle();

    if (!puzzle) {
      notify("No puzzles available for this level yet.", "warning");
      return false;
    }

    const engine = getEngine();
    const board = getBoard();

    if (!engine || !board) {
      notify("Chess engine or board is not ready.", "error");
      return false;
    }

    if (!validatePuzzle(puzzle)) {
      notify("This puzzle position could not be loaded.", "error");
      return false;
    }

    state.currentPuzzle = puzzle;
    state.currentIndex = 0;
    state.attempts = 0;
    state.hintsUsed = 0;
    state.completed = false;
    state.active = true;

    engine.load(puzzle.fen);

    if (typeof board.clearSelection === "function") {
      board.clearSelection();
    }

    if (typeof board.clearLastMove === "function") {
      board.clearLastMove();
    }

    if (typeof board.setMoveHandler === "function") {
      board.setMoveHandler(handlePlayerMove);
    }

    if (typeof board.render === "function") {
      board.render();
    } else if (typeof board.refresh === "function") {
      board.refresh();
    }

    renderPuzzle();

    notify("Puzzle started. Find the correct move!", "success");

    return true;
  }

  function renderPuzzle() {
    const container = state.elements.container;

    if (!container || !state.currentPuzzle) {
      return;
    }

    container.replaceChildren();

    const wrapper = document.createElement("div");
    wrapper.className = "puzzle-info";

    const heading = document.createElement("h3");
    heading.textContent = state.currentPuzzle.title;

    const category = document.createElement("span");
    category.className = "puzzle-category";
    category.textContent = state.currentPuzzle.category;

    const description = document.createElement("p");
    description.textContent = state.currentPuzzle.description;

    const status = document.createElement("p");
    status.className = "puzzle-status";
    status.id = "puzzle-status";
    status.textContent = "Find the best move.";

    const hintButton = document.createElement("button");
    hintButton.type = "button";
    hintButton.className = "btn btn-secondary";
    hintButton.textContent = "Show Hint";
    hintButton.addEventListener("click", showHint);

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "btn btn-primary";
    nextButton.textContent = "Next Puzzle";
    nextButton.disabled = true;
    nextButton.id = "next-puzzle-btn";
    nextButton.addEventListener("click", function () {
      startPuzzle();
    });

    wrapper.appendChild(heading);
    wrapper.appendChild(category);
    wrapper.appendChild(description);
    wrapper.appendChild(status);
    wrapper.appendChild(hintButton);
    wrapper.appendChild(nextButton);

    container.appendChild(wrapper);
  }

  function updatePuzzleStatus(message, type) {
    const status = document.getElementById("puzzle-status");

    if (!status) return;

    status.textContent = message;
    status.className = "puzzle-status " + (type || "");
  }

  function handlePlayerMove(move) {
    if (
      !state.active ||
      state.completed ||
      !state.currentPuzzle
    ) {
      return false;
    }

    if (!move || !move.from || !move.to) {
      return false;
    }

    const expected = state.currentPuzzle.solution[
      state.currentIndex
    ];

    if (!expected) {
      return false;
    }

    const actualFrom = String(move.from).toLowerCase();
    const actualTo = String(move.to).toLowerCase();

    const expectedFrom = String(expected.from).toLowerCase();
    const expectedTo = String(expected.to).toLowerCase();

    const actualPromotion = String(
      move.promotion || "q"
    ).toLowerCase();

    const expectedPromotion = String(
      expected.promotion || "q"
    ).toLowerCase();

    const isCorrect =
      actualFrom === expectedFrom &&
      actualTo === expectedTo &&
      actualPromotion === expectedPromotion;

    state.attempts += 1;

    if (!isCorrect) {
      updatePuzzleStatus(
        "Not the correct move. Try again!",
        "incorrect"
      );

      notify("Incorrect move. Think again!", "warning");

      return false;
    }

    const engine = getEngine();
    const board = getBoard();

    const result = engine.move({
      from: expected.from,
      to: expected.to,
      promotion: expected.promotion || "q"
    });

    if (!result) {
      updatePuzzleStatus(
        "Move could not be applied. Try again.",
        "incorrect"
      );

      return false;
    }

    state.currentIndex += 1;

    if (typeof board.clearSelection === "function") {
      board.clearSelection();
    }

    if (typeof board.setLastMove === "function") {
      board.setLastMove({
        from: expected.from,
        to: expected.to
      });
    }

    if (typeof board.refresh === "function") {
      board.refresh();
    } else if (typeof board.render === "function") {
      board.render();
    }

    if (
      state.currentIndex >=
      state.currentPuzzle.solution.length
    ) {
      completePuzzle();
      return true;
    }

    updatePuzzleStatus(
      "Correct! Continue finding the next move.",
      "correct"
    );

    return true;
  }

  function showHint() {
    if (
      !state.active ||
      state.completed ||
      !state.currentPuzzle
    ) {
      notify("Start a puzzle first.", "warning");
      return;
    }

    const expected = state.currentPuzzle.solution[
      state.currentIndex
    ];

    if (!expected) return;

    state.hintsUsed += 1;

    const hint = state.currentPuzzle.hint ||
      "Look for the strongest forcing move.";

    updatePuzzleStatus(
      "Hint: " + hint,
      "hint"
    );

    notify("Hint revealed.", "info");

    return {
      from: expected.from,
      to: expected.to
    };
  }

  function completePuzzle() {
    if (!state.currentPuzzle || state.completed) {
      return false;
    }

    state.completed = true;
    state.active = false;
    state.solved += 1;

    const progress = getProgress();

    if (!progress.completedIds.includes(state.currentPuzzle.id)) {
      progress.completedIds.push(state.currentPuzzle.id);
      progress.solved += 1;

      const earnedPoints = Math.max(
        10,
        Number(state.currentPuzzle.points) || 100
      );

      progress.points += earnedPoints;

      saveProgress(progress);

      if (
        window.APPARA_PROFILE &&
        typeof window.APPARA_PROFILE.addPuzzleSolved === "function"
      ) {
        window.APPARA_PROFILE.addPuzzleSolved();
      }

      if (
        window.APPARA_PROFILE &&
        typeof window.APPARA_PROFILE.addCoins === "function"
      ) {
        window.APPARA_PROFILE.addCoins(
          Math.max(0, Number(state.currentPuzzle.reward) || 0)
        );
      }
    }

    updateSolvedDisplay();

    updatePuzzleStatus(
      "Puzzle solved! Excellent work.",
      "correct"
    );

    const nextButton = document.getElementById("next-puzzle-btn");

    if (nextButton) {
      nextButton.disabled = false;
    }

    notify("Puzzle completed successfully!", "success");

    return true;
  }

  function stopPuzzle() {
    state.active = false;
    state.completed = false;
    state.currentPuzzle = null;
    state.currentIndex = 0;
    state.attempts = 0;
    state.hintsUsed = 0;

    const board = getBoard();

    if (board) {
      if (typeof board.setMoveHandler === "function") {
        board.setMoveHandler(null);
      }

      if (typeof board.clearSelection === "function") {
        board.clearSelection();
      }
    }

    return true;
  }

  /* =======================================================
     PART 2/3 END
     CONTINUE DIRECTLY WITH PART 3/3 BELOW
  ======================================================= */
/* =========================================================
   APPARA CHESS — PART 21M
   PART 3/3 — PROGRESS, INITIALIZATION & PUBLIC API
========================================================= */

  function getPuzzleStats() {
    const progress = getProgress();

    const total = puzzleDatabase.length;
    const remaining = Math.max(
      0,
      total - progress.completedIds.length
    );

    return {
      total: total,
      solved: progress.solved,
      remaining: remaining,
      attempts: progress.attempts,
      points: progress.points,
      currentLevel: state.selectedLevel,
      currentAttempts: state.attempts,
      hintsUsed: state.hintsUsed
    };
  }

  function getPuzzleList(level) {
    const selectedLevel = level || state.selectedLevel;
    const progress = getProgress();

    return getPuzzlesByLevel(selectedLevel).map(function (puzzle) {
      return {
        id: puzzle.id,
        title: puzzle.title,
        level: puzzle.level,
        category: puzzle.category,
        completed: progress.completedIds.includes(puzzle.id),
        reward: puzzle.reward,
        points: puzzle.points
      };
    });
  }

  function recordAttempt() {
    const progress = getProgress();

    progress.attempts += 1;

    saveProgress(progress);

    return progress.attempts;
  }

  function resetProgress() {
    const confirmed = window.confirm(
      "Are you sure you want to reset all puzzle progress?"
    );

    if (!confirmed) return false;

    const progress = {
      solved: 0,
      attempts: 0,
      completedIds: [],
      points: 0
    };

    saveProgress(progress);

    state.solved = 0;
    state.attempts = 0;
    state.hintsUsed = 0;
    state.completed = false;

    updateSolvedDisplay();

    notify("Puzzle progress reset.", "success");

    return true;
  }

  function bindEvents() {
    const button = state.elements.startButton;

    if (!button || button.dataset.puzzleBound === "true") {
      return;
    }

    button.addEventListener("click", function () {
      startPuzzle();
    });

    button.dataset.puzzleBound = "true";
  }

  function init() {
    if (state.initialized) {
      updateSolvedDisplay();
      return true;
    }

    cacheElements();

    const progress = getProgress();

    state.solved = progress.solved;

    bindEvents();
    updateSolvedDisplay();
    updateLevelDisplay(state.selectedLevel);

    state.initialized = true;

    return true;
  }

  function destroy() {
    stopPuzzle();

    const button = state.elements.startButton;

    if (button && button.dataset.puzzleBound === "true") {
      button.replaceWith(button.cloneNode(true));
    }

    state.initialized = false;
    state.elements = {};

    return true;
  }

  return {
    init,
    destroy,

    startPuzzle,
    stopPuzzle,
    getNextPuzzle,
    getPuzzleById,
    getPuzzlesByLevel,
    getPuzzleList,

    setLevel,
    getCurrentLevel,
    getCurrentPuzzle,
    getAvailableLevels,

    showHint,
    handlePlayerMove,
    completePuzzle,

    getProgress,
    getPuzzleStats,
    resetProgress,

    updateSolvedDisplay,
    renderPuzzle
  };

})();

/* =========================================================
   APPARA CHESS — PUZZLE CONTROLLER
   PART 21M COMPLETE
   FILE: js/puzzles.js
========================================================= */
