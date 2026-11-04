
/* =========================================================
   APPARA CHESS — FILE 45
   FILE: js/services/puzzle-service.js
   SECTION: CHESS PUZZLES
   ========================================================= */

export const PUZZLE_EVENTS = Object.freeze({
  LOADED: "puzzle:loaded",
  STARTED: "puzzle:started",
  MOVE_CORRECT: "puzzle:move-correct",
  MOVE_WRONG: "puzzle:move-wrong",
  COMPLETED: "puzzle:completed",
  FAILED: "puzzle:failed",
  DAILY_CLAIMED: "puzzle:daily-claimed",
  RATING_UPDATED: "puzzle:rating-updated",
  ERROR: "puzzle:error"
});

export const PUZZLE_DIFFICULTIES = Object.freeze({
  BEGINNER: "beginner",
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
  EXPERT: "expert",
  MASTER: "master"
});

export const PUZZLE_CONFIG = Object.freeze({
  startingRating: 1000,
  ratingMinimum: 100,
  ratingMaximum: 3000,
  correctRatingGain: 8,
  wrongRatingLoss: 5,
  baseXP: 15,
  completionCoins: 10,
  dailyBonusCoins: 50,
  maxDailyAttempts: 20
});

export class PuzzleService {
  constructor({
    firebaseService,
    authService,
    playerService,
    progressionService,
    economyService
  } = {}) {
    this.firebase = firebaseService;
    this.auth = authService;
    this.players = playerService;
    this.progression = progressionService;
    this.economy = economyService;

    this.listeners = new Map();
    this.currentPuzzle = null;
    this.currentStep = 0;
    this.attempts = 0;
    this.solved = false;
    this.puzzleRating = PUZZLE_CONFIG.startingRating;
    this.initialized = false;
  }

  initialize() {
    if (!this.firebase || !this.auth || !this.players) {
      throw new Error("PuzzleService dependencies missing.");
    }

    this.initialized = true;
    return this;
  }

  getUID() {
    const user = this.auth.currentUser || this.auth.user;
    return user?.uid || null;
  }

  requireLogin() {
    const uid = this.getUID();

    if (!uid) {
      throw new Error("Puzzle progress save करने के लिए login जरूरी है।");
    }

    return uid;
  }

  getDateKey() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  async callBackend(name, payload = {}) {
    if (typeof this.firebase.callFunction !== "function") {
      throw new Error(
        "Puzzle backend Cloud Function configure करना बाकी है।"
      );
    }

    return this.firebase.callFunction(name, payload);
  }

  normalizePuzzle(puzzle) {
    if (!puzzle || typeof puzzle !== "object") {
      throw new Error("Invalid puzzle data.");
    }

    if (!puzzle.id || !puzzle.fen) {
      throw new Error("Puzzle ID या starting FEN missing है।");
    }

    if (!Array.isArray(puzzle.solution) || puzzle.solution.length === 0) {
      throw new Error("Puzzle solution उपलब्ध नहीं है।");
    }

    return {
      id: String(puzzle.id),
      title: puzzle.title || "Chess Challenge",
      description: puzzle.description || "",
      fen: puzzle.fen,
      solution: puzzle.solution.map(move => ({
        from: move.from,
        to: move.to,
        promotion: move.promotion || null
      })),
      difficulty: puzzle.difficulty || PUZZLE_DIFFICULTIES.MEDIUM,
      rating: Number(puzzle.rating || 1000),
      themes: Array.isArray(puzzle.themes) ? puzzle.themes : [],
      sideToMove: puzzle.sideToMove || null,
      source: puzzle.source || "APPARA CHESS"
    };
  }

  async getPuzzle(puzzleID) {
    if (!puzzleID) {
      throw new Error("Puzzle ID जरूरी है।");
    }

    const result = await this.callBackend(
      "getChessPuzzle",
      { puzzleID }
    );

    if (!result?.puzzle) {
      throw new Error("Puzzle नहीं मिला।");
    }

    const puzzle = this.normalizePuzzle(result.puzzle);

    this.emit(PUZZLE_EVENTS.LOADED, puzzle);
    return puzzle;
  }

  async getDailyPuzzle() {
    const result = await this.callBackend(
      "getDailyChessPuzzle",
      { date: this.getDateKey() }
    );

    if (!result?.puzzle) {
      throw new Error("आज का Daily Puzzle उपलब्ध नहीं है।");
    }

    return this.normalizePuzzle(result.puzzle);
  }

  async getPuzzleSet(options = {}) {
    const difficulty = options.difficulty || null;
    const theme = options.theme || null;
    const limit = Math.min(
      Math.max(Number(options.limit || 10), 1),
      50
    );

    const result = await this.callBackend(
      "getChessPuzzleSet",
      {
        difficulty,
        theme,
        limit,
        cursor: options.cursor || null
      }
    );

    return {
      puzzles: (result?.puzzles || []).map(
        puzzle => this.normalizePuzzle(puzzle)
      ),
      nextCursor: result?.nextCursor || null
    };
  }

