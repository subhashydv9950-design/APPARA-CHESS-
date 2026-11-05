/* =========================================================
   APPARA CHESS
   FILE: js/chess/ai-engine.js
   PURPOSE: Chess AI Opponent
   PART 1/3
   ========================================================= */

import {
  ChessEngine,
  STARTING_FEN
} from "./chess-engine.js";

/* ---------------------------------------------------------
   1. AI DIFFICULTY LEVELS
--------------------------------------------------------- */

export const AI_LEVELS = Object.freeze({
  BEGINNER: {
    id: "beginner",
    name: "Beginner",
    depth: 1,
    randomChance: 0.65,
    thinkTime: 250
  },

  EASY: {
    id: "easy",
    name: "Easy",
    depth: 1,
    randomChance: 0.35,
    thinkTime: 400
  },

  MEDIUM: {
    id: "medium",
    name: "Medium",
    depth: 2,
    randomChance: 0.15,
    thinkTime: 650
  },

  HARD: {
    id: "hard",
    name: "Hard",
    depth: 3,
    randomChance: 0.04,
    thinkTime: 900
  },

  EXPERT: {
    id: "expert",
    name: "Expert",
    depth: 3,
    randomChance: 0,
    thinkTime: 1200
  }
});

/* ---------------------------------------------------------
   2. PIECE VALUES
--------------------------------------------------------- */

const PIECE_VALUES = Object.freeze({
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
});

/* ---------------------------------------------------------
   3. BOARD HELPERS
--------------------------------------------------------- */

function getBoard(engine) {
  if (typeof engine?.getBoard === "function") {
    const board = engine.getBoard();

    if (
      Array.isArray(board) &&
      board.length === 8
    ) {
      return board;
    }
  }

  const snapshot = engine?.getSnapshot?.();

  if (
    Array.isArray(snapshot?.board) &&
    snapshot.board.length === 8
  ) {
    return snapshot.board;
  }

  return null;
}

function getCenterBonus(row, col) {
  const distance =
    Math.abs(3.5 - row) +
    Math.abs(3.5 - col);

  return Math.max(0, 7 - distance) * 3;
}

function evaluatePiecePosition(piece, row, col) {
  const center = getCenterBonus(row, col);

  if (piece.type === "p") {
    const advance = piece.color === "w"
      ? 6 - row
      : row - 1;

    return advance * 5 + center;
  }

  if (
    piece.type === "n" ||
    piece.type === "b"
  ) {
    return center * 2;
  }

  if (piece.type === "q") {
    return center;
  }

  return 0;
}

/* ---------------------------------------------------------
   4. BOARD EVALUATION
--------------------------------------------------------- */

function evaluateBoard(board, perspective) {
  if (!Array.isArray(board)) return 0;

  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row]?.[col];

      if (!piece) continue;

      const value =
        PIECE_VALUES[piece.type] || 0;

      const positionValue =
        evaluatePiecePosition(
          piece,
          row,
          col
        );

      const total =
        value + positionValue;

      score += piece.color === perspective
        ? total
        : -total;
    }
  }

  return score;
}

/* ---------------------------------------------------------
   5. STATUS HELPERS
--------------------------------------------------------- */

function isGameFinished(status) {
  return Boolean(
    status?.gameOver ||
    status?.isGameOver ||
    status?.checkmate ||
    status?.stalemate ||
    status?.draw
  );
}

function normalizeColor(color) {
  if (color === "white" || color === "w") {
    return "w";
  }

  if (color === "black" || color === "b") {
    return "b";
  }

  return null;
}

function randomItem(items) {
  if (!Array.isArray(items) || !items.length) {
    return null;
  }

  return items[
    Math.floor(Math.random() * items.length)
  ];
}

/* ---------------------------------------------------------
   6. AI ENGINE CLASS
--------------------------------------------------------- */

export class ChessAI {
  constructor(options = {}) {
    this.level = options.level || "medium";

    this.config = this.getLevelConfig(
      this.level
    );

    this.maxDepth = this.config.depth;

    this.isThinking = false;
    this.cancelRequested = false;

    this.lastEvaluation = 0;
    this.nodesSearched = 0;

    this.transpositionTable = new Map();
    this.maxTableEntries = 30000;
  }

  getLevelConfig(level) {
    const config = Object.values(AI_LEVELS).find(
      item => item.id === level
    );

    return config || AI_LEVELS.MEDIUM;
  }

