
/* =========================================================
   APPARA CHESS
   FILE 20: game-review.js
   SECTION: js/chess/
   PURPOSE: Chess Match Review and Replay Controller
   ========================================================= */

import {
  ChessEngine,
  STARTING_FEN
} from "./chess-engine.js";

import {
  MoveHistory
} from "./move-history.js";


/* ---------------------------------------------------------
   1. REPLAY SPEEDS
--------------------------------------------------------- */

export const REVIEW_SPEEDS = Object.freeze({
  SLOW: 2000,
  NORMAL: 1000,
  FAST: 500,
  VERY_FAST: 250
});


/* ---------------------------------------------------------
   2. REVIEW CONTROLLER
--------------------------------------------------------- */

export class GameReview {

  constructor(options = {}) {

    this.startingFen = options.startingFen || STARTING_FEN;

    this.history = options.history || new MoveHistory({
      startingFen: this.startingFen,
      matchId: options.matchId || null
    });

    this.engine = new ChessEngine(this.startingFen);

    this.cursor = 0;

    this.playing = false;

    this.speed = REVIEW_SPEEDS.NORMAL;

    this.lastError = null;

    this.positionCache = new Map();

    this.positionCache.set(0, this.engine.getFEN());

    this.rebuildPositions();

  }


  /* -------------------------------------------------------
     3. REBUILD REVIEW POSITIONS
  ------------------------------------------------------- */

  rebuildPositions() {

    this.positionCache.clear();

    const moves = this.history.getMoves();

    const replayEngine = new ChessEngine(this.startingFen);

    this.positionCache.set(0, replayEngine.getFEN());

    for (let i = 0; i < moves.length; i++) {

      const move = moves[i];

      const result = replayEngine.makeMove({
        from: move.from,
        to: move.to,
        promotion: move.promotion || undefined
      });

      if (!result.success) {

        this.lastError = {
          moveNumber: i + 1,
          error: result.error || "Unable to replay move."
        };

        break;
      }

      this.positionCache.set(
        i + 1,
        replayEngine.getFEN()
      );

    }

    this.lastError = this.lastError || null;

    return {
      success: this.positionCache.size === moves.length + 1,
      positions: this.positionCache.size,
      error: this.lastError
    };
  }


  /* -------------------------------------------------------
     4. LOAD POSITION AT CURSOR
  ------------------------------------------------------- */

