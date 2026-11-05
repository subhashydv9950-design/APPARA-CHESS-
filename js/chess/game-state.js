/* =========================================================
   APPARA CHESS
   FILE 17: game-state.js
   SECTION: js/chess/
   PURPOSE: Central Chess Match State Controller
   ========================================================= */

import {
  ChessEngine,
  STARTING_FEN
} from "./chess-engine.js";

import {
  EventBus,
  APP_EVENTS
} from "../core/event-bus.js";


/* ---------------------------------------------------------
   1. GAME MODES
--------------------------------------------------------- */

export const GAME_MODES = Object.freeze({
  OFFLINE: "offline",
  TRAINING: "training",
  ONLINE_CASUAL: "online-casual",
  ONLINE_RANKED: "online-ranked",
  PRIVATE: "private"
});


/* ---------------------------------------------------------
   2. DEFAULT PLAYER DATA
--------------------------------------------------------- */

const createDefaultPlayer = (color) => ({
  id: null,
  name: color === "w" ? "White Player" : "Black Player",
  color,
  avatar: null,
  rating: 0,
  isGuest: true
});


/* ---------------------------------------------------------
   3. HELPER FUNCTIONS
--------------------------------------------------------- */

function createMatchId() {
  return (
    "AC-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 7).toUpperCase()
  );
}

