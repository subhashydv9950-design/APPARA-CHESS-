/* =========================================================
   APPARA CHESS — GAME STATE TESTS
   FILE: tests/game-state.test.js
   FULL FILE
   ========================================================= */

import {
  GameState,
  GAME_MODES,
  createGameState
} from "../js/chess/game-state.js";

import {
  Assert,
  test,
  TestRegistry
} from "./test-utils.js";

/* ---------------------------------------------------------
   REGISTER GAME STATE TEST SUITE
   --------------------------------------------------------- */

TestRegistry.register("Game State", () => {

  const tests = [];

  tests.push(
    test("GameState initializes successfully", () => {
      const game = new GameState();

      Assert.exists(game);
      Assert.equal(game instanceof GameState, true);
    })
  );

  tests.push(
    test("Factory creates a GameState instance", () => {
      const game = createGameState();

      Assert.true(game instanceof GameState);
    })
  );

  tests.push(
    test("Default mode is offline", () => {
      const game = new GameState();

      Assert.equal(
        game.getState().mode,
        GAME_MODES.OFFLINE
      );
    })
  );

  tests.push(
    test("Initial status is ready", () => {
      const game = new GameState();

      Assert.equal(
        game.getState().status,
        "ready"
      );
    })
  );

  tests.push(
    test("Initial game is not paused", () => {
      const game = new GameState();

      Assert.false(game.isPaused());
    })
  );

  tests.push(
    test("Initial game is not over", () => {
      const game = new GameState();

      Assert.false(game.isGameOver());
    })
  );

  tests.push(
    test("Match ID is generated", () => {
      const game = new GameState();

      const matchId = game.getMatchId();

      Assert.exists(matchId);
      Assert.true(matchId.startsWith("AC-"));
    })
  );

  tests.push(
    test("Initial turn is White", () => {
      const game = new GameState();

      Assert.equal(game.getTurn(), "w");
    })
  );

  tests.push(
    test("Initial move history is empty", () => {
      const game = new GameState();

      Assert.equal(game.getHistory().length, 0);
    })
  );

  tests.push(
    test("Initial FEN is available", () => {
      const game = new GameState();

      Assert.exists(game.getFEN());
      Assert.equal(typeof game.getFEN(), "string");
    })
  );

  tests.push(
    test("Game can be started", () => {
      const game = new GameState();

      const result = game.start();

      Assert.true(result.success);
      Assert.equal(
        game.getState().status,
        "active"
      );
    })
  );

  tests.push(
    test("Starting an active game is rejected", () => {
      const game = new GameState();

      game.start();

      const result = game.start();

      Assert.false(result.success);
    })
  );

  tests.push(
    test("Players can be configured before starting", () => {
      const game = new GameState();

      const result = game.setPlayer("w", {
        id: "player-white",
        name: "White Test Player"
      });

      Assert.true(result.success);
      Assert.equal(
        game.getState().players.white.name,
        "White Test Player"
      );
    })
  );

  tests.push(
    test("Invalid player color is rejected", () => {
      const game = new GameState();

      const result = game.setPlayer("x", {
        name: "Invalid Player"
      });

      Assert.false(result.success);
    })
  );

  tests.push(
    test("Players cannot be changed during active game", () => {
      const game = new GameState();

      game.start();

      const result = game.setPlayer("w", {
        name: "Changed Player"
      });

      Assert.false(result.success);
    })
  );

  tests.push(
    test("Legal move updates the game state", () => {
      const game = new GameState();

      game.start();

      const result = game.makeMove({
        from: "e2",
        to: "e4"
      });

      Assert.true(result.success);
      Assert.equal(game.getTurn(), "b");
      Assert.equal(game.getHistory().length, 1);
    })
  );

  tests.push(
    test("Move is rejected before game starts", () => {
      const game = new GameState();

      const result = game.makeMove({
        from: "e2",
        to: "e4"
      });

      Assert.false(result.success);
    })
  );

  tests.push(
    test("Game can be paused", () => {
      const game = new GameState();

      game.start();

      const result = game.pause();

      Assert.true(result.success);
      Assert.true(game.isPaused());
    })
  );

  tests.push(
    test("Moves are rejected while paused", () => {
      const game = new GameState();

      game.start();
      game.pause();

      const result = game.makeMove({
        from: "e2",
        to: "e4"
      });

      Assert.false(result.success);
    })
  );

  tests.push(
    test("Game can be resumed", () => {
      const game = new GameState();

      game.start();
      game.pause();

      const result = game.resume();

      Assert.true(result.success);
      Assert.false(game.isPaused());
    })
  );

  tests.push(
    test("Offline game supports undo", () => {
      const game = new GameState();

      game.start();

      game.makeMove({
        from: "e2",
        to: "e4"
      });

      const result = game.undoMove();

      Assert.true(result.success);
      Assert.equal(game.getTurn(), "w");
      Assert.equal(game.getHistory().length, 0);
    })
  );

  tests.push(
    test("Online ranked game rejects undo", () => {
      const game = new GameState({
        mode: GAME_MODES.ONLINE_RANKED
      });

      game.start();

      const result = game.undoMove();

      Assert.false(result.success);
    })
  );

  tests.push(
    test("Game can be finished with a draw result", () => {
      const game = new GameState();

      game.start();

      const result = game.finishGame(
        "draw",
        "test-draw"
      );

      Assert.true(result.success);
      Assert.true(game.isGameOver());
      Assert.equal(
        game.getState().result,
        "draw"
      );
    })
  );

  tests.push(
    test("Invalid game result is rejected", () => {
      const game = new GameState();

      game.start();

      const result = game.finishGame(
        "invalid-result"
      );

      Assert.false(result.success);
    })
  );

  tests.push(
    test("Finished game cannot be started again", () => {
      const game = new GameState();

      game.start();
      game.finishGame("draw");

      const result = game.start();

      Assert.false(result.success);
    })
  );

  tests.push(
    test("Resignation finishes an offline game", () => {
      const game = new GameState();

      game.start();

      const result = game.resign("w");

      Assert.true(result.success);
      Assert.true(game.isGameOver());
      Assert.equal(
        game.getState().result,
        "black"
      );
    })
  );

  tests.push(
    test("Invalid resignation color is rejected", () => {
      const game = new GameState();

      game.start();

      const result = game.resign("x");

      Assert.false(result.success);
    })
  );

  tests.push(
    test("Reset creates a fresh game", () => {
      const game = new GameState();

      game.start();

      game.makeMove({
        from: "e2",
        to: "e4"
      });

      const result = game.reset();

      Assert.true(result.success);
      Assert.equal(
        game.getState().status,
        "ready"
      );
      Assert.equal(game.getTurn(), "w");
      Assert.equal(game.getHistory().length, 0);
    })
  );

  tests.push(
    test("Game snapshot contains board and history", () => {
      const game = new GameState();

      const snapshot = game.getState();

      Assert.exists(snapshot.board);
      Assert.exists(snapshot.history);
      Assert.exists(snapshot.fen);
      Assert.exists(snapshot.chessStatus);
    })
  );

  return tests;
});

/* =========================================================
   FILE: tests/game-state.test.js
   FULL FILE COMPLETE — NEW FILE 5/10
   ========================================================= */