  loadCursorPosition() {

    const fen = this.positionCache.get(this.cursor);

    if (!fen) {
      return {
        success: false,
        error: "Position is unavailable."
      };
    }

    const result = this.engine.loadFEN(fen);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      cursor: this.cursor,
      fen,
      board: this.engine.getSnapshot(),
      status: this.engine.getGameStatus()
    };
  }


  /* -------------------------------------------------------
     5. GO TO MOVE
  ------------------------------------------------------- */

  goToMove(moveIndex) {

    const totalMoves = this.history.getMoves().length;

    const index = Number(moveIndex);

    if (!Number.isInteger(index)) {
      return {
        success: false,
        error: "Move index must be an integer."
      };
    }

    if (index < 0 || index > totalMoves) {
      return {
        success: false,
        error: "Move index is outside the game history."
      };
    }

    this.pause();

    this.cursor = index;

    return this.loadCursorPosition();
  }


  /* -------------------------------------------------------
     6. FIRST MOVE
  ------------------------------------------------------- */

  first() {
    return this.goToMove(0);
  }


  /* -------------------------------------------------------
     7. LAST MOVE
  ------------------------------------------------------- */

  last() {
    return this.goToMove(this.history.getMoves().length);
  }


  /* -------------------------------------------------------
     8. NEXT MOVE
  ------------------------------------------------------- */

  next() {

    const totalMoves = this.history.getMoves().length;

    if (this.cursor >= totalMoves) {
      return {
        success: false,
        error: "Already at the last move."
      };
    }

    return this.goToMove(this.cursor + 1);
  }


  /* -------------------------------------------------------
     9. PREVIOUS MOVE
  ------------------------------------------------------- */

  previous() {

    if (this.cursor <= 0) {
      return {
        success: false,
        error: "Already at the starting position."
      };
    }

    return this.goToMove(this.cursor - 1);
  }


  /* -------------------------------------------------------
     10. SET REPLAY SPEED
  ------------------------------------------------------- */

  setSpeed(milliseconds) {

    const value = Number(milliseconds);

    if (
      !Number.isFinite(value) ||
      value < 100 ||
      value > 10000
    ) {
      return {
        success: false,
        error: "Replay speed must be between 100 and 10000 milliseconds."
      };
    }

    this.speed = value;

    return {
      success: true,
      speed: this.speed
    };
  }


  /* -------------------------------------------------------
     11. PLAY REPLAY
     UI should call advance() at the selected interval.
  ------------------------------------------------------- */

  play() {

    if (this.cursor >= this.history.getMoves().length) {
      return {
        success: false,
        error: "Replay has reached the end."
      };
    }

    this.playing = true;

    return {
      success: true,
      playing: true,
      speed: this.speed
    };
  }


  /* -------------------------------------------------------
     12. ADVANCE REPLAY
  ------------------------------------------------------- */

  advance() {

    if (!this.playing) {
      return {
        success: false,
        error: "Replay is not playing."
      };
    }

    const result = this.next();

    if (!result.success) {
      this.pause();

      return result;
    }

    const finished =
      this.cursor >= this.history.getMoves().length;

    if (finished) {
      this.pause();
    }

    return {
      ...result,
      playing: this.playing,
      finished
    };
  }


  /* -------------------------------------------------------
     13. PAUSE REPLAY
  ------------------------------------------------------- */

  pause() {

    this.playing = false;

    return {
      success: true,
      playing: false
    };
  }


  /* -------------------------------------------------------
     14. TOGGLE PLAYBACK
  ------------------------------------------------------- */

  togglePlayback() {

    if (this.playing) {
      return this.pause();
    }

    return this.play();
  }


  /* -------------------------------------------------------
     15. GET CURRENT MOVE
  ------------------------------------------------------- */

  getCurrentMove() {

    if (this.cursor === 0) {
      return null;
    }

    return this.history.getMove(this.cursor);
  }


  /* -------------------------------------------------------
     16. GET CURRENT POSITION
  ------------------------------------------------------- */

  getPosition() {

    return {

      cursor: this.cursor,

      totalMoves: this.history.getMoves().length,

      fen: this.engine.getFEN(),

      board: this.engine.getSnapshot(),

      status: this.engine.getGameStatus(),

      currentMove: this.getCurrentMove(),

      playing: this.playing,

      speed: this.speed

    };
  }


  /* -------------------------------------------------------
     17. GET MOVE LIST
  ------------------------------------------------------- */

  getMoveList() {

    return this.history.getMovePairs().map(pair => ({

      moveNumber: pair.moveNumber,

      white: pair.white
        ? {
            id: pair.white.id,
            san: pair.white.san,
            from: pair.white.from,
            to: pair.white.to
          }
        : null,

      black: pair.black
        ? {
            id: pair.black.id,
            san: pair.black.san,
            from: pair.black.from,
            to: pair.black.to
          }
        : null,

      isCurrent: (
        this.cursor === pair.white?.id ||
        this.cursor === pair.black?.id
      )

    }));

  }


  /* -------------------------------------------------------
     18. GET CAPTURE HISTORY
  ------------------------------------------------------- */

  getCaptureHistory() {

    return this.history.getCaptures().map(move => ({

      moveNumber: move.moveNumber,

      color: move.color,

      capturedPiece: move.captured,

      san: move.san,

      moveId: move.id,

      alreadyPlayed: move.id <= this.cursor

    }));

  }


  /* -------------------------------------------------------
     19. GET SPECIAL EVENTS
  ------------------------------------------------------- */

  getSpecialEvents() {

    return this.history.getEvents().filter(event => {

      return [
        "capture",
        "promotion",
        "check",
        "checkmate",
        "game-result"
      ].includes(event.type);

    }).map(event => ({

      ...event,

      alreadyPlayed: event.moveCount <= this.cursor

    }));

  }


  /* -------------------------------------------------------
     20. EXPORT CURRENT FEN
  ------------------------------------------------------- */

  exportFEN() {

    return this.engine.getFEN();
  }


  /* -------------------------------------------------------
     21. EXPORT COMPLETE PGN
  ------------------------------------------------------- */

  exportPGN() {

    return this.history.exportPGN();
  }


  /* -------------------------------------------------------
     22. GET REVIEW SUMMARY
  ------------------------------------------------------- */

  getSummary() {

    return {

      matchId: this.history.matchId,

      totalMoves: this.history.getMoves().length,

      currentMove: this.cursor,

      result: this.history.result,

      headers: this.history.getHeaders(),

      summary: this.history.getSummary(),

      replaySpeed: this.speed,

      playing: this.playing,

      error: this.lastError

    };

  }


  /* -------------------------------------------------------
     23. RELOAD REVIEW
  ------------------------------------------------------- */

  reload() {

    this.pause();

    this.cursor = 0;

    this.engine = new ChessEngine(this.startingFen);

    const rebuild = this.rebuildPositions();

    if (!rebuild.success) {
      return rebuild;
    }

    return this.loadCursorPosition();
  }


}


/* ---------------------------------------------------------
   24. REVIEW FACTORY
--------------------------------------------------------- */

export function createGameReview(options = {}) {

  return new GameReview(options);

}


/* =========================================================
   FILE 20 END
   FILE: js/chess/game-review.js
   ========================================================= */
        
