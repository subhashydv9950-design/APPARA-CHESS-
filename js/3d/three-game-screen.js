
/* =========================================================
   APPARA CHESS
   FILE: js/3d/three-game-screen.js
   PURPOSE: Connect 3D Chess Engine with GameScreen
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

    this.destroyed = false;
    this.syncing = false;
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
      ["Classic", () => this.engine?.setCameraView("classic")],
      ["Top", () => this.engine?.setCameraView("top")],
      ["Cinema", () => this.engine?.setCameraView("cinematic")],
      ["Close", () => this.engine?.setCameraView("close")],
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

  async handleSquareClick(square) {
    if (this.destroyed || !this.engine) return;

    const screen = this.gameScreen;

    if (
      screen.isPaused ||
      screen.isGameOver ||
      screen.isThinking
    ) {
      return;
    }

    await screen.handleSquareClick(square);

    this.syncPosition();
    this.syncHighlights();
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

      if (Array.isArray(board) && board.length === 8) {
        this.engine.setPosition(board);
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
      screen.selectedSquare,
      screen.legalTargets || []
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

    if (state?.on) {
      const unsubscribe = state.on("change", () => {
        this.syncPosition();
      });

      if (typeof unsubscribe === "function") {
        this.unsubscribe = unsubscribe;
      }
    }
  }

  refresh() {
    this.syncPosition();
  }

  setCamera(view) {
    this.engine?.setCameraView(view);
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;

    if (typeof this.unsubscribe === "function") {
      this.unsubscribe();
    }

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
