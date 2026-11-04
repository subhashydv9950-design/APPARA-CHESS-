
/* =========================================================
   APPARA CHESS — CHESS RULES ENGINE
   FILE: js/chess/chess-engine.js
   PURPOSE: Standard chess rules and legal move validation

   DEPENDENCY:
   chess.js 1.4.0
   Import mapping will be configured in index.html.
   ========================================================= */

import { Chess } from "chess.js";

const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const VALID_SQUARE = /^[a-h][1-8]$/;

const VALID_PROMOTIONS = ["q", "r", "b", "n"];

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeMove(move) {
  if (!move || typeof move !== "object") {
    throw new TypeError("A valid move object is required.");
  }

  const normalized = {
    from: String(move.from || "").toLowerCase(),
    to: String(move.to || "").toLowerCase()
  };

  if (
    !VALID_SQUARE.test(normalized.from) ||
    !VALID_SQUARE.test(normalized.to)
  ) {
    throw new Error("Invalid chess square.");
  }

  if (move.promotion !== undefined) {
    const promotion = String(move.promotion).toLowerCase();

    if (!VALID_PROMOTIONS.includes(promotion)) {
      throw new Error("Invalid promotion piece.");
    }

    normalized.promotion = promotion;
  }

  return normalized;
}

function getPositionKey(fen) {
  // Repetition identity uses:
  // piece placement, side to move, castling rights, en passant.
  return String(fen).split(" ").slice(0, 4).join(" ");
}

function countCurrentPositionOccurrences(chess) {
  const history = chess.history({ verbose: true });

  const positions = [STARTING_FEN];

  for (const move of history) {
    positions.push(move.after);
  }

  const currentKey = getPositionKey(chess.fen());

  return positions.filter(
    fen => getPositionKey(fen) === currentKey
  ).length;
}

