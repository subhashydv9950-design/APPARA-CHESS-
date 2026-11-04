/* =========================================================
   APPARA CHESS — AI ENGINE TESTS
   FILE: tests/ai-engine.test.js
   FULL FILE
   ========================================================= */

import {
  ChessAI,
  AI_LEVELS,
  createChessAI
} from "../js/chess/ai-engine.js";

import {
  STARTING_FEN
} from "../js/chess/chess-engine.js";

import {
  Assert,
  test,
  TestRegistry
} from "./test-utils.js";

/* ---------------------------------------------------------
   REGISTER AI ENGINE TEST SUITE
   --------------------------------------------------------- */

TestRegistry.register("AI Engine", () => {

  const tests = [];

  tests.push(
    test("ChessAI initializes successfully", () => {
      const ai = new ChessAI();

      Assert.true(ai instanceof ChessAI);
      Assert.equal(ai.level, "medium");
    })
  );

  tests.push(
    test("AI factory creates ChessAI", () => {
      const ai = createChessAI();

      Assert.true(ai instanceof ChessAI);
    })
  );

  tests.push(
    test("All five difficulty levels exist", () => {
      Assert.exists(AI_LEVELS.BEGINNER);
      Assert.exists(AI_LEVELS.EASY);
      Assert.exists(AI_LEVELS.MEDIUM);
      Assert.exists(AI_LEVELS.HARD);
      Assert.exists(AI_LEVELS.EXPERT);
    })
  );

  tests.push(
    test("AI starts at medium difficulty", () => {
      const ai = new ChessAI();

      Assert.equal(ai.level, "medium");
      Assert.equal(ai.maxDepth, 2);
    })
  );

  tests.push(
    test("AI can change difficulty to beginner", () => {
      const ai = new ChessAI();

      const result = ai.setLevel("beginner");

      Assert.true(result.success);
      Assert.equal(ai.level, "beginner");
      Assert.equal(ai.maxDepth, 1);
    })
  );

  tests.push(
    test("AI can change difficulty to expert", () => {
      const ai = new ChessAI();

      const result = ai.setLevel("expert");

      Assert.true(result.success);
      Assert.equal(ai.level, "expert");
      Assert.equal(ai.maxDepth, 3);
    })
  );

  tests.push(
    test("Unknown difficulty falls back to medium", () => {
      const ai = new ChessAI();

      ai.setLevel("unknown-level");

      Assert.equal(ai.level, "medium");
    })
  );

  tests.push(
    test("AI can generate legal moves", () => {
      const ai = new ChessAI();

      const { ChessEngine } = await import(
        "../js/chess/chess-engine.js"
      );

      const engine = new ChessEngine();

      const moves = ai.getLegalMoves(engine);

      Assert.equal(moves.length, 20);
    })
  );

  tests.push(
    test("AI chooses a move from starting position", async () => {
      const ai = new ChessAI({
        level: "beginner"
      });

      const result = await ai.getMove(STARTING_FEN);

      Assert.true(result.success);
      Assert.exists(result.move);
      Assert.exists(result.move.from);
      Assert.exists(result.move.to);
    })
  );

  tests.push(
    test("AI generated move belongs to legal moves", async () => {
      const ai = new ChessAI({
        level: "beginner"
      });

      const { ChessEngine } = await import(
        "../js/chess/chess-engine.js"
      );

      const engine = new ChessEngine();

      const result = await ai.getMove(
        engine.getFEN(),
        { randomChance: 0 }
      );

      Assert.true(result.success);

      const legalMoves = ai.getLegalMoves(engine);

      Assert.true(
        legalMoves.some(move =>
          move.from === result.move.from &&
          move.to === result.move.to
        ),
        "AI returned a move that is not legal."
      );
    })
  );

  tests.push(
    test("AI can accept a ChessEngine position", async () => {
      const { ChessEngine } = await import(
        "../js/chess/chess-engine.js"
      );

      const ai = new ChessAI({
        level: "beginner"
      });

      const engine = new ChessEngine();

      const result = await ai.getMove(engine);

      Assert.true(result.success);
      Assert.exists(result.move);
    })
  );

  tests.push(
    test("AI reports its statistics", () => {
      const ai = new ChessAI();

      const stats = ai.getStats();

      Assert.equal(stats.level, "medium");
      Assert.equal(stats.depth, 2);
      Assert.equal(stats.isThinking, false);
      Assert.equal(typeof stats.nodesSearched, "number");
    })
  );

  tests.push(
    test("AI cancellation returns success", () => {
      const ai = new ChessAI();

      const result = ai.cancel();

      Assert.true(result.success);
    })
  );

  tests.push(
    test("AI reset clears search statistics", () => {
      const ai = new ChessAI();

      ai.nodesSearched = 100;
      ai.lastEvaluation = 50;

      const result = ai.reset();

      Assert.true(result.success);
      Assert.equal(ai.nodesSearched, 0);
      Assert.equal(ai.lastEvaluation, 0);
      Assert.equal(ai.transpositionTable.size, 0);
    })
  );

  tests.push(
    test("AI rejects an already finished position", async () => {
      const ai = new ChessAI({
        level: "beginner"
      });

      const checkmateFen =
        "7k/6Q1/6K1/8/8/8/8/8 b - - 0 1";

      const result = await ai.getMove(checkmateFen);

      Assert.false(result.success);
    })
  );

  return tests;
});

/* =========================================================
   FILE: tests/ai-engine.test.js
   FULL FILE COMPLETE — NEW FILE 7/10
   ========================================================= */
