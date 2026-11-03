/* =========================================================
   APPARA CHESS — COMPUTER AI ENGINE
   PART 12 — js/ai.js
   ========================================================= */

(function () {
  "use strict";

  const AI = {
    difficulty: "medium",
    isThinking: false,
    searchToken: 0,

    pieceValues: {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
      k: 20000
    },

    difficultySettings: {
      easy: {
        depth: 1,
        randomFactor: 0.35
      },
      medium: {
        depth: 2,
        randomFactor: 0.08
      },
      hard: {
        depth: 3,
        randomFactor: 0
      },
      expert: {
        depth: 3,
        randomFactor: 0
      }
    },

    /* ---------- INITIALIZATION ---------- */

    init(options = {}) {
      this.setDifficulty(
        options.difficulty || "medium"
      );

      return true;
    },

    setDifficulty(level) {
      const allowed = [
        "easy",
        "medium",
        "hard",
        "expert"
      ];

      this.difficulty = allowed.includes(level)
        ? level
        : "medium";

      return this.difficulty;
    },

    getDifficulty() {
      return this.difficulty;
    },

    /* ---------- ENGINE ACCESS ---------- */

    getGame() {
      if (!window.APPARA_ENGINE) return null;

      return window.APPARA_ENGINE.getGame();
    },

    getSettings() {
      return (
        this.difficultySettings[this.difficulty] ||
        this.difficultySettings.medium
      );
    },

    /* ---------- PIECE SQUARE VALUE ---------- */

    getPositionBonus(piece, row, col) {
      const centerDistance =
        Math.abs(3.5 - row) +
        Math.abs(3.5 - col);

      const centerBonus = Math.max(
        0,
        7 - centerDistance
      );

      switch (piece.type) {
        case "p":
          return piece.color === "w"
            ? (6 - row) * 5
            : (row - 1) * 5;

        case "n":
          return centerBonus * 7;

        case "b":
          return centerBonus * 4;

        case "r":
          return centerBonus * 2;

        case "q":
          return centerBonus * 2;

        case "k":
          return -centerBonus * 3;

        default:
          return 0;
      }
    },

    /* ---------- BOARD EVALUATION ---------- */

    evaluateBoard(game) {
      const board = game.board();

      let score = 0;

      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = board[row][col];

          if (!piece) continue;

          const value = this.pieceValues[piece.type] || 0;

          const positionBonus = this.getPositionBonus(
            piece,
            row,
            col
          );

          const total = value + positionBonus;

          score += piece.color === "w"
            ? total
            : -total;
        }
      }

      return score;
    },

    /* ---------- MOVE ORDERING ---------- */

    orderMoves(moves) {
      return [...moves].sort((a, b) => {
        const scoreA = this.getMoveOrderScore(a);
        const scoreB = this.getMoveOrderScore(b);

        return scoreB - scoreA;
      });
    },

    getMoveOrderScore(move) {
      let score = 0;

      if (move.captured) {
        const capturedValue =
          this.pieceValues[move.captured] || 0;

        const movingValue =
          this.pieceValues[move.piece] || 0;

        score += 1000 + capturedValue - movingValue * 0.1;
      }

      if (move.promotion) {
        score += 800 + (
          this.pieceValues[move.promotion] || 0
        );
      }

      if (move.flags && move.flags.includes("k")) {
        score += 30;
      }

      if (move.flags && move.flags.includes("q")) {
        score += 30;
      }

      return score;
    },

    /* ---------- MINIMAX SEARCH ---------- */

    minimax(game, depth, alpha, beta, maximizingPlayer) {
      if (game.in_checkmate()) {
        return maximizingPlayer ? -100000 : 100000;
      }

      if (
        game.in_draw() ||
        game.in_stalemate() ||
        game.in_threefold_repetition() ||
        game.insufficient_material()
      ) {
        return 0;
      }

      if (depth <= 0 || game.game_over()) {
        const evaluation = this.evaluateBoard(game);

        return maximizingPlayer
          ? evaluation
          : -evaluation;
      }

      const moves = this.orderMoves(
        game.moves({ verbose: true })
      );

      if (moves.length === 0) {
        return this.evaluateBoard(game);
      }

      if (maximizingPlayer) {
        let bestScore = -Infinity;

        for (const move of moves) {
          game.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion || "q"
          });

          const score = this.minimax(
            game,
            depth - 1,
            alpha,
            beta,
            false
          );

          game.undo();

          bestScore = Math.max(bestScore, score);
          alpha = Math.max(alpha, bestScore);

          if (beta <= alpha) break;
        }

        return bestScore;
      }

      let bestScore = Infinity;

      for (const move of moves) {
        game.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || "q"
        });

        const score = this.minimax(
          game,
          depth - 1,
          alpha,
          beta,
          true
        );

        game.undo();

        bestScore = Math.min(bestScore, score);
        beta = Math.min(beta, bestScore);

        if (beta <= alpha) break;
      }

      return bestScore;
    },

    /* ---------- BEST MOVE ---------- */

    getBestMove(options = {}) {
      const game = this.getGame();

      if (!game || game.game_over()) {
        return null;
      }

      const color = options.color || game.turn();
      const currentTurn = game.turn();

      if (color !== currentTurn) {
        return null;
      }

      const settings = this.getSettings();

      const depth = Number.isInteger(options.depth)
        ? Math.max(1, Math.min(4, options.depth))
        : settings.depth;

      const moves = this.orderMoves(
        game.moves({ verbose: true })
      );

      if (!moves.length) return null;

      const evaluatedMoves = [];

      for (const move of moves) {
        game.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || "q"
        });

        const score = this.minimax(
          game,
          depth - 1,
          -Infinity,
          Infinity,
          color === "b"
        );

        game.undo();

        const adjustedScore = color === "w"
          ? score
          : -score;

        evaluatedMoves.push({
          move: {
            from: move.from,
            to: move.to,
            promotion: move.promotion || "q",
            san: move.san
          },
          score: adjustedScore
        });
      }

      evaluatedMoves.sort(
        (a, b) => b.score - a.score
      );

      const randomFactor = settings.randomFactor;

      if (
        randomFactor > 0 &&
        evaluatedMoves.length > 1 &&
        Math.random() < randomFactor
      ) {
        const candidates = evaluatedMoves.slice(
          0,
          Math.min(3, evaluatedMoves.length)
        );

        return candidates[
          Math.floor(Math.random() * candidates.length)
        ].move;
      }

      return evaluatedMoves[0].move;
    },

    /* ---------- PLAY BEST MOVE ---------- */

    playMove(options = {}) {
      const engine = window.APPARA_ENGINE;

      if (!engine || this.isThinking) {
        return false;
      }

      const move = this.getBestMove(options);

      if (!move) return false;

      const result = engine.move(move);

      if (!result) return false;

      if (window.APPARA_BOARD) {
        window.APPARA_BOARD.setLastMove(
          result.from,
          result.to
        );

        window.APPARA_BOARD.refresh();
      }

      return result;
    },

    /* ---------- ASYNC COMPUTER TURN ---------- */

    async playTurn(options = {}) {
      if (this.isThinking) return false;

      const engine = window.APPARA_ENGINE;

      if (!engine || engine.isGameOver()) {
        return false;
      }

      const expectedColor = options.color || engine.turn();

      if (engine.turn() !== expectedColor) {
        return false;
      }

      this.isThinking = true;

      const currentToken = ++this.searchToken;

      try {
        await new Promise((resolve) => {
          window.setTimeout(resolve, 120);
        });

        if (currentToken !== this.searchToken) {
          return false;
        }

        const move = this.getBestMove({
          color: expectedColor,
          depth: options.depth
        });

        if (!move || currentToken !== this.searchToken) {
          return false;
        }

        const result = engine.move(move);

        if (!result) return false;

        if (window.APPARA_BOARD) {
          window.APPARA_BOARD.setLastMove(
            result.from,
            result.to
          );

          window.APPARA_BOARD.refresh();
        }

        return result;
      } catch (error) {
        console.error("APPARA AI: Computer move failed.", error);
        return false;
      } finally {
        this.isThinking = false;
      }
    },

    /* ---------- CANCEL THINKING ---------- */

    stop() {
      this.searchToken++;
      this.isThinking = false;

      return true;
    },

    /* ---------- RESET ---------- */

    reset() {
      this.stop();
      return true;
    }
  };

  window.APPARA_AI = AI;

})();

/* =========================================================
   APPARA CHESS — COMPUTER AI ENGINE
   PART 12 END
   ========================================================= */
