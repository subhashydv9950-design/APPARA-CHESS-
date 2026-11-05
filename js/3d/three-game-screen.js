
/* =========================================================
   APPARA CHESS
   FILE: js/3d/three-game-screen.js
   PURPOSE: 3D Chess Engine + GameScreen Integration
   PART 1/1 — FULL FILE
   ========================================================= */

import { ThreeChessEngine } from "./three-engine.js";

export class ThreeGameScreen {
  constructor(gameScreen, options = {}) {
    if (!gameScreen) {
      throw new Error("ThreeGameScreen requires GameScreen.");
    }

    this.gameScreen = gameScreen;
    this.options = options;

    this.engine = null;
    this.container = null;
    this.toolbar = null;
    this.unsubscribe = null;

    this.destroyed = false;
    this.syncing = false;
    this.moveInProgress = false;
  }

  mount() {
    const screen = this.gameScreen;
    const frame = screen.root?.querySelector(".ac-board-frame");

    if (!frame) {
      throw new Error("Chess board frame was not found.");
    }

    frame.querySelectorAll(
      ".ac-board-coordinates, .ac-board-with-files"
    ).forEach(element => {
      element.style.display = "none";
    });

    this.container = screen.document.createElement("div");
    this.container.className = "ac-3d-board-container";

    Object.assign(this.container.style, {
      width: "100%",
      height: "min(76vw, 620px)",
      minHeight: "320px",
      maxHeight: "620px",
      position: "relative",
      overflow: "hidden",
      borderRadius: "14px",
      background: "#100b1b",
      touchAction: "none"
    });

    frame.appendChild(this.container);

    this.createToolbar(frame);

    this.engine = new ThreeChessEngine({
      antialias: true,
      shadows: true,
      pixelRatioLimit: 1.5,

      onSquareClick: square => {
        this.handleSquareClick(square);
      },

      onPieceMove: move => {
        this.handlePieceMove(move);
      }
    });

    this.engine.initialize(this.container);

    this.syncPosition();
    this.watchGameState();

    return this;
  }

  createToolbar(frame) {
    this.toolbar = this.gameScreen.document.createElement("div");
    this.toolbar.className = "ac-3d-camera-toolbar";

    Object.assign(this.toolbar.style, {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "8px",
      padding: "10px 4px"
    });

    const controls = [
      ["Classic", () => this.setCamera("classic")],
      ["Top", () => this.setCamera("top")],
      ["Cinema", () => this.setCamera("cinematic")],
      ["Close", () => this.setCamera("close")],
      ["−", () => this.engine?.zoom(1.12)],
      ["+", () => this.engine?.zoom(0.89)],
      ["Reset", () => this.engine?.resetCamera()]
    ];

    for (const [label, action] of controls) {
      const button = this.gameScreen.document.createElement("button");

      button.type = "button";
      button.textContent = label;

      Object.assign(button.style, {
        border: "1px solid rgba(201,164,92,.55)",
        background: "#21172c",
        color: "#f0d69a",
        borderRadius: "9px",
        padding: "8px 12px",
        fontSize: "12px",
        fontWeight: "600",
        cursor: "pointer"
      });

      button.addEventListener("click", action);
      this.toolbar.appendChild(button);
    }

    frame.appendChild(this.toolbar);
  }

  canMove() {
    const screen = this.gameScreen;

    return !(
      this.destroyed ||
      !this.engine ||
      screen.isPaused ||
      screen.isGameOver ||
      screen.isThinking ||
      this.moveInProgress
    );
  }

  async handleSquareClick(square) {
    if (!this.canMove()) return;

    const screen = this.gameScreen;

    try {
      screen.handleSquareClick(square);

      // Selection and legal-target changes.
      this.syncHighlights();

      // The game state listener handles completed moves.
      // This refresh also keeps the board correct after selection.
      this.syncPosition();
    } catch (error) {
      console.error(
        "[APPARA CHESS] 3D square click failed:",
        error
      );
    }
  }

  async handlePieceMove(move) {
    if (!this.canMove()) return;

    if (!move?.from || !move?.to) return;

    this.moveInProgress = true;

    try {
      const screen = this.gameScreen;

      // GameScreen remains responsible for chess rules,
      // move validation, history, clocks and AI response.
      const success = await screen.makeMove(
        move.from,
        move.to
      );

      if (success) {
        this.syncPosition();
        this.syncHighlights();
      } else {
        this.syncPosition();
        this.syncHighlights();
      }
    } catch (error) {
      console.error(
        "[APPARA CHESS] 3D drag move failed:",
        error
      );

      this.syncPosition();
      this.syncHighlights();
    } finally {
      this.moveInProgress = false;
    }
  }

  syncPosition() {
    if (
      this.destroyed ||
      !this.engine ||
      this.syncing
    ) {
      return;
    }

    this.syncing = true;

    try {
      const board = this.gameScreen.getBoardPosition();

      const validBoard =
        Array.isArray(board) &&
        board.length === 8 &&
        board.every(row => Array.isArray(row) && row.length === 8);

      if (validBoard) {
        this.engine.setPosition(board);
      } else {
        console.warn(
          "[APPARA CHESS] Invalid board data received."
        );
      }

      this.syncHighlights();
    } catch (error) {
      console.error(
        "[APPARA CHESS] 3D position sync failed:",
        error
      );
    } finally {
      this.syncing = false;
    }
  }

  syncHighlights() {
    if (!this.engine || this.destroyed) return;

    const screen = this.gameScreen;

    this.engine.setSelection(
      screen.selectedSquare || null,
      Array.isArray(screen.legalTargets)
        ? screen.legalTargets
        : []
    );

    if (
      screen.lastMove?.from &&
      screen.lastMove?.to
    ) {
      this.engine.highlightSquare(
        screen.lastMove.from,
        0xc9a45c
      );

      this.engine.highlightSquare(
        screen.lastMove.to,
        0xc9a45c
      );
    }
  }

  watchGameState() {
    const state = this.gameScreen.gameState;

    if (!state?.on) return;

    const unsubscribe = state.on("change", () => {
      if (this.destroyed) return;

      this.syncPosition();
    });

    if (typeof unsubscribe === "function") {
      this.unsubscribe = unsubscribe;
    }
  }

  refresh() {
    this.syncPosition();
  }

  setCamera(view) {
    if (!this.engine) return;

    this.engine.setCameraView(view);
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;

    if (typeof this.unsubscribe === "function") {
      this.unsubscribe();
    }

    this.unsubscribe = null;

    this.engine?.dispose();
    this.engine = null;

    this.container?.remove();
    this.toolbar?.remove();

    this.container = null;
    this.toolbar = null;
  }
}

/* =========================================================
   FILE COMPLETE
   js/3d/three-game-screen.js
   PART 1/1 — FULL FILE COMPLETE
   ========================================================= */
