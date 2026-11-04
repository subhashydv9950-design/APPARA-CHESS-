/* =========================================================
   APPARA CHESS — COMPUTER AI ENGINE
   FILE: js/ai.js
   ========================================================= */

window.APPARA_AI = (function () {
    "use strict";

    let difficulty = "medium";
    let stopped = false;

    const PIECE_VALUES = {
        p: 100,
        n: 320,
        b: 335,
        r: 500,
        q: 900,
        k: 20000
    };

    const LEVELS = {
        easy: {
            depth: 1,
            randomFactor: 35
        },
        medium: {
            depth: 2,
            randomFactor: 12
        },
        hard: {
            depth: 3,
            randomFactor: 3
        },
        expert: {
            depth: 3,
            randomFactor: 0
        }
    };

    /* ENGINE CONNECTION */

    function getGame() {
        if (
            !window.APPARA_ENGINE ||
            typeof window.APPARA_ENGINE.getGame !== "function"
        ) {
            return null;
        }

        return window.APPARA_ENGINE.getGame();
    }

    /* INITIALIZATION */

    function init() {
        stopped = false;

        if (
            window.APPARA_CONFIG &&
            window.APPARA_CONFIG.defaults &&
            window.APPARA_CONFIG.defaults.difficulty
        ) {
            setDifficulty(
                window.APPARA_CONFIG.defaults.difficulty
            );
        }

        return true;
    }

    /* DIFFICULTY */

    function setDifficulty(level) {
        if (Object.prototype.hasOwnProperty.call(LEVELS, level)) {
            difficulty = level;
        } else {
            difficulty = "medium";
        }

        return difficulty;
    }

    function getDifficulty() {
        return difficulty;
    }

    function getSettings() {
        return {
            difficulty: difficulty,
            depth: LEVELS[difficulty].depth,
            randomFactor: LEVELS[difficulty].randomFactor
        };
    }

    /* POSITION EVALUATION */

    function getPositionBonus(piece, row, col) {
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
    }

    function evaluateBoard(game) {
        if (!game) return 0;

        if (game.in_checkmate()) {
            return game.turn() === "w"
                ? -100000
                : 100000;
        }

        if (
            game.in_draw() ||
            game.in_stalemate() ||
            game.insufficient_material()
        ) {
            return 0;
        }

        const board = game.board();
        let score = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];

                if (!piece) continue;

                const value =
                    PIECE_VALUES[piece.type] || 0;

                const bonus = getPositionBonus(
                    piece,
                    row,
                    col
                );

                const total = value + bonus;

                score += piece.color === "w"
                    ? total
                    : -total;
            }
        }

        return score;
    }

    /* MOVE ORDERING */

    function orderMoves(moves) {
        return moves.slice().sort(function (a, b) {
            return getMoveOrderScore(b) -
                getMoveOrderScore(a);
        });
    }

    function getMoveOrderScore(move) {
        let score = 0;

        if (move.captured) {
            score +=
                (PIECE_VALUES[move.captured] || 0) * 10 -
                (PIECE_VALUES[move.piece] || 0);
        }

        if (move.promotion) {
            score +=
                PIECE_VALUES[move.promotion] || 0;
        }

        if (
            move.flags &&
            move.flags.includes("k")
        ) {
            score += 30;
        }

        if (
            move.flags &&
            move.flags.includes("q")
        ) {
            score += 30;
        }

        return score;
    }

    /* MINIMAX SEARCH */

    function minimax(
        game,
        depth,
        alpha,
        beta,
        colorMultiplier
    ) {
        if (stopped) return 0;

        if (depth <= 0 || game.game_over()) {
            return colorMultiplier *
                evaluateBoard(game);
        }

        const moves = orderMoves(
            game.moves({ verbose: true })
        );

        if (!moves.length) {
            return colorMultiplier *
                evaluateBoard(game);
        }

        let bestScore = -Infinity;

        for (let i = 0; i < moves.length; i++) {
            if (stopped) break;

            const move = moves[i];

            const played = game.move({
                from: move.from,
                to: move.to,
                promotion: move.promotion || "q"
            });

            if (!played) continue;

            const score = -minimax(
                game,
                depth - 1,
                -beta,
                -alpha,
                -colorMultiplier
            );

            game.undo();

            if (score > bestScore) {
                bestScore = score;
            }

            alpha = Math.max(alpha, score);

            if (alpha >= beta) {
                break;
            }
        }

        return bestScore === -Infinity
            ? 0
            : bestScore;
    }

    /* BEST MOVE SEARCH */

    function getBestMove(color) {
        const game = getGame();

        if (!game || game.game_over()) {
            return null;
        }

        const currentColor = color || game.turn();

        if (game.turn() !== currentColor) {
            return null;
        }

        stopped = false;

        const settings = LEVELS[difficulty];

        const moves = orderMoves(
            game.moves({ verbose: true })
        );

        if (!moves.length) return null;

        let bestMove = null;
        let bestScore = -Infinity;

        const candidates = [];

        for (let i = 0; i < moves.length; i++) {
            if (stopped) break;

            const move = moves[i];

            const played = game.move({
                from: move.from,
                to: move.to,
                promotion: move.promotion || "q"
            });

            if (!played) continue;

            const score = -minimax(
                game,
                settings.depth - 1,
                -Infinity,
                Infinity,
                currentColor === "w" ? -1 : 1
            );

            game.undo();

            const adjustedScore =
                score +
                Math.random() * settings.randomFactor;

            candidates.push({
                move: move,
                score: adjustedScore
            });

            if (adjustedScore > bestScore) {
                bestScore = adjustedScore;
                bestMove = move;
            }
        }

        if (!bestMove && candidates.length) {
            bestMove = candidates[0].move;
        }

        if (!bestMove) return null;

        return {
            from: bestMove.from,
            to: bestMove.to,
            promotion: bestMove.promotion || "q"
        };
    }

    /* PLAY AI MOVE */

    function playMove(move) {
        const game = getGame();

        if (!game || !move || game.game_over()) {
            return null;
        }

        const result = game.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion || "q"
        });

        if (!result) return null;

        if (window.APPARA_BOARD) {
            window.APPARA_BOARD.refresh();
        }

        return result;
    }

    function playTurn(color) {
        const game = getGame();

        if (!game || game.game_over()) {
            return null;
        }

        const move = getBestMove(color);

        if (!move || stopped) {
            return null;
        }

        return playMove(move);
    }

    /* CONTROL */

    function stop() {
        stopped = true;
    }

    function reset() {
        stopped = false;
    }

    /* PUBLIC API */

    return {
        init: init,

        setDifficulty: setDifficulty,
        getDifficulty: getDifficulty,
        getSettings: getSettings,

        getGame: getGame,

        getPositionBonus: getPositionBonus,
        evaluateBoard: evaluateBoard,

        orderMoves: orderMoves,
        getMoveOrderScore: getMoveOrderScore,

        minimax: minimax,
        getBestMove: getBestMove,

        playMove: playMove,
        playTurn: playTurn,

        stop: stop,
        reset: reset
    };

})();

/* =========================================================
   PART 1/1 END — js/ai.js
   ========================================================= */
