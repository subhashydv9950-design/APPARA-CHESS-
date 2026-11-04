/* =========================================================
   APPARA CHESS — GAME SESSION TESTS
   FILE: tests/game-session.test.js
   FULL FILE
   ========================================================= */

import {
  GameSessionState,
  GameSessionAI,
  createGameSession
} from "../js/chess/game-session.js";

import {
  GAME_MODES
} from "../js/chess/game-state.js";

import {
  Assert,
  test,
  TestRegistry
} from "./test-utils.js";

/* ---------------------------------------------------------
   REGISTER GAME SESSION TEST SUITE
   --------------------------------------------------------- */

TestRegistry.register("Game Session", () => {

  const tests = [];

  tests.push(
    test("GameSessionState initializes", () => {
      const session = new GameSessionState();

      Assert.true(session instanceof GameSessionState);
      session.dispose();
    })
  );

  tests.push(
    test("Game session starts automatically", () => {
      const session = new GameSessionState();

      Assert.equal(
        session.getSnapshot().status,
        "active"
      );

      session.dispose();
    })
  );

  tests.push(
    test("Default game mode is offline", () => {
      const session = new GameSessionState();

      Assert.equal(
        session.getMode(),
        GAME_MODES.OFFLINE
      );

      session.dispose();
    })
  );

  tests.push(
    test("Custom game mode is accepted", () => {
      const session = new GameSessionState({
        mode: GAME_MODES.TRAINING
      });

      Assert.equal(
        session.getMode(),
        GAME_MODES.TRAINING
      );

      session.dispose();
    })
  );

  tests.push(
    test("Session provides a match ID", () => {
      const session = new GameSessionState();

      Assert.exists(session.getMatchId());
      Assert.true(
        session.getMatchId().startsWith("AC-")
      );

      session.dispose();
    })
  );

  tests.push(
    test("Session provides a valid FEN", () => {
      const session = new GameSessionState();

      const fen = session.getFEN();

      Assert.equal(typeof fen, "string");
      Assert.includes(fen, " w ");

      session.dispose();
    })
  );

  tests.push(
    test("Session provides the chess board", () => {
      const session = new GameSessionState();

      const board = session.getBoard();

      Assert.exists(board);
      Assert.equal(board.length, 8);

      session.dispose();
    })
  );

  tests.push(
    test("Session provides a game snapshot", () => {
      const session = new GameSessionState();

      const snapshot = session.getSnapshot();

      Assert.exists(snapshot.board);
      Assert.exists(snapshot.history);
      Assert.exists(snapshot.fen);
      Assert.equal(snapshot.turn, "w");

      session.dispose();
    })
  );

  tests.push(
    test("Session starts with White turn", () => {
      const session = new GameSessionState();

      Assert.equal(session.getTurn(), "w");

      session.dispose();
    })
  );

  tests.push(
    test("Session records a legal move", () => {
      const session = new GameSessionState();

      const result = session.makeMove({
        from: "e2",
        to: "e4"
      });

      Assert.true(result.success);
      Assert.equal(session.getTurn(), "b");
      Assert.equal(session.getHistory().length, 1);

      session.dispose();
    })
  );

  tests.push(
    test("Session rejects an illegal move", () => {
      const session = new GameSessionState();

      const result = session.makeMove({
        from: "e2",
        to: "e5"
      });

      Assert.false(result.success);

      session.dispose();
    })
  );

  tests.push(
    test("Session supports local change listeners", () => {
      const session = new GameSessionState();

      let changeCount = 0;

      const unsubscribe = session.on(
        "change",
        () => {
          changeCount++;
        }
      );

      session.makeMove({
        from: "e2",
        to: "e4"
      });

      Assert.equal(changeCount, 1);

      unsubscribe();
      session.dispose();
    })
  );

  tests.push(
    test("Session can remove a listener", () => {
      const session = new GameSessionState();

      const callback = () => {};

      session.on("change", callback);

      const removed = session.off(
        "change",
        callback
      );

      Assert.true(removed);

      session.dispose();
    })
  );

  tests.push(
    test("Session can pause the game", () => {
      const session = new GameSessionState();

      const result = session.pause();

      Assert.true(result.success);
      Assert.true(session.isPaused());

      session.dispose();
    })
  );

  tests.push(
    test("Session can resume the game", () => {
      const session = new GameSessionState();

      session.pause();

      const result = session.resume();

      Assert.true(result.success);
      Assert.false(session.isPaused());

      session.dispose();
    })
  );

  tests.push(
    test("Session can undo an offline move", () => {
      const session = new GameSessionState();

      session.makeMove({
        from: "e2",
        to: "e4"
      });

      const result = session.undoMove();

      Assert.true(result.success);
      Assert.equal(session.getTurn(), "w");
      Assert.equal(session.getHistory().length, 0);

      session.dispose();
    })
  );

  tests.push(
    test("Session can report game status", () => {
      const session = new GameSessionState();

      const status = session.getGameStatus();

      Assert.exists(status);
      Assert.equal(typeof status.gameOver, "boolean");
      Assert.equal(typeof status.inCheck, "boolean");

      session.dispose();
    })
  );

  tests.push(
    test("Session can be disposed safely", () => {
      const session = new GameSessionState();

      session.dispose();
      session.dispose();

      Assert.equal(session.listeners.size, 0);
      Assert.equal(session.unsubscribers.length, 0);
    })
  );

  tests.push(
    test("Factory creates a complete game session", () => {
      const session = createGameSession();

      Assert.exists(session.gameState);
      Assert.exists(session.aiEngine);
      Assert.equal(
        typeof session.dispose,
        "function"
      );

      session.dispose();
    })
  );

  tests.push(
    test("Factory session can be disposed repeatedly", () => {
      const session = createGameSession();

      session.dispose();
      session.dispose();

      Assert.true(true);
    })
  );

  tests.push(
    test("AI adapter initializes", () => {
      const ai = new GameSessionAI({
        level: "medium"
      });

      Assert.exists(ai);
      Assert.equal(
        typeof ai.getBestMove,
        "function"
      );

      ai.dispose();
    })
  );

  return tests;
});

/* =========================================================
   FILE: tests/game-session.test.js
   FULL FILE COMPLETE — NEW FILE 6/10
   ========================================================= */
