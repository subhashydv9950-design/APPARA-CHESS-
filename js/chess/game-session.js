/* =========================================================
   APPARA CHESS
   FILE 68: GAME SESSION ADAPTER
   Path: js/chess/game-session.js
   PURPOSE: Connect GameState, ChessAI and GameScreen
   PART 1/2
   ========================================================= */

import {
  GameState,
  GAME_MODES
} from "./game-state.js";

import {
  ChessAI
} from "./ai-engine.js";


/* ---------------------------------------------------------
   1. GAME STATE ADAPTER
--------------------------------------------------------- */

export class GameSessionState {

  constructor(options = {}) {

    this.mode = options.mode || GAME_MODES.OFFLINE;

    this.state = new GameState({
      mode: this.mode,
      rated: Boolean(options.rated),
      startingFen: options.startingFen,
      timeControl: options.timeControl || null,

      players: options.players || {
        white: {
          name: options.playerName || "You"
        },
        black: {
          name: options.opponentName || "APPARA AI"
        }
      }
    });

    this.listeners = new Map();
    this.disposed = false;

    const startResult = this.state.start();

    if (!startResult.success) {
      throw new Error(
        startResult.error || "Unable to start chess session."
      );
    }

    this.matchId = this.state.getMatchId();
  }


  /* -------------------------------------------------------
     2. LOCAL EVENT LISTENERS
  ------------------------------------------------------- */

  on(eventName, callback) {

    if (
      this.disposed ||
      typeof callback !== "function"
    ) {
      return () => {};
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName).add(callback);

    return () => {
      this.off(eventName, callback);
    };
  }


  off(eventName, callback) {

    const listeners = this.listeners.get(eventName);

    if (!listeners) return false;

    const removed = listeners.delete(callback);

    if (listeners.size === 0) {
      this.listeners.delete(eventName);
    }

    return removed;
  }


  notify(eventName, data) {

    if (this.disposed) return;

    const listeners = this.listeners.get(eventName);

    if (!listeners) return;

    for (const callback of [...listeners]) {

      try {
        callback(data);
      } catch (error) {
        console.error(
          "[APPARA CHESS] Session listener error:",
          error
        );
      }
    }
  }


  notifyChange() {
    this.notify("change", this.getSnapshot());
  }


  /* -------------------------------------------------------
     3. GAME SNAPSHOT
  ------------------------------------------------------- */

  getSnapshot() {

    const snapshot = this.state.getState();

    return {
      ...snapshot,

      turn: snapshot.currentTurn,

      fen: snapshot.fen,

      board: snapshot.board,

      history: snapshot.history || [],

      gameOver: this.state.isGameOver(),

      paused: this.state.isPaused()
    };
  }


  /* -------------------------------------------------------
     4. CHESS POSITION
  ------------------------------------------------------- */

  getFEN() {
    return this.state.getFEN();
  }


  getTurn() {
    return this.state.getTurn();
  }


  getLegalMoves(square) {

    if (!square || this.disposed) {
      return [];
    }

    return this.state.engine.getLegalMoves({
      square,
      verbose: true
    });
  }


  getMovesFrom(square) {
    return this.getLegalMoves(square);
  }


  getPiece(square) {

    if (!square || this.disposed) {
      return null;
    }

    return this.state.engine.getPiece(square);
  }


  getBoard() {

    if (this.disposed) {
      return [];
    }

    return this.state.engine.getBoard();
  }


  getHistory() {
    return this.state.getHistory();
  }


  /* -------------------------------------------------------
     5. GAME STATUS
  ------------------------------------------------------- */

  getGameStatus() {

    const status = this.state.getGameStatus();

    return {
      ...status,

      gameOver: Boolean(status.gameOver),

      isGameOver: Boolean(status.gameOver),

      inCheck: Boolean(status.inCheck)
    };
  }


  isGameOver() {
    return this.state.isGameOver();
  }


  isPaused() {
    return this.state.isPaused();
  }


  /* -------------------------------------------------------
     6. MOVE CONTROL
  ------------------------------------------------------- */

  makeMove(move) {

    if (this.disposed) {
      return {
        success: false,
        error: "Game session has been disposed."
      };
    }

    const result = this.state.makeMove(move);

    if (result?.success) {
      this.notifyChange();
    }

    return result;
  }


