/* =========================================================
   APPARA CHESS — BOARD CONTROLLER
   PART 09 — js/board.js
   ========================================================= */

(function () {
  "use strict";

  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

  const Board = {
    initialized: false,
    orientation: "white",
    selectedSquare: null,
    legalMoves: [],
    lastMove: null,
    moveHandler: null,
    promotionHandler: null,
    showCoordinates: true,
    showLegalMoves: true,
    draggable: true,
    theme: "classic",
    boardElement: null,
    boundClickHandler: null,
    boundDragStartHandler: null,
    boundDragOverHandler: null,
    boundDropHandler: null,

    /* ---------- INITIALIZATION ---------- */

    init(options = {}) {
      this.boardElement = document.getElementById("chess-board");

      if (!this.boardElement) {
        console.error("APPARA BOARD: #chess-board element not found.");
        return false;
      }

      if (!window.APPARA_ENGINE) {
        console.error("APPARA BOARD: Chess engine is not loaded.");
        return false;
      }

      if (this.initialized) {
        this.render();
        return true;
      }

      this.moveHandler = typeof options.onMove === "function"
        ? options.onMove
        : null;

      this.promotionHandler = typeof options.onPromotion === "function"
        ? options.onPromotion
        : null;

      this.showCoordinates = options.coordinates !== false;
      this.showLegalMoves = options.legalMoves !== false;
      this.draggable = options.draggable !== false;

      this.boundClickHandler = this.handleBoardClick.bind(this);
      this.boundDragStartHandler = this.handleDragStart.bind(this);
      this.boundDragOverHandler = this.handleDragOver.bind(this);
      this.boundDropHandler = this.handleDrop.bind(this);

      this.boardElement.addEventListener(
        "click",
        this.boundClickHandler
      );

      this.boardElement.addEventListener(
        "dragstart",
        this.boundDragStartHandler
      );

      this.boardElement.addEventListener(
        "dragover",
        this.boundDragOverHandler
      );

      this.boardElement.addEventListener(
        "drop",
        this.boundDropHandler
      );

      this.initialized = true;

      this.setTheme(this.theme);
      this.render();

      return true;
    },

    /* ---------- PIECE SYMBOLS ---------- */

    getPieceSymbol(piece) {
      if (!piece) return "";

      const config = window.APPARA_CONFIG || {};
      const pieces = config.pieces || {};

      const colorName = piece.color === "w" ? "white" : "black";
      const pieceType = String(piece.type || "").toLowerCase();

      const fallback = {
        white: {
          k: "♔",
          q: "♕",
          r: "♖",
          b: "♗",
          n: "♘",
          p: "♙"
        },
        black: {
          k: "♚",
          q: "♛",
          r: "♜",
          b: "♝",
          n: "♞",
          p: "♟"
        }
      };

      const configuredColor = pieces[colorName] || {};

      return (
        configuredColor[pieceType] ||
        configuredColor[pieceType.toUpperCase()] ||
        fallback[colorName][pieceType] ||
        ""
      );
    },

    /* ---------- SQUARE CREATION ---------- */

    createSquare(squareName, piece) {
      const square = document.createElement("div");

      const fileIndex = FILES.indexOf(squareName[0]);
      const rankIndex = RANKS.indexOf(squareName[1]);

      const isLight = (fileIndex + rankIndex) % 2 === 0;

      square.className = "square " + (
        isLight ? "light" : "dark"
      );

      square.dataset.square = squareName;
      square.setAttribute("role", "button");
      square.setAttribute("aria-label", squareName);
      square.setAttribute("tabindex", "0");

      if (piece) {
        const pieceElement = document.createElement("span");

        pieceElement.className =
          "chess-piece piece piece-" +
          (piece.color === "w" ? "white" : "black");

        pieceElement.textContent = this.getPieceSymbol(piece);
        pieceElement.dataset.piece = piece.type;
        pieceElement.dataset.color = piece.color;

        if (this.draggable) {
          pieceElement.draggable = true;
        }

        square.appendChild(pieceElement);
      }

      return square;
    },

    /* ---------- BOARD RENDER ---------- */

    render() {
      if (!this.boardElement) return false;

      const engine = window.APPARA_ENGINE;
      const boardData = engine.getBoard();

      if (!Array.isArray(boardData)) return false;

      this.boardElement.replaceChildren();

      const rankOrder = this.orientation === "white"
        ? [0, 1, 2, 3, 4, 5, 6, 7]
        : [7, 6, 5, 4, 3, 2, 1, 0];

      const fileOrder = this.orientation === "white"
        ? [0, 1, 2, 3, 4, 5, 6, 7]
        : [7, 6, 5, 4, 3, 2, 1, 0];

      rankOrder.forEach((rankIndex) => {
        fileOrder.forEach((fileIndex) => {
          const squareName =
            FILES[fileIndex] + RANKS[rankIndex];

          const piece = boardData[rankIndex][fileIndex];

          const square = this.createSquare(
            squareName,
            piece
          );

          this.boardElement.appendChild(square);
        });
      });

      this.updateCoordinates();
      this.updateHighlights();
      this.updateCheckHighlight();

      return true;
    },

    /* ---------- COORDINATES ---------- */

    updateCoordinates() {
      const top = document.getElementById(
        "file-coordinates-top"
      );

      const bottom = document.getElementById(
        "file-coordinates-bottom"
      );

      const left = document.getElementById(
        "rank-coordinates-left"
      );

      const right = document.getElementById(
        "rank-coordinates-right"
      );

      const files = this.orientation === "white"
        ? FILES
        : [...FILES].reverse();

      const ranks = this.orientation === "white"
        ? RANKS
        : [...RANKS].reverse();

      const fill = (element, values) => {
        if (!element) return;

        element.replaceChildren();

        values.forEach((value) => {
          const span = document.createElement("span");
          span.textContent = value;
          element.appendChild(span);
        });

        element.hidden = !this.showCoordinates;
      };

      fill(top, files);
      fill(bottom, files);
      fill(left, ranks);
      fill(right, ranks);
    },

    setCoordinates(enabled) {
      this.showCoordinates = Boolean(enabled);
      this.updateCoordinates();
    },

    /* ---------- SQUARE SELECTION ---------- */

    handleBoardClick(event) {
      const squareElement = event.target.closest(
        "[data-square]"
      );

      if (!squareElement || !this.boardElement.contains(squareElement)) {
        return;
      }

      this.selectSquare(squareElement.dataset.square);
    },

    selectSquare(squareName) {
      if (!this.isValidSquare(squareName)) return false;

      const engine = window.APPARA_ENGINE;
      const clickedPiece = engine.getPiece(squareName);

      if (this.selectedSquare) {
        const selected = this.selectedSquare;

        if (selected === squareName) {
          this.clearSelection();
          return true;
        }

        const matchingMove = this.legalMoves.find(
          (move) => move.to === squareName
        );

        if (matchingMove) {
          this.submitMove(selected, squareName, matchingMove);
          return true;
        }

        if (
          clickedPiece &&
          clickedPiece.color === engine.turn()
        ) {
          this.setSelection(squareName);
          return true;
        }

        this.clearSelection();
        return false;
      }

      if (
        clickedPiece &&
        clickedPiece.color === engine.turn()
      ) {
        this.setSelection(squareName);
        return true;
      }

      return false;
    },

    setSelection(squareName) {
      this.selectedSquare = squareName;

      const moves = window.APPARA_ENGINE.getLegalMoves(
        squareName
      );

      this.legalMoves = Array.isArray(moves) ? moves : [];

      this.updateHighlights();
    },

    clearSelection() {
      this.selectedSquare = null;
      this.legalMoves = [];

      this.updateHighlights();
    },

    getSelectedSquare() {
      return this.selectedSquare;
    },

    /* ---------- MOVE SUBMISSION ---------- */

    submitMove(from, to, matchingMove) {
      const piece = window.APPARA_ENGINE.getPiece(from);

      let promotion = "q";

      if (
        piece &&
        piece.type === "p" &&
        (to[1] === "8" || to[1] === "1")
      ) {
        if (this.promotionHandler) {
          const selectedPromotion = this.promotionHandler({
            from,
            to,
            color: piece.color
          });

          if (
            selectedPromotion &&
            ["q", "r", "b", "n"].includes(
              String(selectedPromotion).toLowerCase()
            )
          ) {
            promotion = String(selectedPromotion).toLowerCase();
          }
        }
      }

      const moveData = {
        from,
        to,
        promotion,
        san: matchingMove ? matchingMove.san : null
      };

      if (this.moveHandler) {
        const result = this.moveHandler(moveData);

        if (result === false) {
          this.updateHighlights();
          return false;
        }

        if (result && typeof result.then === "function") {
          result.then((success) => {
            if (success !== false) {
              this.clearSelection();
              this.render();
            }
          }).catch((error) => {
            console.error("APPARA BOARD: Move failed.", error);
          });

          return true;
        }

        this.clearSelection();
        this.render();
        return true;
      }

      const result = window.APPARA_ENGINE.move(moveData);

      if (!result) {
        this.updateHighlights();
        return false;
      }

      this.lastMove = {
        from,
        to
      };

      this.clearSelection();
      this.render();

      return true;
    },

    setMoveHandler(callback) {
      this.moveHandler = typeof callback === "function"
        ? callback
        : null;
    },

    setPromotionHandler(callback) {
      this.promotionHandler = typeof callback === "function"
        ? callback
        : null;
    },

    /* ---------- LEGAL MOVE HIGHLIGHTS ---------- */

    updateHighlights() {
      if (!this.boardElement) return;

      const squares = this.boardElement.querySelectorAll(
        "[data-square]"
      );

      squares.forEach((square) => {
        square.classList.remove(
          "selected",
          "legal-move",
          "legal-capture",
          "last-move"
        );

        const name = square.dataset.square;

        if (this.lastMove) {
          if (
            name === this.lastMove.from ||
            name === this.lastMove.to
          ) {
            square.classList.add("last-move");
          }
        }

        if (name === this.selectedSquare) {
          square.classList.add("selected");
        }

        if (
          this.showLegalMoves &&
          this.legalMoves.some((move) => move.to === name)
        ) {
          const piece = window.APPARA_ENGINE.getPiece(name);

          square.classList.add(
            piece ? "legal-capture" : "legal-move"
          );
        }
      });
    },

    setLegalMoves(enabled) {
      this.showLegalMoves = Boolean(enabled);
      this.updateHighlights();
    },

    /* ---------- CHECK HIGHLIGHT ---------- */

    updateCheckHighlight() {
      if (!this.boardElement) return;

      this.boardElement.querySelectorAll(
        ".in-check"
      ).forEach((element) => {
        element.classList.remove("in-check");
      });

      const engine = window.APPARA_ENGINE;

      if (!engine.isCheck()) return;

      const boardData = engine.getBoard();
      const currentTurn = engine.turn();

      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const piece = boardData[rank][file];

          if (
            piece &&
            piece.type === "k" &&
            piece.color === currentTurn
          ) {
            const squareName =
              FILES[file] + RANKS[rank];

            const kingSquare = this.boardElement.querySelector(
              '[data-square="' + squareName + '"]'
            );

            if (kingSquare) {
              kingSquare.classList.add("in-check");
            }

            return;
          }
        }
      }
    },

    /* ---------- LAST MOVE ---------- */

    setLastMove(from, to) {
      if (!this.isValidSquare(from) || !this.isValidSquare(to)) {
        return false;
      }

      this.lastMove = { from, to };
      this.updateHighlights();

      return true;
    },

    clearLastMove() {
      this.lastMove = null;
      this.updateHighlights();
    },

    /* ---------- DRAG AND DROP ---------- */

    handleDragStart(event) {
      const pieceElement = event.target.closest(
        ".chess-piece"
      );

      if (!pieceElement || !this.draggable) {
        event.preventDefault();
        return;
      }

      const squareElement = pieceElement.closest(
        "[data-square]"
      );

      if (!squareElement) {
        event.preventDefault();
        return;
      }

      const squareName = squareElement.dataset.square;
      const piece = window.APPARA_ENGINE.getPiece(squareName);

      if (
        !piece ||
        piece.color !== window.APPARA_ENGINE.turn()
      ) {
        event.preventDefault();
        return;
      }

      this.setSelection(squareName);

      if (event.dataTransfer) {
        event.dataTransfer.setData(
          "text/plain",
          squareName
        );

        event.dataTransfer.effectAllowed = "move";
      }
    },

    handleDragOver(event) {
      const target = event.target.closest("[data-square]");

      if (target && this.selectedSquare) {
        event.preventDefault();
      }
    },

    handleDrop(event) {
      const target = event.target.closest("[data-square]");

      if (!target || !this.selectedSquare) return;

      event.preventDefault();

      const from = this.selectedSquare;
      const to = target.dataset.square;

      if (from === to) {
        this.clearSelection();
        return;
      }

      const matchingMove = this.legalMoves.find(
        (move) => move.to === to
      );

      if (matchingMove) {
        this.submitMove(from, to, matchingMove);
      } else {
        this.clearSelection();
      }
    },

    /* ---------- BOARD ORIENTATION ---------- */

    flip() {
      this.orientation = this.orientation === "white"
        ? "black"
        : "white";

      this.clearSelection();
      this.render();

      return this.orientation;
    },

    setOrientation(color) {
      this.orientation = color === "black"
        ? "black"
        : "white";

      this.clearSelection();
      this.render();

      return this.orientation;
    },

    getOrientation() {
      return this.orientation;
    },

    /* ---------- BOARD THEME ---------- */

    setTheme(theme) {
      const allowedThemes = [
        "classic",
        "blue",
        "green",
        "purple",
        "dark"
      ];

      const selectedTheme = allowedThemes.includes(theme)
        ? theme
        : "classic";

      this.theme = selectedTheme;

      if (this.boardElement) {
        this.boardElement.dataset.theme = selectedTheme;

        this.boardElement.classList.remove(
          "theme-classic",
          "theme-blue",
          "theme-green",
          "theme-purple",
          "theme-dark"
        );

        this.boardElement.classList.add(
          "theme-" + selectedTheme
        );
      }

      return selectedTheme;
    },

    getTheme() {
      return this.theme;
    },

    /* ---------- VALIDATION ---------- */

    isValidSquare(squareName) {
      return (
        typeof squareName === "string" &&
        /^[a-h][1-8]$/.test(squareName)
      );
    },

    /* ---------- REFRESH ---------- */

    refresh() {
      this.clearSelection();
      return this.render();
    },

    /* ---------- DESTROY ---------- */

    destroy() {
      if (!this.initialized || !this.boardElement) {
        return false;
      }

      this.boardElement.removeEventListener(
        "click",
        this.boundClickHandler
      );

      this.boardElement.removeEventListener(
        "dragstart",
        this.boundDragStartHandler
      );

      this.boardElement.removeEventListener(
        "dragover",
        this.boundDragOverHandler
      );

      this.boardElement.removeEventListener(
        "drop",
        this.boundDropHandler
      );

      this.boardElement.replaceChildren();

      this.initialized = false;
      this.selectedSquare = null;
      this.legalMoves = [];

      return true;
    }
  };

  window.APPARA_BOARD = Board;

})();

/* =========================================================
   APPARA CHESS — BOARD CONTROLLER
   PART 09 END
   ========================================================= */