function getHalfmoveClock(fen) {
  const fields = String(fen).split(" ");

  if (fields.length < 5) return 0;

  const value = Number(fields[4]);

  return Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

export class ChessEngine {
  constructor(fen = STARTING_FEN) {
    this.chess = new Chess(fen);
  }

  /**
   * Start a new game.
   */
  reset() {
    this.chess.reset();

    return this.getSnapshot();
  }

  /**
   * Load a FEN position.
   */
  loadFEN(fen) {
    if (typeof fen !== "string" || !fen.trim()) {
      throw new TypeError("A valid FEN string is required.");
    }

    this.chess.load(fen.trim());

    return this.getSnapshot();
  }

  /**
   * Get current FEN.
   */
  getFEN() {
    return this.chess.fen();
  }

  /**
   * Get current PGN.
   */
  getPGN() {
    return this.chess.pgn();
  }

  /**
   * Load a PGN game.
   */
  loadPGN(pgn) {
    if (typeof pgn !== "string" || !pgn.trim()) {
      throw new TypeError("A valid PGN string is required.");
    }

    this.chess.loadPgn(pgn);

    return this.getSnapshot();
  }

  /**
   * Get current side to move.
   * Returns "w" or "b".
   */
  getTurn() {
    return this.chess.turn();
  }

  /**
   * Get the complete board.
   */
  getBoard() {
    return cloneData(this.chess.board());
  }

  /**
   * Get a piece from a square.
   */
  getPiece(square) {
    if (!VALID_SQUARE.test(String(square))) {
      return null;
    }

    const piece = this.chess.get(square);

    return piece ? { ...piece } : null;
  }

  /**
   * Get all legal moves.
   */
  getLegalMoves(options = {}) {
    const moveOptions = {};

    if (options.square !== undefined) {
      const square = String(options.square).toLowerCase();

      if (!VALID_SQUARE.test(square)) {
        return [];
      }

      moveOptions.square = square;
    }

    if (options.verbose === true) {
      moveOptions.verbose = true;
    }

    return cloneData(this.chess.moves(moveOptions));
  }

  /**
   * Check whether a square has any legal moves.
   */
  hasLegalMovesFrom(square) {
    if (!VALID_SQUARE.test(String(square))) {
      return false;
    }

    return this.chess.moves({
      square: String(square).toLowerCase()
    }).length > 0;
  }

  /**
   * Play a legal move.
   */
  makeMove(move) {
    try {
      const normalized = normalizeMove(move);

      const result = this.chess.move(normalized);

      if (!result) {
        return {
          success: false,
          error: "Illegal move.",
          move: null
        };
      }

      return {
        success: true,
        error: null,
        move: cloneData(result),
        snapshot: this.getSnapshot()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Move could not be completed.",
        move: null
      };
    }
  }

  /**
   * Play a move using SAN notation.
   */
  makeSANMove(san) {
    if (typeof san !== "string" || !san.trim()) {
      return {
        success: false,
        error: "Invalid SAN notation.",
        move: null
      };
    }

    try {
      const result = this.chess.move(san.trim());

      return {
        success: true,
        error: null,
        move: cloneData(result),
        snapshot: this.getSnapshot()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Invalid chess move.",
        move: null
      };
    }
  }

  /**
   * Undo the last half-move.
   */
  undoMove() {
    const move = this.chess.undo();

    if (!move) return null;

    return {
      move: cloneData(move),
      snapshot: this.getSnapshot()
    };
  }

  /**
   * Get move history.
   */
  getHistory(verbose = true) {
    return cloneData(
      this.chess.history({ verbose: Boolean(verbose) })
    );
  }

  /**
   * Check whether the current side is in check.
   */
  isInCheck() {
    return this.chess.inCheck();
  }

  /**
   * Check for checkmate.
   */
  isCheckmate() {
    return this.chess.isCheckmate();
  }

  /**
   * Check for stalemate.
   */
  isStalemate() {
    return this.chess.isStalemate();
  }

  /**
   * Check for insufficient material.
   */
  isInsufficientMaterial() {
    return this.chess.isInsufficientMaterial();
  }

  /**
   * Check whether a threefold repetition claim is available.
   * This is a claim-based draw, not an automatic draw.
   */
  canClaimThreefoldRepetition() {
    return countCurrentPositionOccurrences(this.chess) >= 3;
  }

  /**
   * Check whether a 50-move rule claim is available.
   * 100 half-moves without a pawn move or capture.
   */
  canClaimFiftyMoveDraw() {
    return getHalfmoveClock(this.getFEN()) >= 100;
  }

  /**
   * Check automatic 75-move draw condition.
   * Checkmate is checked first in getGameStatus().
   */
  isSeventyFiveMoveDraw() {
    return getHalfmoveClock(this.getFEN()) >= 150;
  }

  /**
   * Check automatic fivefold repetition condition.
   */
  isFivefoldRepetition() {
    return countCurrentPositionOccurrences(this.chess) >= 5;
  }

  /**
   * Get the current game status.
   */
  getGameStatus() {
    const inCheck = this.isInCheck();

    // Checkmate takes priority over move-count draw.
    if (this.isCheckmate()) {
      return {
        state: "checkmate",
        gameOver: true,
        winner: this.getTurn() === "w" ? "black" : "white",
        inCheck: true
      };
    }

    if (this.isStalemate()) {
      return {
        state: "stalemate",
        gameOver: true,
        winner: null,
        inCheck: false
      };
    }

    if (this.isInsufficientMaterial()) {
      return {
        state: "insufficient-material",
        gameOver: true,
        winner: null,
        inCheck
      };
    }

    if (this.isSeventyFiveMoveDraw()) {
      return {
        state: "seventy-five-move-draw",
        gameOver: true,
        winner: null,
        inCheck
      };
    }

    if (this.isFivefoldRepetition()) {
      return {
        state: "fivefold-repetition",
        gameOver: true,
        winner: null,
        inCheck
      };
    }

    return {
      state: inCheck ? "check" : "playing",
      gameOver: false,
      winner: null,
      inCheck,
      canClaimThreefold: this.canClaimThreefoldRepetition(),
      canClaimFiftyMove: this.canClaimFiftyMoveDraw()
    };
  }

  /**
   * Get a complete game snapshot for UI rendering.
   */
  getSnapshot() {
    return {
      fen: this.getFEN(),
      turn: this.getTurn(),
      board: this.getBoard(),
      history: this.getHistory(true),
      moveNumber: this.chess.moveNumber(),
      status: this.getGameStatus()
    };
  }

  /**
   * Get the number of occurrences of the current position.
   */
  getRepetitionCount() {
    return countCurrentPositionOccurrences(this.chess);
  }

  /**
   * Get the current half-move clock.
   */
  getHalfmoveCount() {
    return getHalfmoveClock(this.getFEN());
  }

  /**
   * Get the current square color.
   */
  getSquareColor(square) {
    if (!VALID_SQUARE.test(String(square))) {
      return null;
    }

    return this.chess.squareColor(square);
  }

  /**
   * Check whether a square is attacked.
   */
  isSquareAttacked(square, color) {
    if (
      !VALID_SQUARE.test(String(square)) ||
      !["w", "b"].includes(color)
    ) {
      return false;
    }

    return this.chess.isAttacked(square, color);
  }
}

/**
 * Create a new independent chess game.
 */
export function createChessEngine(fen = STARTING_FEN) {
  return new ChessEngine(fen);
}

/**
 * Export starting position for other modules.
 */
export { STARTING_FEN };

/* =========================================================
   FILE END: js/chess/chess-engine.js
   ========================================================= */
  