  setLevel(level) {
    const config = this.getLevelConfig(level);

    this.level = config.id;
    this.config = config;
    this.maxDepth = config.depth;

    this.transpositionTable.clear();

    return {
      success: true,
      level: this.level,
      config: { ...config }
    };
  }

  cancel() {
    this.cancelRequested = true;

    return {
      success: true
    };
  }

/* =========================================================
   PART 1/3 END
   Continue directly with PART 2/3
   ========================================================= */
/* ---------------------------------------------------------
   7. GET LEGAL MOVES
--------------------------------------------------------- */

  getLegalMoves(engine) {
    const board = getBoard(engine);

    if (!board) return [];

    const moves = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row]?.[col];

        if (
          !piece ||
          piece.color !== engine.getTurn()
        ) {
          continue;
        }

        const from =
          String.fromCharCode(97 + col) +
          String(8 - row);

        const legalMoves =
          engine.getLegalMoves(from);

        if (!Array.isArray(legalMoves)) {
          continue;
        }

        for (const move of legalMoves) {
          if (!move?.to) continue;

          moves.push({
            from,
            to: move.to,
            promotion: move.promotion || undefined
          });
        }
      }
    }

    return moves;
  }

/* ---------------------------------------------------------
   8. MOVE SCORING
--------------------------------------------------------- */

  scoreMove(move, engine) {
    const board = getBoard(engine);

    if (!board) return 0;

    const targetCol =
      move.to.charCodeAt(0) - 97;

    const targetRow =
      8 - Number(move.to[1]);

    const movingCol =
      move.from.charCodeAt(0) - 97;

    const movingRow =
      8 - Number(move.from[1]);

    const movingPiece =
      board[movingRow]?.[movingCol];

    const targetPiece =
      board[targetRow]?.[targetCol];

    let score = 0;

    if (targetPiece) {
      score +=
        (PIECE_VALUES[targetPiece.type] || 0) -
        (PIECE_VALUES[movingPiece?.type] || 0) * 0.1;
    }

    if (move.promotion) {
      score +=
        PIECE_VALUES[move.promotion] || 0;
    }

    return score;
  }

/* ---------------------------------------------------------
   9. MOVE ORDERING
--------------------------------------------------------- */

  orderMoves(moves, engine) {
    return [...moves].sort(
      (a, b) =>
        this.scoreMove(b, engine) -
        this.scoreMove(a, engine)
    );
  }

/* ---------------------------------------------------------
   10. POSITION KEY
--------------------------------------------------------- */

  getPositionKey(engine) {
    return engine.getFEN();
  }

/* ---------------------------------------------------------
   11. MINIMAX + ALPHA BETA
--------------------------------------------------------- */

  minimax(
    engine,
    depth,
    alpha,
    beta,
    maximizingColor
  ) {
    this.nodesSearched++;

    if (this.cancelRequested) {
      return 0;
    }

    const status = engine.getGameStatus();

    if (isGameFinished(status)) {
      const winner = normalizeColor(status?.winner);

      if (winner === maximizingColor) {
        return 100000 + depth;
      }

      if (winner) {
        return -100000 - depth;
      }

      return 0;
    }

    if (depth <= 0) {
      return evaluateBoard(
        getBoard(engine),
        maximizingColor
      );
    }

    const positionKey =
      this.getPositionKey(engine);

    const cached =
      this.transpositionTable.get(positionKey);

    if (cached && cached.depth >= depth) {
      return cached.score;
    }

    const moves = this.orderMoves(
      this.getLegalMoves(engine),
      engine
    );

    if (!moves.length) return 0;

    const maximizing =
      engine.getTurn() === maximizingColor;

    let bestScore = maximizing
      ? -Infinity
      : Infinity;

    for (const move of moves) {
      if (this.cancelRequested) break;

      const result = engine.makeMove(move);

      if (!result?.success) continue;

      const score = this.minimax(
        engine,
        depth - 1,
        alpha,
        beta,
        maximizingColor
      );

      engine.undoMove();

      if (maximizing) {
        bestScore = Math.max(
          bestScore,
          score
        );

        alpha = Math.max(
          alpha,
          bestScore
        );
      } else {
        bestScore = Math.min(
          bestScore,
          score
        );

        beta = Math.min(
          beta,
          bestScore
        );
      }

      if (beta <= alpha) {
        break;
      }
    }

    if (!this.cancelRequested) {
      if (
        this.transpositionTable.size >=
        this.maxTableEntries
      ) {
        this.transpositionTable.clear();
      }

      this.transpositionTable.set(
        positionKey,
        {
          depth,
          score: bestScore
        }
      );
    }

    return Number.isFinite(bestScore)
      ? bestScore
      : 0;
  }

