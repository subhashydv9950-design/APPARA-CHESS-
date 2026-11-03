/* =========================================
   APPARA CHESS — CHESS ENGINE
   PART 08 START
========================================= */

"use strict";

window.APPARA_ENGINE = (function () {

  let chess = null;

  function ensureLibrary() {
    if (typeof window.Chess !== "function") {
      throw new Error(
        "Chess.js library is missing. Check the chess.js CDN in index.html."
      );
    }
  }

  function createGame(fen) {
    ensureLibrary();

    try {
      chess = fen && fen !== "start"
        ? new window.Chess(fen)
        : new window.Chess();

      return chess;
    } catch (error) {
      chess = new window.Chess();
      throw error;
    }
  }

  function getGame() {
    if (!chess) {
      createGame();
    }
    return chess;
  }

  function reset() {
    getGame().reset();
    return getFEN();
  }

  function load(fen) {
    if (typeof fen !== "string" || !fen.trim()) {
      throw new Error("A valid FEN position is required.");
    }

    const result = getGame().load(fen);

    if (result === false) {
      throw new Error("Invalid chess position.");
    }

    return getFEN();
  }

  function move(from, to, promotion) {
    if (!from || !to) {
      return null;
    }

    const moveData = {
      from: from,
      to: to
    };

    if (promotion) {
      moveData.promotion = promotion;
    }

    try {
      return getGame().move(moveData);
    } catch (error) {
      console.warn("[APPARA] Invalid move:", error);
      return null;
    }
  }

  function undo() {
    return getGame().undo();
  }

  function moves(square, options) {
    if (square && typeof square === "object") {
      return getGame().moves(square);
    }

    if (typeof square === "string") {
      return getGame().moves({
        square: square,
        verbose: !!(options && options.verbose)
      });
    }

    return getGame().moves({
      verbose: !!(options && options.verbose)
    });
  }

  function getLegalMoves(square) {
    return getGame().moves({
      square: square,
      verbose: true
    });
  }

  function getBoard() {
    return getGame().board();
  }

  function getHistory(options) {
    return getGame().history(options || {});
  }

  function getFEN() {
    return getGame().fen();
  }

  function getPGN() {
    return getGame().pgn();
  }

  function turn() {
    return getGame().turn();
  }

  function getPiece(square) {
    if (!square) {
      return null;
    }

    return getGame().get(square);
  }

  function isGameOver() {
    return getGame().game_over();
  }

  function isCheck() {
    return getGame().in_check();
  }

  function isCheckmate() {
    return getGame().in_checkmate();
  }

  function isDraw() {
    return getGame().in_draw();
  }

  function isStalemate() {
    return getGame().in_stalemate();
  }

  function isThreefoldRepetition() {
    return getGame().in_threefold_repetition();
  }

  function isInsufficientMaterial() {
    return getGame().insufficient_material();
  }

  function isValidMove(from, to) {
    if (!from || !to) {
      return false;
    }

    const legalMoves = getLegalMoves(from);

    return legalMoves.some(function (item) {
      return item.to === to;
    });
  }

  function getGameStatus() {

    const game = getGame();

    if (game.in_checkmate()) {
      return {
        over: true,
        type: "checkmate",
        winner: game.turn() === "w" ? "black" : "white",
        message: "Checkmate"
      };
    }

    if (game.in_stalemate()) {
      return {
        over: true,
        type: "stalemate",
        winner: null,
        message: "Draw by stalemate"
      };
    }

    if (game.in_threefold_repetition()) {
      return {
        over: true,
        type: "repetition",
        winner: null,
        message: "Draw by repetition"
      };
    }

    if (game.insufficient_material()) {
      return {
        over: true,
        type: "insufficient-material",
        winner: null,
        message: "Draw by insufficient material"
      };
    }

    if (game.in_draw()) {
      return {
        over: true,
        type: "draw",
        winner: null,
        message: "Draw"
      };
    }

    if (game.in_check()) {
      return {
        over: false,
        type: "check",
        winner: null,
        message: "Check"
      };
    }

    return {
      over: false,
      type: "playing",
      winner: null,
      message: "Game in progress"
    };
  }

  function getCapturedPieces(history) {

    const captured = {
      white: [],
      black: []
    };

    const movesList = Array.isArray(history)
      ? history
      : getHistory({ verbose: true });

    movesList.forEach(function (item) {

      if (!item.captured) {
        return;
      }

      const capturedColor = item.color === "w"
        ? "black"
        : "white";

      captured[capturedColor].push(item.captured);

    });

    return captured;
  }

  function getMaterialBalance() {

    const values = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0
    };

    let white = 0;
    let black = 0;

    getBoard().forEach(function (row) {

      row.forEach(function (piece) {

        if (!piece) {
          return;
        }

        if (piece.color === "w") {
          white += values[piece.type];
        } else {
          black += values[piece.type];
        }

      });

    });

    return {
      white: white,
      black: black,
      difference: white - black
    };
  }

  function getSnapshot() {
    return {
      fen: getFEN(),
      pgn: getPGN(),
      turn: turn(),
      history: getHistory({ verbose: true }),
      status: getGameStatus()
    };
  }

  createGame();

  return Object.freeze({

    createGame,
    getGame,
    reset,
    load,
    move,
    undo,
    moves,
    getLegalMoves,
    getBoard,
    getHistory,
    getFEN,
    getPGN,
    turn,
    getPiece,
    isGameOver,
    isCheck,
    isCheckmate,
    isDraw,
    isStalemate,
    isThreefoldRepetition,
    isInsufficientMaterial,
    isValidMove,
    getGameStatus,
    getCapturedPieces,
    getMaterialBalance,
    getSnapshot

  });

})();

/* =========================================
   APPARA CHESS — CHESS ENGINE
   PART 08 END
========================================= */
