/* =========================================================
   APPARA CHESS — CHESS ENGINE TESTS
   FILE: tests/chess-engine.test.js
   FULL FILE
   ========================================================= */

import {
  ChessEngine,
  STARTING_FEN,
  createChessEngine
} from "../js/chess/chess-engine.js";

import {
  Assert,
  test,
  TestRegistry
} from "./test-utils.js";

/* ---------------------------------------------------------
   REGISTER CHESS ENGINE TEST SUITE
   --------------------------------------------------------- */

TestRegistry.register("Chess Engine", () => {

  const tests = [];

  tests.push(
    test("Chess engine initializes", () => {
      const engine = createChessEngine();

      Assert.exists(engine);
      Assert.equal(typeof engine.getBoard, "function");
    })
  );

  tests.push(
    test("Starting FEN is available", () => {
      Assert.exists(STARTING_FEN);
      Assert.equal(typeof STARTING_FEN, "string");
    })
  );

  tests.push(
    test("Initial turn is White", () => {
      const engine = new ChessEngine();

      Assert.equal(engine.getTurn(), "w");
    })
  );

  tests.push(
    test("Initial board contains 32 pieces", () => {
      const engine = new ChessEngine();
      const board = engine.getBoard();

      const pieces = board.flat().filter(Boolean);

      Assert.equal(pieces.length, 32);
    })
  );

  tests.push(
    test("Initial position has 20 legal moves", () => {
      const engine = new ChessEngine();

      const status = engine.getGameStatus();

      Assert.equal(status.legalMoves, 20);
    })
  );

  tests.push(
    test("White pawn can move two squares initially", () => {
      const engine = new ChessEngine();

      const moves = engine.getLegalMoves("e2");

      Assert.true(
        moves.some(move => move.to === "e4"),
        "Expected e2 pawn to be able to move to e4."
      );
    })
  );

  tests.push(
    test("White pawn can move one square initially", () => {
      const engine = new ChessEngine();

      const moves = engine.getLegalMoves("e2");

      Assert.true(
        moves.some(move => move.to === "e3"),
        "Expected e2 pawn to be able to move to e3."
      );
    })
  );

  tests.push(
    test("Pawn cannot move through another piece", () => {
      const engine = new ChessEngine();

      const moves = engine.getLegalMoves("e2");

      Assert.false(
        moves.some(move => move.to === "e5")
      );
    })
  );

  tests.push(
    test("Legal move changes the active turn", () => {
      const engine = new ChessEngine();

      const result = engine.makeMove({
        from: "e2",
        to: "e4"
      });

      Assert.true(Boolean(result));
      Assert.equal(engine.getTurn(), "b");
    })
  );

  tests.push(
    test("Move history records a move", () => {
      const engine = new ChessEngine();

      engine.makeMove({
        from: "e2",
        to: "e4"
      });

      const history = engine.getHistory();

      Assert.equal(history.length, 1);
    })
  );

  tests.push(
    test("Undo restores the starting position", () => {
      const engine = new ChessEngine();

      engine.makeMove({
        from: "e2",
        to: "e4"
      });

      const undone = engine.undoMove();

      Assert.true(Boolean(undone));
      Assert.equal(engine.getTurn(), "w");
      Assert.equal(engine.getHistory().length, 0);
    })
  );

  tests.push(
    test("Reset restores the starting position", () => {
      const engine = new ChessEngine();

      engine.makeMove({
        from: "e2",
        to: "e4"
      });

      engine.reset();

      Assert.equal(engine.getTurn(), "w");
      Assert.equal(engine.getHistory().length, 0);
    })
  );

  tests.push(
    test("FEN can be exported", () => {
      const engine = new ChessEngine();

      const fen = engine.getFEN();

      Assert.exists(fen);
      Assert.equal(typeof fen, "string");
      Assert.includes(fen, " w ");
    })
  );

  tests.push(
    test("Starting position is not checkmate", () => {
      const engine = new ChessEngine();

      Assert.false(engine.isCheckmate());
    })
  );

  tests.push(
    test("Starting position is not stalemate", () => {
      const engine = new ChessEngine();

      Assert.false(engine.isStalemate());
    })
  );

  tests.push(
    test("Starting position is not check", () => {
      const engine = new ChessEngine();

      Assert.false(engine.isInCheck("w"));
      Assert.false(engine.isInCheck("b"));
    })
  );

  tests.push(
    test("Invalid FEN is rejected", () => {
      const engine = new ChessEngine();

      Assert.throws(() => {
        engine.loadFEN("invalid-fen");
      });
    })
  );

  tests.push(
    test("Game snapshot is available", () => {
      const engine = new ChessEngine();

      const snapshot = engine.getSnapshot();

      Assert.exists(snapshot);
      Assert.equal(typeof snapshot, "object");
    })
  );

  return tests;
});

/* =========================================================
   FILE: tests/chess-engine.test.js
   FULL FILE COMPLETE — NEW FILE 4/10
   ========================================================= */
