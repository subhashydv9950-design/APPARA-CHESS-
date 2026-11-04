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