  undoMove() {

    if (this.disposed) {
      return {
        success: false,
        error: "Game session has been disposed."
      };
    }

    const result = this.state.undoMove();

    if (result?.success) {
      this.notifyChange();
    }

    return result;
  }


  /* -------------------------------------------------------
     7. GAME CONTROL
  ------------------------------------------------------- */

  pause() {

    const result = this.state.pause();

    if (result?.success) {
      this.notifyChange();
    }

    return result;
  }


  resume() {

    const result = this.state.resume();

    if (result?.success) {
      this.notifyChange();
    }

    return result;
  }


  resign(color = "w") {

    const result = this.state.resign(color);

    if (result?.success) {
      this.notifyChange();
    }

    return result;
  }


  claimDraw(reason) {

    const result = this.state.claimDraw(reason);

    if (result?.success) {
      this.notifyChange();
    }

    return result;
  }
   
  /* -------------------------------------------------------
     8. PLAYER MANAGEMENT
  ------------------------------------------------------- */

  setPlayer(color, playerData = {}) {

    const result = this.state.setPlayer(color, playerData);

    if (result?.success) {
      this.notifyChange();
    }

    return result;
  }


  setPlayers(players = {}) {

    const result = this.state.setPlayers(players);

    if (result?.success) {
      this.notifyChange();
    }

    return result;
  }


  /* -------------------------------------------------------
     9. POSITION MANAGEMENT
  ------------------------------------------------------- */

  loadPosition(fen) {

    const result = this.state.loadPosition(fen);

    if (result?.success) {
      this.notifyChange();
    }

    return result;
  }


  reset(options = {}) {

    const result = this.state.reset(options);

    if (result?.success) {

      this.mode = this.state.state.mode;

      this.matchId = this.state.getMatchId();

      this.notifyChange();
    }

    return result;
  }


  /* -------------------------------------------------------
     10. MATCH INFORMATION
  ------------------------------------------------------- */

  getMatchId() {
    return this.matchId;
  }


  getMode() {
    return this.mode;
  }


  getPlayer(color) {

    if (color !== "w" && color !== "b") {
      return null;
    }

    const key = color === "w" ? "white" : "black";

    return {
      ...this.state.state.players[key]
    };
  }


  /* -------------------------------------------------------
     11. DISPOSAL
  ------------------------------------------------------- */

  dispose() {

    if (this.disposed) return;

    this.disposed = true;

    this.listeners.clear();
  }

}


/* ---------------------------------------------------------
   12. AI ADAPTER
--------------------------------------------------------- */

export class GameSessionAI {

  constructor(options = {}) {

    this.engine = new ChessAI({
      level: options.level || "medium"
    });

    this.disposed = false;
  }


  async getBestMove(fen, difficulty = "medium") {

    if (this.disposed || !fen) {
      return null;
    }

    if (
      difficulty &&
      difficulty !== this.engine.level
    ) {
      this.engine.setLevel(difficulty);
    }

    try {

      const result = await this.engine.getMove(fen);

      if (
        this.disposed ||
        !result?.success ||
        !result.move
      ) {
        return null;
      }

      return result.move;

    } catch (error) {

      console.error(
        "[APPARA CHESS] AI calculation failed:",
        error
      );

      return null;
    }
  }


  setDifficulty(level) {

    if (this.disposed) return false;

    return this.engine.setLevel(level);
  }


  cancel() {

    if (this.disposed) return false;

    return this.engine.cancel();
  }


  getStats() {

    if (this.disposed) return null;

    return this.engine.getStats();
  }


  dispose() {

    if (this.disposed) return;

    this.disposed = true;

    this.engine.cancel();
    this.engine.reset();
  }
}


/* ---------------------------------------------------------
   13. GAME SESSION FACTORY
--------------------------------------------------------- */

export function createGameSession(options = {}) {

  const gameState = new GameSessionState(options);

  const aiEngine = new GameSessionAI({
    level: options.difficulty || "medium"
  });

  let disposed = false;

  return {

    gameState,

    aiEngine,

    dispose() {

      if (disposed) return;

      disposed = true;

      aiEngine.dispose();
      gameState.dispose();
    }

  };
}


/* =========================================================
   FILE 68 COMPLETE
   Path: js/chess/game-session.js
   PART 2/2 — FULL FILE COMPLETE
   ========================================================= */
