/* =========================================================
   APPARA CHESS
   FILE 68: GAME SESSION ADAPTER
   Path: js/chess/game-session.js
   Connects GameState, ChessAI and GameScreen
   ========================================================= */

import {
  GameState,
  GAME_MODES
} from "./game-state.js";

import {
  ChessAI
} from "./ai-engine.js";

import {
  EventBus,
  APP_EVENTS
} from "../core/event-bus.js";


/* ---------------------------------------------------------
   1. GAME STATE ADAPTER
--------------------------------------------------------- */

export class GameSessionState {
  constructor(options = {}) {
    this.mode = options.mode || GAME_MODES.OFFLINE;

    this.state = new GameState({
      mode: this.mode,
      rated: Boolean(options.rated),
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
    this.unsubscribers = [];

    this.state.start();

    this.matchId = this.state.getMatchId();

    this.subscribeToGameEvents();
  }


  /* -------------------------------------------------------
     2. GAME EVENT SUBSCRIPTION
  ------------------------------------------------------- */

  subscribeToGameEvents() {
    const unsubscribeMove = EventBus.on(
      APP_EVENTS.GAME.MOVE,
      event => {
        const detail = event?.detail || {};

        if (detail.matchId !== this.matchId) return;

        this.notify("change", this.getSnapshot());
      }
    );

    this.unsubscribers.push(unsubscribeMove);
  }


  /* -------------------------------------------------------
     3. LOCAL EVENT LISTENERS
  ------------------------------------------------------- */

  on(eventName, callback) {
    if (typeof callback !== "function") {
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
    const listeners = this.listeners.get(eventName);

    if (!listeners) return;

    for (const callback of [...listeners]) {
      try {
        callback(data);
      } catch (error) {
        console.error(
          "[APPARA CHESS] Game listener error:",
          error
        );
      }
    }
  }


  /* -------------------------------------------------------
     4. GAME SNAPSHOT
  ------------------------------------------------------- */

  getSnapshot() {
    const snapshot = this.state.getState();

    return {
      ...snapshot,
      turn: snapshot.currentTurn,
      fen: snapshot.fen,
      board: snapshot.board,
      history: snapshot.history || []
    };
  }


  /* -------------------------------------------------------
     5. CHESS POSITION
  ------------------------------------------------------- */

  getFEN() {
    return this.state.getFEN();
  }


  getTurn() {
    return this.state.getTurn();
  }


  getLegalMoves(square) {
    if (!square) return [];

    return this.state.engine.getLegalMoves({
      square,
      verbose: true
    });
  }


  getMovesFrom(square) {
    return this.getLegalMoves(square);
  }


  getPiece(square) {
    return this.state.engine.getPiece(square);
  }


  getBoard() {
    return this.state.engine.getBoard();
  }


  getHistory() {
    return this.state.getHistory();
  }


  /* -------------------------------------------------------
     6. GAME STATUS
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
     7. MOVE CONTROL
  ------------------------------------------------------- */

  makeMove(move) {
    const result = this.state.makeMove(move);

    if (result?.success) {
      this.notify("change", this.getSnapshot());
    }

    return result;
  }


  undoMove() {
    const result = this.state.undoMove();

    if (result?.success) {
      this.notify("change", this.getSnapshot());
    }

    return result;
  }


  /* -------------------------------------------------------
     8. GAME CONTROL
  ------------------------------------------------------- */

  pause() {
    const result = this.state.pause();

    if (result?.success) {
      this.notify("change", this.getSnapshot());
    }

    return result;
  }


  resume() {
    const result = this.state.resume();

    if (result?.success) {
      this.notify("change", this.getSnapshot());
    }

    return result;
  }


  resign(color = "w") {
    const result = this.state.resign(color);

    if (result?.success) {
      this.notify("change", this.getSnapshot());
    }

    return result;
  }


  claimDraw(reason) {
    const result = this.state.claimDraw(reason);

    if (result?.success) {
      this.notify("change", this.getSnapshot());
    }

    return result;
  }


  /* -------------------------------------------------------
     9. MATCH INFORMATION
  ------------------------------------------------------- */

  getMatchId() {
    return this.matchId;
  }


  getMode() {
    return this.mode;
  }


  /* -------------------------------------------------------
     10. DISPOSAL
  ------------------------------------------------------- */

  dispose() {
    for (const unsubscribe of this.unsubscribers) {
      try {
        unsubscribe();
      } catch (error) {
        console.warn("Game event cleanup failed:", error);
      }
    }

    this.unsubscribers = [];
    this.listeners.clear();
  }
}


/* ---------------------------------------------------------
   11. AI ADAPTER
--------------------------------------------------------- */

export class GameSessionAI {
  constructor(options = {}) {
    this.engine = new ChessAI({
      level: options.level || "medium"
    });
  }


  async getBestMove(fen, difficulty = "medium") {
    if (difficulty && difficulty !== this.engine.level) {
      this.engine.setLevel(difficulty);
    }

    const result = await this.engine.getMove(fen);

    if (!result?.success || !result.move) {
      return null;
    }

    return result.move;
  }


  setDifficulty(level) {
    return this.engine.setLevel(level);
  }


  cancel() {
    return this.engine.cancel();
  }


  getStats() {
    return this.engine.getStats();
  }


  dispose() {
    this.engine.cancel();
    this.engine.reset();
  }
}


/* ---------------------------------------------------------
   12. GAME SESSION FACTORY
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
   ========================================================= */
