/* =========================================================
   APPARA CHESS
   FILE: js/chess/chess-engine.js
   CHESS RULES ENGINE — COMPLETE REPLACEMENT
   ========================================================= */

import { Chess } from "chess.js";

const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const VALID_SQUARE = /^[a-h][1-8]$/;
const VALID_PROMOTIONS = ["q", "r", "b", "n"];

function cloneData(value) {
  if (value === undefined || value === null) {
    return value;
  }

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
  return String(fen).split(" ").slice(0, 4).join(" ");
}

function countCurrentPositionOccurrences(chess) {
  const history = chess.history({ verbose: true });

  if (history.length === 0) {
    return 1;
  }

  // Use the actual initial position of this game.
  // This also supports games loaded from custom FEN.
  const positions = [history[0].before];

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

  reset() {
    this.chess.reset();
    return this.getSnapshot();
  }

  loadFEN(fen) {
    if (typeof fen !== "string" || !fen.trim()) {
      throw new TypeError("A valid FEN string is required.");
    }

    this.chess.load(fen.trim());
    return this.getSnapshot();
  }

  getFEN() {
    return this.chess.fen();
  }

  getPGN() {
    return this.chess.pgn();
  }

  loadPGN(pgn) {
    if (typeof pgn !== "string" || !pgn.trim()) {
      throw new TypeError("A valid PGN game is required.");
    }

    this.chess.loadPgn(pgn);
    return this.getSnapshot();
  }

  getTurn() {
    return this.chess.turn();
  }

  getBoard() {
    return cloneData(this.chess.board());
  }

  getPiece(square) {
    const normalized = String(square || "").toLowerCase();

    if (!VALID_SQUARE.test(normalized)) {
      return null;
    }

    const piece = this.chess.get(normalized);
    return piece ? { ...piece } : null;
  }

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

  hasLegalMovesFrom(square) {
    const normalized = String(square || "").toLowerCase();

    if (!VALID_SQUARE.test(normalized)) {
      return false;
    }

    return this.chess.moves({
      square: normalized
    }).length > 0;
  }

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

  undoMove() {
    try {
      const move = this.chess.undo();

      if (!move) {
        return {
          success: false,
          error: "There is no move to undo.",
          move: null,
          snapshot: this.getSnapshot()
        };
      }

      return {
        success: true,
        error: null,
        move: cloneData(move),
        snapshot: this.getSnapshot()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Unable to undo move.",
        move: null
      };
    }
  }

  getHistory(verbose = true) {
    return cloneData(
      this.chess.history({ verbose: Boolean(verbose) })
    );
  }

  isInCheck() {
    return this.chess.inCheck();
  }

  isCheckmate() {
    return this.chess.isCheckmate();
  }

  isStalemate() {
    return this.chess.isStalemate();
  }

  isInsufficientMaterial() {
    return this.chess.isInsufficientMaterial();
  }

  canClaimThreefoldRepetition() {
    return countCurrentPositionOccurrences(this.chess) >= 3;
  }

  canClaimFiftyMoveDraw() {
    return getHalfmoveClock(this.getFEN()) >= 100;
  }

  isSeventyFiveMoveDraw() {
    return getHalfmoveClock(this.getFEN()) >= 150;
  }

  isFivefoldRepetition() {
    return countCurrentPositionOccurrences(this.chess) >= 5;
  }

  getGameStatus() {
    const inCheck = this.isInCheck();

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

  getRepetitionCount() {
    return countCurrentPositionOccurrences(this.chess);
  }

  getHalfmoveCount() {
    return getHalfmoveClock(this.getFEN());
  }

  getSquareColor(square) {
    const normalized = String(square || "").toLowerCase();

    if (!VALID_SQUARE.test(normalized)) {
      return null;
    }

    return this.chess.squareColor(normalized);
  }

  isSquareAttacked(square, color) {
    const normalized = String(square || "").toLowerCase();

    if (
      !VALID_SQUARE.test(normalized) ||
      !["w", "b"].includes(color)
    ) {
      return false;
    }

    return this.chess.isAttacked(normalized, color);
  }
}

export function createChessEngine(fen = STARTING_FEN) {
  return new ChessEngine(fen);
}

export { STARTING_FEN };

/* =========================================================
   FULL FILE COMPLETE
   PATH: js/chess/chess-engine.js
   ========================================================= */

