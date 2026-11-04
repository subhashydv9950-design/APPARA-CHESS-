
/* =========================================================
   APPARA CHESS
   FILE 21: ai-engine.js
   SECTION: js/chess/
   PURPOSE: Chess AI Opponent
   ========================================================= */

import { ChessEngine, STARTING_FEN } from "./chess-engine.js";


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
   3. BOARD POSITION VALUES
--------------------------------------------------------- */

function getCenterBonus(row, col) {

  const centerDistance =
    Math.abs(3.5 - row) +
    Math.abs(3.5 - col);

  return Math.max(0, 7 - centerDistance) * 3;
}


function evaluatePiecePosition(piece, row, col) {

  const center = getCenterBonus(row, col);

  if (piece.type === "p") {
    const advance = piece.color === "w"
      ? 6 - row
      : row - 1;

    return advance * 5 + center;
  }

  if (piece.type === "n" || piece.type === "b") {
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

  let score = 0;

  for (let row = 0; row < 8; row++) {

    for (let col = 0; col < 8; col++) {

      const piece = board[row][col];

      if (!piece) continue;

      const value = PIECE_VALUES[piece.type] || 0;

      const positionValue = evaluatePiecePosition(
        piece,
        row,
        col
      );

      const totalValue = value + positionValue;

      score += piece.color === perspective
        ? totalValue
        : -totalValue;

    }

  }

  return score;
}


/* ---------------------------------------------------------
   5. RANDOM HELPER
--------------------------------------------------------- */

function randomItem(items) {

  if (!items.length) return null;

  return items[Math.floor(Math.random() * items.length)];
}


/* ---------------------------------------------------------
   6. AI ENGINE CLASS
--------------------------------------------------------- */

export class ChessAI {

  constructor(options = {}) {

    this.level = options.level || "medium";

    this.config = this.getLevelConfig(this.level);

    this.maxDepth = this.config.depth;

    this.isThinking = false;

    this.cancelRequested = false;

    this.lastEvaluation = 0;

    this.nodesSearched = 0;

    this.transpositionTable = new Map();

    this.maxTableEntries = 50000;

  }


  /* -------------------------------------------------------
     7. GET LEVEL CONFIG
  ------------------------------------------------------- */

  getLevelConfig(level) {

    const config = Object.values(AI_LEVELS).find(
      item => item.id === level
    );

    return config || AI_LEVELS.MEDIUM;
  }


  /* -------------------------------------------------------
     8. CHANGE DIFFICULTY
  ------------------------------------------------------- */

  setLevel(level) {

    const config = this.getLevelConfig(level);

    this.level = config.id;

    this.config = config;

    this.maxDepth = config.depth;

    return {
      success: true,
      level: this.level,
      config: { ...config }
    };
  }


  /* -------------------------------------------------------
     9. CANCEL AI THINKING
  ------------------------------------------------------- */

  cancel() {

    this.cancelRequested = true;

    this.isThinking = false;

    return {
      success: true
    };
  }


  /* -------------------------------------------------------
     10. GET LEGAL MOVES
  ------------------------------------------------------- */

  getLegalMoves(engine) {

    const snapshot = engine.getSnapshot();

    if (!snapshot || !Array.isArray(snapshot)) {
      return [];
    }

    const moves = [];

    for (let row = 0; row < 8; row++) {

      for (let col = 0; col < 8; col++) {

        const piece = snapshot[row]?.[col];

        if (!piece || piece.color !== engine.getTurn()) {
          continue;
        }

        const from = String.fromCharCode(97 + col) +
          String(8 - row);

        const legal = engine.getLegalMoves(from);

        for (const move of legal) {
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


  /* -------------------------------------------------------
     11. MOVE ORDERING
  ------------------------------------------------------- */

  scoreMove(move, engine) {

    const snapshot = engine.getSnapshot();

    const targetCol = move.to.charCodeAt(0) - 97;

    const targetRow = 8 - Number(move.to[1]);

    const movingCol = move.from.charCodeAt(0) - 97;

    const movingRow = 8 - Number(move.from[1]);

    const movingPiece = snapshot[movingRow]?.[movingCol];

    const targetPiece = snapshot[targetRow]?.[targetCol];

    let score = 0;

    if (targetPiece) {

      score +=
        (PIECE_VALUES[targetPiece.type] || 0) -
        (PIECE_VALUES[movingPiece?.type] || 0) * 0.1;

    }

    if (move.promotion) {
      score += PIECE_VALUES[move.promotion] || 0;
    }

    return score;
  }


  /* -------------------------------------------------------
     12. ORDER MOVES
  ------------------------------------------------------- */

  orderMoves(moves, engine) {

    return [...moves].sort((a, b) => {

      return this.scoreMove(b, engine) -
        this.scoreMove(a, engine);

    });
  }


  /* -------------------------------------------------------
     13. POSITION KEY
  ------------------------------------------------------- */

  getPositionKey(engine) {

    return engine.getFEN();
  }


  /* -------------------------------------------------------
     14. MINIMAX SEARCH
  ------------------------------------------------------- */

  minimax(engine, depth, alpha, beta, maximizingColor) {

    this.nodesSearched++;

    if (this.cancelRequested) {
      return 0;
    }

    const status = engine.getGameStatus();

    if (status.gameOver) {

      if (status.winner === maximizingColor) {
        return 100000 + depth;
      }

      if (status.winner) {
        return -100000 - depth;
      }

      return 0;
    }

    if (depth === 0) {

      return evaluateBoard(
        engine.getSnapshot(),
        maximizingColor
      );

    }

    const positionKey = this.getPositionKey(engine);

    const cached = this.transpositionTable.get(positionKey);

    if (cached && cached.depth >= depth) {
      return cached.score;
    }

    const moves = this.orderMoves(
      this.getLegalMoves(engine),
      engine
    );

    if (!moves.length) return 0;

    const maximizing = engine.getTurn() === maximizingColor;

    let bestScore = maximizing
      ? -Infinity
      : Infinity;

    for (const move of moves) {

      if (this.cancelRequested) break;

      const result = engine.makeMove(move);

      if (!result.success) continue;

      const score = this.minimax(
        engine,
        depth - 1,
        alpha,
        beta,
        maximizingColor
      );

      engine.undoMove();

      if (maximizing) {

        bestScore = Math.max(bestScore, score);

        alpha = Math.max(alpha, bestScore);

      } else {

        bestScore = Math.min(bestScore, score);

        beta = Math.min(beta, bestScore);

      }

      if (beta <= alpha) break;

    }

    if (!this.cancelRequested) {

      if (this.transpositionTable.size >= this.maxTableEntries) {
        this.transpositionTable.clear();
      }

      this.transpositionTable.set(positionKey, {
        depth,
        score: bestScore
      });

    }

    return bestScore;
  }


  /* -------------------------------------------------------
     15. CHOOSE BEST MOVE
  ------------------------------------------------------- */

  chooseBestMove(engine) {

    const legalMoves = this.getLegalMoves(engine);

    if (!legalMoves.length) {
      return null;
    }

    const turn = engine.getTurn();

    const orderedMoves = this.orderMoves(
      legalMoves,
      engine
    );

    const candidates = [];

    let bestScore = -Infinity;

    for (const move of orderedMoves) {

      if (this.cancelRequested) break;

      const result = engine.makeMove(move);

      if (!result.success) continue;

      const score = -this.minimax(
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

    const tolerance = this.level === "expert" ? 0 : 80;

    const bestCandidates = candidates.filter(
      item => item.score >= bestScore - tolerance
    );

    return randomItem(bestCandidates)?.move || candidates[0].move;
  }


  /* -------------------------------------------------------
     16. GET AI MOVE
  ------------------------------------------------------- */

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

    try {

      const engine = position instanceof ChessEngine
        ? new ChessEngine(position.getFEN())
        : new ChessEngine(
            typeof position === "string"
              ? position
              : position?.fen || STARTING_FEN
          );

      const status = engine.getGameStatus();

      if (status.gameOver) {
        return {
          success: false,
          error: "Game is already over."
        };
      }

      const randomChance = options.randomChance ??
        this.config.randomChance;

      let selectedMove;

      if (Math.random() < randomChance) {

        selectedMove = randomItem(
          this.getLegalMoves(engine)
        );

      } else {

        selectedMove = this.chooseBestMove(engine);

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
          error: "No legal move available."
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
        error: error.message || "AI calculation failed."
      };

    } finally {

      this.isThinking = false;

      this.cancelRequested = false;

    }

  }


  /* -------------------------------------------------------
     17. AI STATISTICS
  ------------------------------------------------------- */

  getStats() {

    return {

      level: this.level,

      depth: this.maxDepth,

      nodesSearched: this.nodesSearched,

      lastEvaluation: this.lastEvaluation,

      isThinking: this.isThinking,

      transpositionEntries: this.transpositionTable.size

    };

  }


  /* -------------------------------------------------------
     18. RESET AI
  ------------------------------------------------------- */

  reset() {

    this.cancelRequested = true;

    this.isThinking = false;

    this.lastEvaluation = 0;

    this.nodesSearched = 0;

    this.transpositionTable.clear();

    return {
      success: true
    };
  }

}


/* ---------------------------------------------------------
   19. AI FACTORY
--------------------------------------------------------- */

export function createChessAI(options = {}) {

  return new ChessAI(options);

}


/* =========================================================
   FILE 21 END
   FILE: js/chess/ai-engine.js
   ========================================================= */
        
