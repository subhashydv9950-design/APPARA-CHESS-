
/* =========================================================
   APPARA CHESS — FILE 44
   FILE: js/services/online-game-service.js
   SECTION: ONLINE CHESS GAMEPLAY
   ========================================================= */

export const ONLINE_GAME_EVENTS = Object.freeze({
  GAME_STARTED: "online-game:started",
  STATE_UPDATED: "online-game:state-updated",
  MOVE_SUBMITTED: "online-game:move-submitted",
  MOVE_RECEIVED: "online-game:move-received",
  DRAW_OFFERED: "online-game:draw-offered",
  DRAW_ACCEPTED: "online-game:draw-accepted",
  DRAW_DECLINED: "online-game:draw-declined",
  RESIGNED: "online-game:resigned",
  GAME_FINISHED: "online-game:finished",
  OPPONENT_DISCONNECTED: "online-game:opponent-disconnected",
  ERROR: "online-game:error"
});

export class OnlineGameService {
  constructor({
    firebaseService,
    authService,
    playerService,
    gameState
  } = {}) {
    this.firebase = firebaseService;
    this.auth = authService;
    this.players = playerService;
    this.gameState = gameState;

    this.listeners = new Map();
    this.currentGame = null;
    this.unsubscribeGame = null;
    this.pendingMove = false;
    this.initialized = false;
  }

  initialize() {
    if (!this.firebase || !this.auth || !this.players) {
      throw new Error("OnlineGameService dependencies missing.");
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
      throw new Error("Online game खेलने के लिए login जरूरी है।");
    }

    return uid;
  }

  requireGame() {
    if (!this.currentGame) {
      throw new Error("कोई active online game नहीं है।");
    }

    return this.currentGame;
  }

  getGameID() {
    const game = this.requireGame();
    return game.gameID || game.id || null;
  }

  async callBackend(name, payload = {}) {
    if (typeof this.firebase.callFunction !== "function") {
      throw new Error(
        "Firebase Cloud Function connection configure करना बाकी है।"
      );
    }

    return this.firebase.callFunction(name, payload);
  }

  normalizeGame(game) {
    if (!game || typeof game !== "object") {
      throw new Error("Invalid online game data.");
    }

    return {
      ...game,
      gameID: game.gameID || game.id || null,
      status: game.status || "waiting"
    };
  }

  async startGame(gameData) {
    this.requireLogin();

    if (!gameData) {
      throw new Error("Game data जरूरी है।");
    }

    this.stopListening();

    this.currentGame = this.normalizeGame(gameData);

    this.emit(
      ONLINE_GAME_EVENTS.GAME_STARTED,
      this.currentGame
    );

    return this.currentGame;
  }

  async joinGame(gameID) {
    const uid = this.requireLogin();

    if (!gameID || typeof gameID !== "string") {
      throw new Error("Valid game ID जरूरी है।");
    }

    const result = await this.callBackend(
      "joinOnlineChessGame",
      { gameID, uid }
    );

    if (!result?.game) {
      throw new Error("Online game join नहीं हो पाया।");
    }

    await this.startGame(result.game);
    this.startListening();

    return this.currentGame;
  }

  startListening() {
    const gameID = this.getGameID();

    if (!gameID) {
      throw new Error("Game ID उपलब्ध नहीं है।");
    }

    this.stopListening();

    if (typeof this.firebase.subscribeDocument !== "function") {
      throw new Error(
        "Firebase realtime subscription method configure करना बाकी है।"
      );
    }

    this.unsubscribeGame = this.firebase.subscribeDocument(
      "onlineGames",
      gameID,
      snapshot => this.handleGameUpdate(snapshot),
      error => this.emit(ONLINE_GAME_EVENTS.ERROR, error)
    );

    return true;
  }

  handleGameUpdate(snapshot) {
    if (!snapshot) return;

    const updatedGame = snapshot.data || snapshot;

    if (!updatedGame || typeof updatedGame !== "object") {
      return;
    }

    const previousGame = this.currentGame;

    this.currentGame = this.normalizeGame(updatedGame);

    this.emit(
      ONLINE_GAME_EVENTS.STATE_UPDATED,
      this.currentGame
    );

    const previousMoves = previousGame?.moves || [];
    const currentMoves = this.currentGame.moves || [];

    if (currentMoves.length > previousMoves.length) {
      const latestMove = currentMoves[currentMoves.length - 1];

      this.emit(
        ONLINE_GAME_EVENTS.MOVE_RECEIVED,
        latestMove
      );
    }

    if (
      this.currentGame.status === "finished" ||
      this.currentGame.status === "completed"
    ) {
      this.emit(
        ONLINE_GAME_EVENTS.GAME_FINISHED,
        this.currentGame.result || this.currentGame
      );

      this.stopListening();
    }

    if (this.currentGame.opponentConnected === false) {
      this.emit(
        ONLINE_GAME_EVENTS.OPPONENT_DISCONNECTED,
        this.currentGame.opponent || null
      );
    }
  }

