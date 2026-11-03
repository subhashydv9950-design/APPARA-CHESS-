
/* =========================================================
   APPARA CHESS — BOARD RENDERER
   FILE: js/board.js
   PART 08
========================================================= */

"use strict";

class ApparaChessBoard {

    constructor() {
        this.element = document.getElementById("chess-board");
        this.coordinatesElement = document.getElementById("board-coordinates");

        this.orientation = "white";
        this.selectedSquare = null;
        this.legalMoves = [];
        this.lastMove = null;
        this.onSquareClick = null;
        this.theme = "classic";
        this.enabled = true;

        this.initialize();
    }

    /* INITIALIZE BOARD */
    initialize() {
        if (!this.element) {
            console.error("APPARA CHESS: Board element not found.");
            return false;
        }

        this.element.classList.add("chess-board");
        this.element.setAttribute("role", "grid");
        this.element.setAttribute("aria-label", "Chess board");

        this.element.addEventListener("click", (event) => {
            const square = event.target.closest("[data-square]");

            if (!square || !this.enabled) return;

            this.handleSquareClick(square.dataset.square);
        });

        this.applyTheme(this.theme);
        this.render();

        return true;
    }

    /* CONVERT BOARD POSITION TO SQUARE NAME */
    getSquareName(row, column) {
        const file = String.fromCharCode(97 + column);
        const rank = 8 - row;

        return file + rank;
    }

    /* GET DISPLAY ORDER */
    getDisplaySquares() {
        const squares = [];

        for (let row = 0; row < 8; row++) {
            for (let column = 0; column < 8; column++) {

                let actualRow = row;
                let actualColumn = column;

                if (this.orientation === "black") {
                    actualRow = 7 - row;
                    actualColumn = 7 - column;
                }

                squares.push({
                    row: actualRow,
                    column: actualColumn,
                    name: this.getSquareName(
                        actualRow,
                        actualColumn
                    )
                });
            }
        }

        return squares;
    }

    /* RENDER BOARD */
    render() {
        if (!this.element || !window.apparaChess.isReady()) {
            return;
        }

        const board = window.apparaChess.getBoard();
        const squares = this.getDisplaySquares();

        let html = "";

        squares.forEach(position => {
            const piece = board[position.row][position.column];

            const isLight =
                (position.row + position.column) % 2 === 0;

            const isSelected =
                this.selectedSquare === position.name;

            const isLastMove =
                this.lastMove &&
                (
                    this.lastMove.from === position.name ||
                    this.lastMove.to === position.name
                );

            const isLegalMove =
                this.legalMoves.some(
                    move => move.to === position.name
                );

            const isCapture =
                isLegalMove && (
                    Boolean(piece) ||
                    this.legalMoves.some(move =>
                        move.to === position.name &&
                        move.flags.includes("e")
                    )
                );

            const isKingInCheck =
                piece &&
                piece.type === "k" &&
                piece.color ===
                    (window.apparaChess.isCheck()
                        ? window.apparaChess.game.turn()
                        : "");

            const colorClass = isLight ? "light" : "dark";

            let pieceHTML = "";

            if (piece) {
                const colorName =
                    piece.color === "w" ? "white" : "black";

                const pieceName = {
                    k: "king",
                    q: "queen",
                    r: "rook",
                    b: "bishop",
                    n: "knight",
                    p: "pawn"
                }[piece.type];

                const symbol = window.APPARA_UTILS.getPieceSymbol(
                    colorName,
                    pieceName
                );

                pieceHTML = `
                    <span
                        class="chess-piece ${colorName}"
                        data-piece="${piece.type}"
                        aria-label="${colorName} ${pieceName}"
                    >${symbol}</span>
                `;
            }

            html += `
                <div
                    class="chess-square ${colorClass}
                        ${isSelected ? "selected" : ""}
                        ${isLastMove ? "last-move" : ""}
                        ${isKingInCheck ? "in-check" : ""}
                        ${isCapture ? "legal-capture" : ""}
                    "
                    data-square="${position.name}"
                    role="gridcell"
                    tabindex="0"
                    aria-label="${position.name}"
                >
                    ${pieceHTML}
                    ${
                        isLegalMove && !isCapture
                            ? '<span class="legal-move-dot"></span>'
                            : ""
                    }
                    ${
                        isCapture
                            ? '<span class="legal-capture-ring"></span>'
                            : ""
                    }
                </div>
            `;
        });

        this.element.innerHTML = html;

        this.renderCoordinates();
    }