/* =========================================================
   PART 2/3 END
   Continue directly with PART 3/3
   ========================================================= */
/* ---------------------------------------------------------
   12. CHOOSE BEST MOVE
--------------------------------------------------------- */

  chooseBestMove(engine) {
    const legalMoves =
      this.getLegalMoves(engine);

    if (!legalMoves.length) {
      return null;
    }

    const turn = engine.getTurn();

    const orderedMoves =
      this.orderMoves(
        legalMoves,
        engine
      );

    const candidates = [];

    let bestScore = -Infinity;

    for (const move of orderedMoves) {
      if (this.cancelRequested) break;

      const result = engine.makeMove(move);

      if (!result?.success) continue;

      /*
       * Minimax already returns a score from
       * the original player's perspective.
       * Do not negate this score here.
       */

      const score = this.minimax(
        engine,
        this.maxDepth - 1,
        -Infinity,
        Infinity,
        turn
      );

      engine.undoMove();

      candidates.push({
        move,
        score
      });

      if (score > bestScore) {
        bestScore = score;
      }
    }

    if (!candidates.length) {
      return randomItem(legalMoves);
    }

    this.lastEvaluation = bestScore;

    const tolerance =
      this.level === "expert" ? 0 : 80;

    const bestCandidates =
      candidates.filter(
        item =>
          item.score >= bestScore - tolerance
      );

    return (
      randomItem(bestCandidates)?.move ||
      candidates[0].move
    );
  }

/* ---------------------------------------------------------
   13. GET AI MOVE
--------------------------------------------------------- */

  async getMove(position, options = {}) {
    if (this.isThinking) {
      return {
        success: false,
        error: "AI is already thinking."
      };
    }

    this.isThinking = true;
    this.cancelRequested = false;

    this.nodesSearched = 0;
    this.lastEvaluation = 0;

    try {
      const fen =
        typeof position === "string"
          ? position
          : position?.fen || STARTING_FEN;

      const engine =
        position instanceof ChessEngine
          ? new ChessEngine(position.getFEN())
          : new ChessEngine(fen);

      const status = engine.getGameStatus();

      if (isGameFinished(status)) {
        return {
          success: false,
          error: "Game is already over."
        };
      }

      const legalMoves =
        this.getLegalMoves(engine);

      if (!legalMoves.length) {
        return {
          success: false,
          error: "No legal move available."
        };
      }

      const randomChance =
        options.randomChance ??
        this.config.randomChance;

      let selectedMove = null;

      if (Math.random() < randomChance) {
        selectedMove = randomItem(legalMoves);
      } else {
        selectedMove =
          this.chooseBestMove(engine);
      }

      if (this.cancelRequested) {
        return {
          success: false,
          cancelled: true
        };
      }

      if (!selectedMove) {
        return {
          success: false,
          error: "Unable to calculate a move."
        };
      }

      return {
        success: true,
        move: selectedMove,
        evaluation: this.lastEvaluation,
        nodesSearched: this.nodesSearched,
        level: this.level
      };

    } catch (error) {
      return {
        success: false,
        error:
          error?.message ||
          "AI calculation failed."
      };

    } finally {
      this.isThinking = false;
      this.cancelRequested = false;
    }
  }

/* ---------------------------------------------------------
   14. AI STATISTICS
--------------------------------------------------------- */

  getStats() {
    return {
      level: this.level,
      depth: this.maxDepth,
      nodesSearched: this.nodesSearched,
      lastEvaluation: this.lastEvaluation,
      isThinking: this.isThinking,
      transpositionEntries:
        this.transpositionTable.size
    };
  }

/* ---------------------------------------------------------
   15. RESET AI
--------------------------------------------------------- */

  reset() {
    this.cancelRequested = true;

    this.lastEvaluation = 0;
    this.nodesSearched = 0;

    this.transpositionTable.clear();

    return {
      success: true
    };
  }
}

/* ---------------------------------------------------------
   16. AI FACTORY
--------------------------------------------------------- */

export function createChessAI(options = {}) {
  return new ChessAI(options);
}

/* =========================================================
   APPARA CHESS
   FILE COMPLETE
   Path: js/chess/ai-engine.js
   PART 3/3 — FULL FILE COMPLETE
   ========================================================= */