function cloneData(value) {
  if (value === undefined || value === null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

function isOnlineMode(mode) {
  return (
    mode === GAME_MODES.ONLINE_CASUAL ||
    mode === GAME_MODES.ONLINE_RANKED ||
    mode === GAME_MODES.PRIVATE
  );
}


/* ---------------------------------------------------------
   4. GAME STATE CLASS
--------------------------------------------------------- */

export class GameState {

  constructor(options = {}) {

    this.engine = new ChessEngine(
      options.startingFen || STARTING_FEN
    );

    this.state = this.createInitialState(options);

    this.lastKnownStatus = this.engine.getGameStatus();
  }


  /* -------------------------------------------------------
     5. INITIAL STATE
  ------------------------------------------------------- */

  createInitialState(options = {}) {

    const mode = Object.values(GAME_MODES).includes(options.mode)
      ? options.mode
      : GAME_MODES.OFFLINE;

    return {

      matchId: createMatchId(),

      mode,

      rated: Boolean(options.rated),

      status: "ready",

      paused: false,

      createdAt: Date.now(),

      startedAt: null,

      endedAt: null,

      players: {
        white: {
          ...createDefaultPlayer("w"),
          ...(options.players?.white || {})
        },

        black: {
          ...createDefaultPlayer("b"),
          ...(options.players?.black || {})
        }
      },

      currentTurn: "w",

      moveCount: 0,

      lastMove: null,

      result: null,

      resultReason: null,

      drawClaim: null,

      metadata: {
        timeControl: cloneData(options.timeControl || null),
        roomId: options.roomId || null,
        tournamentId: options.tournamentId || null
      }

    };
  }


  /* -------------------------------------------------------
     6. START GAME
  ------------------------------------------------------- */

  start() {

    if (this.state.status === "active") {
      return {
        success: false,
        error: "Game is already active."
      };
    }

    if (this.state.status === "finished") {
      return {
        success: false,
        error: "Create a new game to continue."
      };
    }

    this.state.status = "active";
    this.state.startedAt = Date.now();
    this.state.paused = false;

    const snapshot = this.getState();

    EventBus.emit(APP_EVENTS.GAME.START, snapshot);

    return {
      success: true,
      state: snapshot
    };
  }


  /* -------------------------------------------------------
     7. GET CURRENT GAME STATE
  ------------------------------------------------------- */

  getState() {

    const engineSnapshot = this.engine.getSnapshot();
    const engineStatus = this.engine.getGameStatus();

    return {

      ...cloneData(this.state),

      board: cloneData(engineSnapshot),

      currentTurn: this.engine.getTurn(),

      moveCount: this.engine.getHistory().length,

      fen: this.engine.getFEN(),

      history: cloneData(this.engine.getHistory()),

      chessStatus: cloneData(engineStatus)

    };
  }


  /* -------------------------------------------------------
     8. PLAYER MANAGEMENT
  ------------------------------------------------------- */

  setPlayer(color, playerData = {}) {

    if (color !== "w" && color !== "b") {
      return {
        success: false,
        error: "Invalid player color."
      };
    }

    if (this.state.status === "active") {
      return {
        success: false,
        error: "Players cannot be changed during an active match."
      };
    }

    const key = color === "w" ? "white" : "black";

    this.state.players[key] = {
      ...this.state.players[key],
      ...cloneData(playerData),
      color
    };

    return {
      success: true,
      player: cloneData(this.state.players[key])
    };
  }


  setPlayers(players = {}) {

    const whiteResult = players.white
      ? this.setPlayer("w", players.white)
      : { success: true };

    const blackResult = players.black
      ? this.setPlayer("b", players.black)
      : { success: true };

    if (!whiteResult.success || !blackResult.success) {
      return {
        success: false,
        error: "Unable to update players."
      };
    }

    return {
      success: true,
      players: cloneData(this.state.players)
    };
  }


  /* -------------------------------------------------------
     9. MAKE CHESS MOVE
  ------------------------------------------------------- */

  makeMove(moveInput) {

    if (this.state.status !== "active") {
      return {
        success: false,
        error: "Game is not active."
      };
    }

    if (this.state.paused) {
      return {
        success: false,
        error: "Game is paused."
      };
    }

    if (this.state.result) {
      return {
        success: false,
        error: "Game has already ended."
      };
    }

    const result = this.engine.makeMove(moveInput);

    if (!result.success) {
      return result;
    }

    const move = cloneData(result.move);

    this.state.lastMove = move;
    this.state.currentTurn = this.engine.getTurn();
    this.state.moveCount = this.engine.getHistory().length;

    this.state.drawClaim = null;

    const chessStatus = this.engine.getGameStatus();

    EventBus.emit(APP_EVENTS.GAME.MOVE, {
      matchId: this.state.matchId,
      move,
      state: this.getState()
    });

    EventBus.emit(APP_EVENTS.GAME.POSITION_UPDATED, {
      fen: this.engine.getFEN(),
      board: this.engine.getSnapshot()
    });

    if (chessStatus?.inCheck) {
      EventBus.emit(APP_EVENTS.GAME.CHECK, {
        matchId: this.state.matchId,
        color: this.engine.getTurn()
      });
    }

    if (chessStatus?.gameOver) {
      this.finishFromEngineStatus(chessStatus);
    } else {
      this.lastKnownStatus = chessStatus;
    }

    return {
      success: true,
      move,
      snapshot: this.getState()
    };
  }
   
  /* -------------------------------------------------------
     10. FINISH GAME FROM CHESS ENGINE
  ------------------------------------------------------- */

  finishFromEngineStatus(status = {}) {

    if (this.state.result) {
      return;
    }

    let result = "draw";
    let reason = status.reason || status.state || "game-over";

    // ChessEngine winner formats: white/black and w/b.
    if (status.winner === "w" || status.winner === "white") {
      result = "white";
    } else if (
      status.winner === "b" ||
      status.winner === "black"
    ) {
      result = "black";
    }

    this.finishGame(result, reason);

    if (status.state === "checkmate") {
      EventBus.emit(APP_EVENTS.GAME.CHECKMATE, {
        matchId: this.state.matchId,
        winner: result
      });
    }

    if (result === "draw") {
      EventBus.emit(APP_EVENTS.GAME.DRAW, {
        matchId: this.state.matchId,
        reason
      });
    }
  }


  /* -------------------------------------------------------
     11. FINISH GAME
  ------------------------------------------------------- */

  finishGame(result, reason = "completed") {

    if (this.state.result) {
      return {
        success: false,
        error: "Game has already finished."
      };
    }

    const allowedResults = ["white", "black", "draw"];

    if (!allowedResults.includes(result)) {
      return {
        success: false,
        error: "Invalid game result."
      };
    }

    this.state.result = result;
    this.state.resultReason = reason;
    this.state.status = "finished";
    this.state.paused = false;
    this.state.endedAt = Date.now();

    const finalState = this.getState();

    EventBus.emit(APP_EVENTS.GAME.END, finalState);

    return {
      success: true,
      result,
      reason,
      state: finalState
    };
  }


  /* -------------------------------------------------------
     12. DRAW CLAIM
  ------------------------------------------------------- */

  claimDraw(reason) {

    if (this.state.status !== "active") {
      return {
        success: false,
        error: "Game is not active."
      };
    }

    if (this.state.paused) {
      return {
        success: false,
        error: "Game is paused."
      };
    }

    if (reason !== "threefold" && reason !== "fifty-move") {
      return {
        success: false,
        error: "Unsupported draw claim."
      };
    }

    const canClaim = reason === "threefold"
      ? this.engine.canClaimThreefoldRepetition()
      : this.engine.canClaimFiftyMoveDraw();

    if (!canClaim) {
      return {
        success: false,
        error: "Draw cannot be claimed in this position."
      };
    }

    // Online results must be confirmed by the server.
    if (isOnlineMode(this.state.mode)) {

      EventBus.emit(APP_EVENTS.GAME.DRAW, {
        matchId: this.state.matchId,
        reason,
        pendingServerValidation: true
      });

      return {
        success: true,
        pending: true,
        message: "Draw claim sent for server validation."
      };
    }

    this.state.drawClaim = reason;

    return this.finishGame("draw", reason);
  }


  /* -------------------------------------------------------
     13. RESIGN
  ------------------------------------------------------- */

  resign(color) {

    if (color !== "w" && color !== "b") {
      return {
        success: false,
        error: "Invalid player color."
      };
    }

    if (this.state.status !== "active") {
      return {
        success: false,
        error: "Game is not active."
      };
    }

    if (isOnlineMode(this.state.mode)) {

      EventBus.emit(APP_EVENTS.GAME.RESIGN, {
        matchId: this.state.matchId,
        color,
        pendingServerValidation: true
      });

      return {
        success: true,
        pending: true,
        message: "Resignation sent for server validation."
      };
    }

    const winner = color === "w" ? "black" : "white";

    EventBus.emit(APP_EVENTS.GAME.RESIGN, {
      matchId: this.state.matchId,
      color
    });

    return this.finishGame(winner, "resignation");
  }


  /* -------------------------------------------------------
     14. UNDO MOVE
  ------------------------------------------------------- */

  undoMove() {

    if (this.state.status !== "active") {
      return {
        success: false,
        error: "Game is not active."
      };
    }

    if (this.state.paused) {
      return {
        success: false,
        error: "Game is paused."
      };
    }

    if (
      this.state.mode === GAME_MODES.ONLINE_RANKED ||
      this.state.mode === GAME_MODES.ONLINE_CASUAL ||
      this.state.mode === GAME_MODES.PRIVATE
    ) {
      return {
        success: false,
        error: "Undo is not available in online matches."
      };
    }

    const result = this.engine.undoMove();

    if (!result || !result.success) {
      return result || {
        success: false,
        error: "Unable to undo the move."
      };
    }

    const history = this.engine.getHistory();

    // Restore the actual previous move, if one remains.
    this.state.lastMove = history.length
      ? cloneData(history[history.length - 1])
      : null;

    this.state.currentTurn = this.engine.getTurn();
    this.state.moveCount = history.length;

    this.lastKnownStatus = this.engine.getGameStatus();

    EventBus.emit(APP_EVENTS.GAME.UNDO, {
      matchId: this.state.matchId,
      state: this.getState()
    });

    EventBus.emit(APP_EVENTS.GAME.POSITION_UPDATED, {
      fen: this.engine.getFEN(),
      board: this.engine.getSnapshot()
    });

    return {
      success: true,
      snapshot: this.getState()
    };
  }
   
  /* -------------------------------------------------------
     15. PAUSE GAME
  ------------------------------------------------------- */

  pause() {

    if (this.state.status !== "active") {
      return {
        success: false,
        error: "Game is not active."
      };
    }

    if (this.state.paused) {
      return {
        success: true,
        message: "Game is already paused."
      };
    }

    this.state.paused = true;

    EventBus.emit(APP_EVENTS.GAME.PAUSE, {
      matchId: this.state.matchId
    });

    return {
      success: true,
      state: this.getState()
    };
  }


  /* -------------------------------------------------------
     16. RESUME GAME
  ------------------------------------------------------- */

  resume() {

    if (this.state.status !== "active") {
      return {
        success: false,
        error: "Game is not active."
      };
    }

    if (!this.state.paused) {
      return {
        success: true,
        message: "Game is already running."
      };
    }

    this.state.paused = false;

    EventBus.emit(APP_EVENTS.GAME.RESUME, {
      matchId: this.state.matchId
    });

    return {
      success: true,
      state: this.getState()
    };
  }


  /* -------------------------------------------------------
     17. LOAD POSITION
  ------------------------------------------------------- */

  loadPosition(fen) {

    if (this.state.status === "active") {
      return {
        success: false,
        error: "Cannot replace an active game position."
      };
    }

    if (typeof fen !== "string" || !fen.trim()) {
      return {
        success: false,
        error: "A valid FEN position is required."
      };
    }

    try {

      // ChessEngine.loadFEN returns a snapshot on success.
      // It does not return a { success: true } wrapper.
      const snapshot = this.engine.loadFEN(fen.trim());

      if (!snapshot || !snapshot.fen) {
        return {
          success: false,
          error: "Unable to load the supplied FEN position."
        };
      }

      this.state.currentTurn = this.engine.getTurn();
      this.state.moveCount = this.engine.getHistory().length;
      this.state.lastMove = null;
      this.state.result = null;
      this.state.resultReason = null;
      this.state.drawClaim = null;
      this.state.endedAt = null;

      this.lastKnownStatus = this.engine.getGameStatus();

      EventBus.emit(APP_EVENTS.GAME.POSITION_UPDATED, {
        fen: this.engine.getFEN(),
        board: this.engine.getSnapshot()
      });

      return {
        success: true,
        state: this.getState()
      };

    } catch (error) {

      return {
        success: false,
        error: error?.message || "Invalid FEN position."
      };
    }
  }


  /* -------------------------------------------------------
     18. RESET GAME
  ------------------------------------------------------- */

  reset(options = {}) {

    const mode = Object.values(GAME_MODES).includes(options.mode)
      ? options.mode
      : this.state.mode;

    try {

      this.engine = new ChessEngine(
        options.startingFen || STARTING_FEN
      );

      this.state = this.createInitialState({
        ...options,
        mode
      });

      this.lastKnownStatus = this.engine.getGameStatus();

      return {
        success: true,
        state: this.getState()
      };

    } catch (error) {

      return {
        success: false,
        error: error?.message || "Unable to reset the game."
      };
    }
  }


  /* -------------------------------------------------------
     19. QUICK ACCESS METHODS
  ------------------------------------------------------- */

  getFEN() {
    return this.engine.getFEN();
  }

  getTurn() {
    return this.engine.getTurn();
  }

  getHistory() {
    return cloneData(this.engine.getHistory());
  }

  getGameStatus() {
    return cloneData(this.engine.getGameStatus());
  }

  getMatchId() {
    return this.state.matchId;
  }

  isGameOver() {
    return this.state.status === "finished";
  }

  isPaused() {
    return this.state.paused;
  }

}


/* ---------------------------------------------------------
   20. FACTORY FUNCTION
--------------------------------------------------------- */

export function createGameState(options = {}) {
  return new GameState(options);
}


/* =========================================================
   FILE 17 END
   FILE: js/chess/game-state.js
   FULL FILE COMPLETE
   ========================================================= */