  async submitMove(move) {
    const uid = this.requireLogin();
    const gameID = this.getGameID();

    if (this.pendingMove) {
      throw new Error("पिछली move अभी process हो रही है।");
    }

    if (!move || typeof move !== "object") {
      throw new Error("Invalid chess move.");
    }

    if (!move.from || !move.to) {
      throw new Error("Move में from और to squares जरूरी हैं।");
    }

    if (
      this.currentGame.status !== "active" &&
      this.currentGame.status !== "playing"
    ) {
      throw new Error("यह game अभी active नहीं है।");
    }

    this.pendingMove = true;

    try {
      const result = await this.callBackend(
        "submitOnlineChessMove",
        {
          gameID,
          uid,
          move: {
            from: move.from,
            to: move.to,
            promotion: move.promotion || null
          },
          expectedMoveNumber: (
            this.currentGame.moves || []
          ).length
        }
      );

      if (!result?.success) {
        throw new Error(
          result?.message || "Move accept नहीं हुई।"
        );
      }

      this.emit(
        ONLINE_GAME_EVENTS.MOVE_SUBMITTED,
        result
      );

      if (result.game) {
        this.currentGame = this.normalizeGame(result.game);

        this.emit(
          ONLINE_GAME_EVENTS.STATE_UPDATED,
          this.currentGame
        );
      }

      return result;
    } catch (error) {
      this.emit(ONLINE_GAME_EVENTS.ERROR, error);
      throw error;
    } finally {
      this.pendingMove = false;
    }
  }

  async offerDraw() {
    const uid = this.requireLogin();
    const gameID = this.getGameID();

    const result = await this.callBackend(
      "offerOnlineChessDraw",
      { gameID, uid }
    );

    this.emit(ONLINE_GAME_EVENTS.DRAW_OFFERED, result);
    return result;
  }

  async respondToDraw(accept) {
    const uid = this.requireLogin();
    const gameID = this.getGameID();

    const result = await this.callBackend(
      "respondOnlineChessDraw",
      {
        gameID,
        uid,
        accept: Boolean(accept)
      }
    );

    this.emit(
      accept
        ? ONLINE_GAME_EVENTS.DRAW_ACCEPTED
        : ONLINE_GAME_EVENTS.DRAW_DECLINED,
      result
    );

    if (result?.game) {
      this.currentGame = this.normalizeGame(result.game);
    }

    return result;
  }

  async resign() {
    const uid = this.requireLogin();
    const gameID = this.getGameID();

    const result = await this.callBackend(
      "resignOnlineChessGame",
      { gameID, uid }
    );

    this.emit(ONLINE_GAME_EVENTS.RESIGNED, result);

    if (result?.game) {
      this.currentGame = this.normalizeGame(result.game);
    }

    this.stopListening();
    return result;
  }

  async claimDraw(reason) {
    const uid = this.requireLogin();
    const gameID = this.getGameID();

    const allowedReasons = [
      "threefold-repetition",
      "fifty-move-rule"
    ];

    if (!allowedReasons.includes(reason)) {
      throw new Error("Invalid draw claim reason.");
    }

    return this.callBackend(
      "claimOnlineChessDraw",
      {
        gameID,
        uid,
        reason
      }
    );
  }

  async sendGameAction(action, details = {}) {
    const uid = this.requireLogin();
    const gameID = this.getGameID();

    const allowedActions = [
      "request-rematch",
      "cancel-rematch",
      "report-disconnection"
    ];

    if (!allowedActions.includes(action)) {
      throw new Error("Unsupported online game action.");
    }

    return this.callBackend(
      "onlineChessGameAction",
      {
        gameID,
        uid,
        action,
        details
      }
    );
  }

  getCurrentGame() {
    return this.currentGame
      ? { ...this.currentGame }
      : null;
  }

  getOpponent() {
    const game = this.currentGame;

    if (!game) return null;

    const uid = this.getUID();

    if (game.white?.uid === uid) return game.black || null;
    if (game.black?.uid === uid) return game.white || null;

    return null;
  }

  isMyTurn() {
    const game = this.currentGame;

    if (!game) return false;

    const uid = this.getUID();

    const myColor =
      game.white?.uid === uid
        ? "white"
        : game.black?.uid === uid
          ? "black"
          : null;

    return Boolean(
      myColor &&
      game.turn === myColor &&
      (game.status === "active" || game.status === "playing")
    );
  }

  isMovePending() {
    return this.pendingMove;
  }

  stopListening() {
    if (typeof this.unsubscribeGame === "function") {
      this.unsubscribeGame();
    }

    this.unsubscribeGame = null;
  }

  async leaveGame() {
    const game = this.currentGame;

    if (!game) return false;

    const uid = this.requireLogin();

    try {
      await this.callBackend("leaveOnlineChessGame", {
        gameID: game.gameID,
        uid
      });
    } finally {
      this.stopListening();
      this.currentGame = null;
      this.pendingMove = false;
    }

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
        console.error("OnlineGameService listener error:", error);
      }
    });
  }

  dispose() {
    this.stopListening();
    this.listeners.clear();
    this.currentGame = null;
    this.pendingMove = false;
    this.initialized = false;
  }
}

export function createOnlineGameService(dependencies) {
  return new OnlineGameService(dependencies);
}

/* ================= FILE 44 END ================= */
      
