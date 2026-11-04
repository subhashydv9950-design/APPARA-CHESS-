
/* =========================================================
   APPARA CHESS
   FILE 66: GAME SESSION ADAPTER
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

    this.state.start();
  }

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

  getGameStatus() {
    const status = this.state.getGameStatus();

    return {
      ...status,
      gameOver: Boolean(status.gameOver),
      isGameOver: Boolean(status.gameOver),
      inCheck: Boolean(status.inCheck)
    };
  }

  makeMove(move) {
    return this.state.makeMove(move);
  }

  undoMove() {
    return this.state.undoMove();
  }

  pause() {
    return this.state.pause();
  }

  resume() {
    return this.state.resume();
  }

  resign(color = "w") {
    return this.state.resign(color);
  }

  claimDraw(reason) {
    return this.state.claimDraw(reason);
  }

  isGameOver() {
    return this.state.isGameOver();
  }

  dispose() {
    // No independent timers or event listeners are created here.
  }
}


/* ---------------------------------------------------------
   2. AI ADAPTER FOR GAME SCREEN
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

  dispose() {
    this.engine.cancel();
  }
}


/* ---------------------------------------------------------
   3. GAME SESSION FACTORY
--------------------------------------------------------- */

export function createGameSession(options = {}) {
  const gameState = new GameSessionState(options);

  const aiEngine = new GameSessionAI({
    level: options.difficulty || "medium"
  });

  return {
    gameState,
    aiEngine,

    dispose() {
      aiEngine.dispose();
      gameState.dispose();
    }
  };
}


/* =========================================================
   FILE 66 END
   Path: js/chess/game-session.js
   ========================================================= */
