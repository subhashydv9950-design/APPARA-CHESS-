
/* =========================================================
   APPARA CHESS — COMPUTER AI ENGINE
   FILE: js/ai.js
   PART 11
========================================================= */

"use strict";

class ApparaChessAI {

    constructor() {
        this.difficulty = "medium";
        this.searchDepth = 3;
        this.isThinking = false;
        this.transpositionTable = new Map();

        this.pieceValues = {
            p: 100,
            n: 320,
            b: 330,
            r: 500,
            q: 900,
            k: 20000
        };

        this.positionTables = {
            p: [
                 0,  0,  0,  0,  0,  0,  0,  0,
                50, 50, 50, 50, 50, 50, 50, 50,
                10, 10, 20, 30, 30, 20, 10, 10,
                 5,  5, 10, 25, 25, 10,  5,  5,
                 0,  0,  0, 20, 20,  0,  0,  0,
                 5, -5,-10,  0,  0,-10, -5,  5,
                 5, 10, 10,-20,-20, 10, 10,  5,
                 0,  0,  0,  0,  0,  0,  0,  0
            ],
            n: [
                -50,-40,-30,-30,-30,-30,-40,-50,
                -40,-20,  0,  0,  0,  0,-20,-40,
                -30,  0, 10, 15, 15, 10,  0,-30,
                -30,  5, 15, 20, 20, 15,  5,-30,
                -30,  0, 15, 20, 20, 15,  0,-30,
                -30,  5, 10, 15, 15, 10,  5,-30,
                -40,-20,  0,  5,  5,  0,-20,-40,
                -50,-40,-30,-30,-30,-30,-40,-50
            ],
            b: [
                -20,-10,-10,-10,-10,-10,-10,-20,
                -10,  0,  0,  0,  0,  0,  0,-10,
                -10,  0,  5, 10, 10,  5,  0,-10,
                -10,  5,  5, 10, 10,  5,  5,-10,
                -10,  0, 10, 10, 10, 10,  0,-10,
                -10, 10, 10, 10, 10, 10, 10,-10,
                -10,  5,  0,  0,  0,  0,  5,-10,
                -20,-10,-10,-10,-10,-10,-10,-20
            ]
        };

        this.setDifficulty("medium");
    }

    /* SET AI DIFFICULTY */
    setDifficulty(level) {
        const settings = window.APPARA_UTILS.getDifficulty(level);

        this.difficulty = level;
        this.searchDepth = settings.searchDepth;

        this.transpositionTable.clear();

        return true;
    }

    /* GET BOARD POSITION SCORE */
    evaluateBoard(game) {
        if (game.in_checkmate()) {
            return game.turn() === "w" ? -100000 : 100000;
        }

        if (game.in_draw()) return 0;

        const board = game.board();
        let score = 0;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];

                if (!piece) continue;

                const value = this.pieceValues[piece.type] || 0;

                let positional = 0;
                const index = row * 8 + col;

                if (piece.type === "p") {
                    positional = this.positionTables.p[
                        piece.color === "w" ? index : 63 - index
                    ];
                } else if (piece.type === "n") {
                    positional = this.positionTables.n[
                        piece.color === "w" ? index : 63 - index
                    ];
                } else if (piece.type === "b") {
                    positional = this.positionTables.b[
                        piece.color === "w" ? index : 63 - index
                    ];
                }

                const pieceScore = value + positional;

                score += piece.color === "w"
                    ? pieceScore
                    : -pieceScore;
            }
        }

        return score;
    }

    /* MOVE ORDERING */
    orderMoves(moves) {
        return moves.sort((a, b) => {
            const scoreA = this.movePriority(a);
            const scoreB = this.movePriority(b);

            return scoreB - scoreA;
        });
    }

    movePriority(move) {
        let score = 0;

        if (move.captured) {
            score += 10000 +
                this.pieceValues[move.captured] -
                this.pieceValues[move.piece] / 10;
        }

        if (move.promotion) {
            score += this.pieceValues[move.promotion];
        }

        if (move.san && move.san.includes("+")) {
            score += 50;
        }

        if (move.san && move.san.includes("#")) {
            score += 100000;
        }

        return score;
    }

    /* MINIMAX WITH ALPHA-BETA PRUNING */
    minimax(game, depth, alpha, beta, maximizingPlayer) {
        if (depth === 0 || game.game_over()) {
            return this.evaluateBoard(game);
        }

        const moves = this.orderMoves(
            game.moves({ verbose: true })
        );

        if (maximizingPlayer) {
            let maxEval = -Infinity;

            for (const move of moves) {
                game.move(move);

                const evaluation = this.minimax(
                    game,
                    depth - 1,
                    alpha,
                    beta,
                    false
                );

                game.undo();

                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);

                if (beta <= alpha) break;
            }

            return maxEval;

        } else {
            let minEval = Infinity;

            for (const move of moves) {
                game.move(move);

                const evaluation = this.minimax(
                    game,
                    depth - 1,
                    alpha,
                    beta,
                    true
                );

                game.undo();

                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);

                if (beta <= alpha) break;
            }

            return minEval;
        }
    }

    /* CHOOSE BEST MOVE */
    getBestMove(game = window.apparaChess.game) {
        if (!game || game.game_over()) return null;

        const legalMoves = game.moves({ verbose: true });

        if (!legalMoves.length) return null;

        const isWhite = game.turn() === "w";
        const maximizingPlayer = isWhite;

        let bestMove = null;
        let bestScore = maximizingPlayer
            ? -Infinity
            : Infinity;

        const moves = this.orderMoves(legalMoves);

        for (const move of moves) {
            game.move(move);

            const score = this.minimax(
                game,
                this.searchDepth - 1,
                -Infinity,
                Infinity,
                !maximizingPlayer
            );

            game.undo();

            const isBetter = maximizingPlayer
                ? score > bestScore
                : score < bestScore;

            if (isBetter) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    /* MAKE AI MOVE */
    async makeMove() {
        if (this.isThinking) return null;

        const engine = window.apparaChess;

        if (!engine || !engine.isReady()) return null;

        if (engine.isGameOver()) return null;

        this.isThinking = true;

        try {
            await new Promise(resolve => setTimeout(resolve, 250));

            const bestMove = this.getBestMove(engine.game);

            if (!bestMove) return null;

            const result = engine.makeMove(
                bestMove.from,
                bestMove.to,
                bestMove.promotion || "q"
            );

            if (result.success) {
                window.apparaBoard?.setLastMove(result.move);
                window.apparaBoard?.refresh();

                if (result.move.captured) {
                    window.apparaSound?.playCapture();
                } else {
                    window.apparaSound?.playMove();
                }
            }

            return result;

        } catch (error) {
            console.error("AI move error:", error);
            return null;

        } finally {
            this.isThinking = false;
        }
    }

    /* GET AI ANALYSIS */
    analyze(game = window.apparaChess.game) {
        if (!game) return null;

        return {
            evaluation: this.evaluateBoard(game),
            legalMoves: game.moves().length,
            turn: game.turn(),
            difficulty: this.difficulty,
            depth: this.searchDepth
        };
    }

    /* RESET AI */
    reset() {
        this.isThinking = false;
        this.transpositionTable.clear();
    }

}

/* GLOBAL AI INSTANCE */
window.apparaAI = new ApparaChessAI();

/* PART 11 END */