  startPuzzle(puzzle) {
    const normalized = this.normalizePuzzle(puzzle);

    this.currentPuzzle = normalized;
    this.currentStep = 0;
    this.attempts = 0;
    this.solved = false;

    this.emit(PUZZLE_EVENTS.STARTED, normalized);

    return {
      puzzle: normalized,
      startingFEN: normalized.fen,
      step: 0
    };
  }

  checkMove(move) {
    if (!this.currentPuzzle) {
      throw new Error("पहले puzzle start करें।");
    }

    if (this.solved) {
      throw new Error("यह puzzle पहले ही complete हो चुका है।");
    }

    if (!move?.from || !move?.to) {
      throw new Error("Invalid move.");
    }

    const expected = this.currentPuzzle.solution[this.currentStep];

    if (!expected) {
      return {
        correct: false,
        completed: false
      };
    }

    const correct =
      expected.from === move.from &&
      expected.to === move.to &&
      (expected.promotion || null) === (move.promotion || null);

    this.attempts += 1;

    if (!correct) {
      this.emit(PUZZLE_EVENTS.MOVE_WRONG, {
        move,
        attempt: this.attempts
      });

      return {
        correct: false,
        completed: false,
        message: "गलत चाल। फिर कोशिश करें।"
      };
    }

    this.currentStep += 1;

    this.emit(PUZZLE_EVENTS.MOVE_CORRECT, {
      move,
      step: this.currentStep
    });

    const completed =
      this.currentStep >= this.currentPuzzle.solution.length;

    if (completed) {
      this.solved = true;

      this.emit(
        PUZZLE_EVENTS.COMPLETED,
        this.currentPuzzle
      );
    }

    return {
      correct: true,
      completed,
      nextMove: completed
        ? null
        : this.currentPuzzle.solution[this.currentStep],
      step: this.currentStep
    };
  }

  async completePuzzle() {
    if (!this.currentPuzzle || !this.solved) {
      throw new Error("Puzzle अभी complete नहीं हुआ है।");
    }

    const uid = this.requireLogin();

    const result = await this.callBackend(
      "completeChessPuzzle",
      {
        uid,
        puzzleID: this.currentPuzzle.id,
        attempts: this.attempts,
        completedAt: Date.now()
      }
    );

    if (result?.rating !== undefined) {
      this.puzzleRating = Number(result.rating);

      this.emit(
        PUZZLE_EVENTS.RATING_UPDATED,
        this.puzzleRating
      );
    }

    return result;
  }

  async claimDailyReward() {
    const uid = this.requireLogin();

    const result = await this.callBackend(
      "claimDailyPuzzleReward",
      {
        uid,
        date: this.getDateKey()
      }
    );

    if (!result?.success) {
      throw new Error(
        result?.message || "Daily reward claim नहीं हो पाया।"
      );
    }

    this.emit(PUZZLE_EVENTS.DAILY_CLAIMED, result);
    return result;
  }

  async getPuzzleStats() {
    const uid = this.requireLogin();

    const result = await this.callBackend(
      "getChessPuzzleStats",
      { uid }
    );

    return {
      rating: Number(result?.rating || this.puzzleRating),
      solved: Number(result?.solved || 0),
      attempted: Number(result?.attempted || 0),
      accuracy: Number(result?.accuracy || 0),
      dailyStreak: Number(result?.dailyStreak || 0),
      bestStreak: Number(result?.bestStreak || 0)
    };
  }

  getCurrentPuzzle() {
    return this.currentPuzzle
      ? { ...this.currentPuzzle }
      : null;
  }

  getProgress() {
    if (!this.currentPuzzle) return null;

    return {
      currentStep: this.currentStep,
      totalSteps: this.currentPuzzle.solution.length,
      attempts: this.attempts,
      solved: this.solved,
      percentage: Math.round(
        (this.currentStep / this.currentPuzzle.solution.length) * 100
      )
    };
  }

  resetPuzzle() {
    if (!this.currentPuzzle) return false;

    this.currentStep = 0;
    this.attempts = 0;
    this.solved = false;

    this.emit(PUZZLE_EVENTS.STARTED, this.currentPuzzle);
    return true;
  }

  abandonPuzzle() {
    if (!this.currentPuzzle) return false;

    const puzzleID = this.currentPuzzle.id;

    this.currentPuzzle = null;
    this.currentStep = 0;
    this.attempts = 0;
    this.solved = false;

    this.emit(PUZZLE_EVENTS.FAILED, { puzzleID });
    return true;
  }

  on(event, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function.");
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, payload) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error("PuzzleService listener error:", error);
      }
    });
  }

  dispose() {
    this.listeners.clear();
    this.currentPuzzle = null;
    this.currentStep = 0;
    this.attempts = 0;
    this.solved = false;
    this.initialized = false;
  }
}

export function createPuzzleService(dependencies) {
  return new PuzzleService(dependencies);
}

/* ================= FILE 45 END ================= */
      