    /* RENDER BOARD COORDINATES */
    renderCoordinates() {
        if (!this.coordinatesElement) return;

        const files = this.orientation === "white"
            ? ["a", "b", "c", "d", "e", "f", "g", "h"]
            : ["h", "g", "f", "e", "d", "c", "b", "a"];

        const ranks = this.orientation === "white"
            ? [8, 7, 6, 5, 4, 3, 2, 1]
            : [1, 2, 3, 4, 5, 6, 7, 8];

        this.coordinatesElement.innerHTML = `
            <div class="board-ranks">
                ${ranks.map(rank =>
                    `<span>${rank}</span>`
                ).join("")}
            </div>

            <div class="board-files">
                ${files.map(file =>
                    `<span>${file}</span>`
                ).join("")}
            </div>
        `;
    }

    /* HANDLE SQUARE CLICK */
    handleSquareClick(square) {
        if (!window.apparaChess.isReady()) return;

        if (typeof this.onSquareClick === "function") {
            this.onSquareClick(square);
            return;
        }

        const piece = window.apparaChess.getPiece(square);
        const currentTurn = window.apparaChess.game.turn();

        if (!this.selectedSquare) {
            if (piece && piece.color === currentTurn) {
                this.selectSquare(square);
            }

            return;
        }

        if (this.selectedSquare === square) {
            this.clearSelection();
            return;
        }

        if (piece && piece.color === currentTurn) {
            this.selectSquare(square);
            return;
        }

        const result = window.apparaChess.makeMove(
            this.selectedSquare,
            square
        );

        if (result.success) {
            this.lastMove = result.move;
            this.clearSelection();
            this.render();
        } else {
            this.clearSelection();
        }
    }

    /* SELECT SQUARE */
    selectSquare(square) {
        const piece = window.apparaChess.getPiece(square);

        if (!piece) return;

        this.selectedSquare = square;
        this.legalMoves =
            window.apparaChess.getMovesFrom(square);

        this.render();
    }

    /* CLEAR SELECTION */
    clearSelection() {
        this.selectedSquare = null;
        this.legalMoves = [];
        this.render();
    }

    /* SHOW LAST MOVE */
    setLastMove(move) {
        this.lastMove = move || null;
        this.render();
    }

    /* FLIP BOARD */
    flip() {
        this.orientation =
            this.orientation === "white" ? "black" : "white";

        this.clearSelection();
        this.render();

        return this.orientation;
    }

    /* SET BOARD ORIENTATION */
    setOrientation(color) {
        if (color !== "white" && color !== "black") {
            return false;
        }

        this.orientation = color;
        this.clearSelection();
        this.render();

        return true;
    }

    /* CHANGE BOARD THEME */
    applyTheme(themeName) {
        const theme = window.APPARA_UTILS.getTheme(themeName);

        this.theme = themeName;

        if (!this.element) return;

        this.element.style.setProperty(
            "--square-light",
            theme.light
        );

        this.element.style.setProperty(
            "--square-dark",
            theme.dark
        );

        this.element.dataset.theme = themeName;
    }

    /* ENABLE OR DISABLE BOARD */
    setEnabled(enabled) {
        this.enabled = Boolean(enabled);

        this.element?.classList.toggle(
            "board-disabled",
            !this.enabled
        );
    }

    /* REFRESH BOARD */
    refresh() {
        this.render();
    }

    /* DESTROY EVENT HANDLER */
    destroy() {
        this.element = null;
        this.coordinatesElement = null;
        this.selectedSquare = null;
        this.legalMoves = [];
    }

}

/* CREATE GLOBAL BOARD */
window.apparaBoard = new ApparaChessBoard();

/* PART 08 END */
