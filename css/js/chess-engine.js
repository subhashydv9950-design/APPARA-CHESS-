
/* =========================================================
   APPARA CHESS — CHESS ENGINE
   FILE: js/chess-engine.js
   PART 07
========================================================= */

"use strict";

class ApparaChessEngine {

    constructor() {
        this.game = null;
        this.onMove = null;
        this.onGameOver = null;
        this.initialize();
    }

    /* INITIALIZE CHESS ENGINE */
    initialize() {
        if (typeof window.Chess !== "function") {
            console.error(
                "APPARA CHESS: chess.js library not loaded."
            );
            return false;
        }

        this.game = new window.Chess();
        return true;
    }

    /* CHECK ENGINE */
    isReady() {
        return Boolean(this.game);
    }

    /* RESET GAME */
    reset() {
        if (!this.isReady()) return false;

        this.game.reset();
        return true;
    }

    /* LOAD POSITION */
    loadPosition(fen) {
        if (!this.isReady() || typeof fen !== "string") {
            return false;
        }

        try {
            return this.game.load(fen);
        } catch (error) {
            console.error("Invalid chess position:", error);
            return false;
        }
    }

    /* GET CURRENT POSITION */
    getPosition() {
        if (!this.isReady()) return null;
        return this.game.fen();
    }

    /* GET BOARD */
    getBoard() {
        if (!this.isReady()) return [];
        return this.game.board();
    }

    /* GET CURRENT TURN */
    getTurn() {
        if (!this.isReady()) return null;

        return this.game.turn() === "w"
            ? "white"
            : "black";
    }

    /* GET LEGAL MOVES */
    getLegalMoves(square = null) {
        if (!this.isReady()) return [];

        try {
            const options = {
                verbose: true
            };

            if (square) {
                options.square = square;
            }

            return this.game.moves(options);

        } catch (error) {
            console.error("Legal move error:", error);
            return [];
        }
    }

    /* GET MOVES FOR A PARTICULAR SQUARE */
    getMovesFrom(square) {
        return this.getLegalMoves(square);
    }

    /* CHECK WHETHER A MOVE IS LEGAL */
    isLegalMove(from, to, promotion = "q") {
        if (!this.isReady()) return false;

        const moves = this.getLegalMoves(from);

        return moves.some(move => {
            if (move.to !== to) return false;

            if (move.flags.includes("p")) {
                return move.promotion === promotion;
            }

            return true;
        });
    }

    /* MAKE MOVE */
    makeMove(from, to, promotion = "q") {
        if (!this.isReady()) {
            return {
                success: false,
                error: "Chess engine is not ready."
            };
        }

        try {
            const move = this.game.move({
                from: from,
                to: to,
                promotion: promotion
            });

            if (!move) {
                return {
                    success: false,
                    error: "Illegal move."
                };
            }

            const result = {
                success: true,
                move: move,
                fen: this.game.fen(),
                turn: this.getTurn(),
                status: this.getStatus()
            };

            if (typeof this.onMove === "function") {
                this.onMove(result);
            }

            if (result.status.gameOver &&
                typeof this.onGameOver === "function") {
                this.onGameOver(result.status);
            }

            return result;

        } catch (error) {
            console.error("Move error:", error);

            return {
                success: false,
                error: error.message
            };
        }
    }

    /* UNDO LAST MOVE */
    undoMove() {
        if (!this.isReady()) return null;

        try {
            return this.game.undo();
        } catch (error) {
            console.error("Undo error:", error);
            return null;
        }
    }

    /* GET MOVE HISTORY */
    getHistory() {
        if (!this.isReady()) return [];
        return this.game.history();
    }

    /* GET DETAILED MOVE HISTORY */
    getDetailedHistory() {
        if (!this.isReady()) return [];
        return this.game.history({
            verbose: true
        });
    }

    /* GET PGN */
    getPGN() {
        if (!this.isReady()) return "";
        return this.game.pgn();
    }

    /* LOAD PGN */
    loadPGN(pgn) {
        if (!this.isReady() || typeof pgn !== "string") {
            return false;
        }

        try {
            return this.game.load_pgn(pgn);
        } catch (error) {
            console.error("PGN loading error:", error);
            return false;
        }
    }

    /* CHECK GAME STATUS */
    getStatus() {
        if (!this.isReady()) {
            return {
                gameOver: true,
                reason: "engine_unavailable"
            };
        }

        const checkmate = this.game.in_checkmate();
        const stalemate = this.game.in_stalemate();
        const draw = this.game.in_draw();
        const check = this.game.in_check();

        let reason = null;

        if (checkmate) {
            reason = "checkmate";
        } else if (stalemate) {
            reason = "stalemate";
        } else if (this.game.in_threefold_repetition()) {
            reason = "threefold_repetition";
        } else if (this.game.insufficient_material()) {
            reason = "insufficient_material";
        } else if (draw) {
            reason = "draw";
        }

        return {
            gameOver: this.game.game_over(),
            check: check,
            checkmate: checkmate,
            stalemate: stalemate,
            draw: draw,
            reason: reason,
            turn: this.getTurn(),
            winner: checkmate
                ? (this.getTurn() === "white" ? "black" : "white")
                : null
        };
    }

    /* CHECK SPECIFIC CONDITIONS */
    isCheck() {
        return this.isReady() && this.game.in_check();
    }

    isCheckmate() {
        return this.isReady() && this.game.in_checkmate();
    }

    isDraw() {
        return this.isReady() && this.game.in_draw();
    }

    isGameOver() {
        return this.isReady() && this.game.game_over();
    }

    /* GET PIECE AT SQUARE */
    getPiece(square) {
        if (!this.isReady()) return null;
        return this.game.get(square);
    }

    /* GET CAPTURED PIECE INFORMATION */
    isCapture(from, to) {
        if (!this.isReady()) return false;

        const moves = this.getLegalMoves(from);

        return moves.some(move =>
            move.to === to &&
            (move.flags.includes("c") ||
             move.flags.includes("e"))
        );
    }

    /* GET ACTIVE PLAYER COLOR */
    getActiveColor() {
        return this.getTurn();
    }

    /* EXPORT GAME DATA */
    exportGame() {
        if (!this.isReady()) return null;

        return {
            fen: this.game.fen(),
            pgn: this.game.pgn(),
            history: this.game.history(),
            status: this.getStatus()
        };
    }

    /* IMPORT GAME DATA */
    importGame(data) {
        if (!this.isReady() || !data) return false;

        if (data.pgn) {
            return this.loadPGN(data.pgn);
        }

        if (data.fen) {
            return this.loadPosition(data.fen);
        }

        return false;
    }

}

/* GLOBAL ENGINE INSTANCE */
window.apparaChess = new ApparaChessEngine();

/* PART 07 END */
