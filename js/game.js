
/* =========================================================
   APPARA CHESS — MAIN GAME CONTROLLER
   PART 19 — js/game.js
   ========================================================= */

window.APPARA_GAME = (function () {
  "use strict";

  let initialized = false;
  let currentMode = "offline";
  let gameStarted = false;
  let gamePaused = false;
  let gameFinished = false;
  let activeTimeControl = {
    minutes: 10,
    increment: 0
  };

  /* ---------- HELPERS ---------- */

  function getElement(id) {
    return document.getElementById(id);
  }

  function notify(message, type) {
    if (
      window.APPARA_APP &&
      typeof window.APPARA_APP.notify === "function"
    ) {
      window.APPARA_APP.notify(message, type || "info");
      return;
    }

    const container = getElement("notification-container");

    if (container) {
      const item = document.createElement("div");
      item.className = "notification " + (type || "info");
      item.textContent = message;
      container.appendChild(item);

      window.setTimeout(function () {
        item.remove();
      }, 3000);

      return;
    }

    console.info("[APPARA CHESS]", message);
  }

  function playButtonSound() {
    if (window.APPARA_SOUND) {
      window.APPARA_SOUND.button();
    }
  }

  function getPlayerName() {
    if (window.APPARA_PROFILE) {
      const player = window.APPARA_PROFILE.getProfile();
      return player.name || "Guest Player";
    }

    return "Guest Player";
  }

  /* ---------- PAGE NAVIGATION ---------- */

  function navigateToGame() {
    if (
      window.APPARA_APP &&
      typeof window.APPARA_APP.navigate === "function"
    ) {
      window.APPARA_APP.navigate("game");
      return;
    }

    document.querySelectorAll("[data-page]").forEach(function (page) {
      page.classList.toggle(
        "active",
        page.dataset.page === "game"
      );
    });

    document.querySelectorAll(".page").forEach(function (page) {
      page.classList.toggle(
        "active",
        page.id === "page-game"
      );
    });
  }

  /* ---------- TIME CONTROL ---------- */

  function getTimeControl(options) {
    const requested = options && options.timeControl;

    if (
      requested &&
      Number.isFinite(Number(requested.minutes)) &&
      Number(requested.minutes) > 0
    ) {
      return {
        minutes: Number(requested.minutes),
        increment: Math.max(0, Number(requested.increment) || 0)
      };
    }

    return {
      minutes: 10,
      increment: 0
    };
  }

  function initializeTimer() {
    if (!window.APPARA_TIMER) return;

    window.APPARA_TIMER.init({
      minutes: activeTimeControl.minutes,
      increment: activeTimeControl.increment,

      onTick: function (times) {
        updateClockDisplay(times);
      },

      onTimeout: function (color) {
        handleTimeout(color);
      },

      onTurnChange: function () {
        updateGameDisplay();
      }
    });
  }

  function updateClockDisplay(times) {
    if (!times) return;

    const white = getElement("white-clock");
    const black = getElement("black-clock");

    if (white) {
      white.textContent = window.APPARA_TIMER.formatTime(
        times.w !== undefined ? times.w : times.white
      );
    }

    if (black) {
      black.textContent = window.APPARA_TIMER.formatTime(
        times.b !== undefined ? times.b : times.black
      );
    }
  }

  function handleTimeout(color) {
    if (gameFinished) return;

    gameFinished = true;
    gameStarted = false;

    const winner = color === "w" ? "Black" : "White";

    if (window.APPARA_MULTIPLAYER) {
      window.APPARA_MULTIPLAYER.pause();
    }

    notify(winner + " wins on time!", "success");
    finishGameRecord(color === "w" ? "loss" : "win");
  }

  /* ---------- GAME START ---------- */

  function startGame(mode, options) {
    options = options || {};

    const allowedModes = [
      "offline",
      "computer",
      "online",
      "training"
    ];

    if (!allowedModes.includes(mode)) {
      notify("Invalid game mode.", "error");
      return false;
    }

    if (!window.APPARA_ENGINE || !window.APPARA_BOARD) {
      notify("Chess engine or board is not ready.", "error");
      return false;
    }

    if (!window.APPARA_MULTIPLAYER) {
      notify("Game controller is not available.", "error");
      return false;
    }

    currentMode = mode;
    gamePaused = false;
    gameFinished = false;
    gameStarted = false;

    activeTimeControl = getTimeControl(options);

    if (window.APPARA_SOUND) {
      window.APPARA_SOUND.unlock();
      window.APPARA_SOUND.gameStart();
    }

    initializeTimer();

    let success = false;

    try {
      if (mode === "offline" || mode === "training") {
        success = window.APPARA_MULTIPLAYER.startOffline();
      } else if (mode === "computer") {
        if (options.difficulty && window.APPARA_AI) {
          window.APPARA_AI.setDifficulty(options.difficulty);
        }

        success = window.APPARA_MULTIPLAYER.startComputer();
      } else if (mode === "online") {
        success = window.APPARA_MULTIPLAYER.startOnline();
      }
    } catch (error) {
      console.error("Game start failed:", error);
      notify("Unable to start the game.", "error");
      return false;
    }

    if (success === false) {
      notify("Game could not be started.", "error");
      return false;
    }

    gameStarted = true;

    if (window.APPARA_TIMER) {
      window.APPARA_TIMER.start();
    }

    navigateToGame();
    updateGameDisplay();

    const modeNames = {
      offline: "Local Two Player",
      computer: "Play vs Computer",
      online: "Online Multiplayer",
      training: "Training Mode"
    };

    const modeLabel = getElement("game-mode-label");

    if (modeLabel) {
      modeLabel.textContent = modeNames[mode] || mode;
    }

    notify(modeNames[mode] + " started.", "success");

    return true;
  }

  /* ---------- QUICK PLAY ---------- */

  function handleQuickPlay() {
    playButtonSound();
    startGame("computer", {
      difficulty: "medium"
    });
  }

  /* ---------- MOVE HISTORY ---------- */

  function renderMoveHistory() {
    const container = getElement("move-history");
    if (!container || !window.APPARA_ENGINE) return;

    const history = window.APPARA_ENGINE.getHistory({
      verbose: true
    });

    container.innerHTML = "";

    for (let i = 0; i < history.length; i += 2) {
      const row = document.createElement("div");
      row.className = "move-history-row";

      const number = document.createElement("span");
      number.textContent = String(Math.floor(i / 2) + 1) + ".";

      const whiteMove = document.createElement("span");
      whiteMove.textContent = history[i]
        ? history[i].san
        : "";

      const blackMove = document.createElement("span");
      blackMove.textContent = history[i + 1]
        ? history[i + 1].san
        : "";

      row.appendChild(number);
      row.appendChild(whiteMove);
      row.appendChild(blackMove);

      container.appendChild(row);
    }

    container.scrollTop = container.scrollHeight;

    const moveCount = getElement("move-count");

    if (moveCount) {
      moveCount.textContent = String(history.length);
    }
  }

  /* ---------- CAPTURED PIECES ---------- */

  function renderCapturedPieces() {
    if (!window.APPARA_ENGINE) return;

    const captured = window.APPARA_ENGINE.getCapturedPieces();

    const whiteContainer = getElement("captured-white");
    const blackContainer = getElement("captured-black");

    if (whiteContainer) {
      whiteContainer.textContent = captured.white
        .map(getPieceSymbol)
        .join(" ");
    }

    if (blackContainer) {
      blackContainer.textContent = captured.black
        .map(getPieceSymbol)
        .join(" ");
    }
  }

  function getPieceSymbol(piece) {
    const symbols = {
      wp: "♙",
      wn: "♘",
      wb: "♗",
      wr: "♖",
      wq: "♕",
      bp: "♟",
      bn: "♞",
      bb: "♝",
      br: "♜",
      bq: "♛"
    };

    if (typeof piece === "string") {
      return symbols[piece] || piece;
    }

    if (piece && piece.type && piece.color) {
      const key = piece.color + piece.type;
      return symbols[key] || "";
    }

    return "";
  }

  /* ---------- GAME DISPLAY ---------- */

  function updateGameDisplay() {
    if (!window.APPARA_ENGINE) return;

    renderMoveHistory();
    renderCapturedPieces();

    const status = window.APPARA_ENGINE.getGameStatus();

    const statusElement = getElement("game-status");

    if (statusElement) {
      statusElement.textContent =
        status.message || status.status || "Game in progress";
    }

    const state = window.APPARA_ENGINE.getSnapshot();

    const turnElement = getElement("current-turn");

    if (turnElement && state) {
      turnElement.textContent =
        state.turn === "w" ? "White to move" : "Black to move";
    }
  }

  /* ---------- UNDO ---------- */

  function undoMove() {
    if (
      !gameStarted ||
      gameFinished ||
      !window.APPARA_ENGINE
    ) {
      return false;
    }

    if (currentMode === "online") {
      notify("Undo is unavailable in online games.", "info");
      return false;
    }

    let undone = false;

    if (currentMode === "computer") {
      const first = window.APPARA_ENGINE.undo();

      if (first) {
        undone = true;

        const history = window.APPARA_ENGINE.getHistory();

        if (history.length && window.APPARA_ENGINE.turn() === "b") {
          window.APPARA_ENGINE.undo();
        }
      }
    } else {
      undone = Boolean(window.APPARA_ENGINE.undo());
    }

    if (!undone) {
      notify("No move to undo.", "info");
      return false;
    }

    if (window.APPARA_BOARD) {
      window.APPARA_BOARD.clearSelection();
      window.APPARA_BOARD.clearLastMove();
      window.APPARA_BOARD.refresh();
    }

    if (window.APPARA_TIMER) {
      window.APPARA_TIMER.pause();
    }

    updateGameDisplay();

    if (window.APPARA_TIMER && !gamePaused) {
      window.APPARA_TIMER.resume();
    }

    notify("Move undone.", "info");
    return true;
  }

  /* ---------- BOARD FLIP ---------- */

  function flipBoard() {
    if (!window.APPARA_BOARD) return false;

    window.APPARA_BOARD.flip();
    playButtonSound();

    return true;
  }

  /* ---------- DRAW ---------- */

  function offerDraw() {
    if (!gameStarted || gameFinished) return false;

    if (currentMode === "online") {
      notify(
        "Online draw offers will be available after room integration.",
        "info"
      );
      return false;
    }

    const accepted = window.confirm(
      "End this game as a draw?"
    );

    if (!accepted) return false;

    gameFinished = true;
    gameStarted = false;

    if (window.APPARA_TIMER) {
      window.APPARA_TIMER.stop();
    }

    if (window.APPARA_SOUND) {
      window.APPARA_SOUND.gameEnd();
    }

    if (window.APPARA_PROFILE) {
      window.APPARA_PROFILE.recordGame("draw", {
        opponent: currentMode === "computer"
          ? "Computer"
          : "Local Player",
        mode: currentMode,
        moves: window.APPARA_ENGINE.getHistory().length
      });
    }

    notify("Game ended in a draw.", "success");

    return true;
  }

  /* ---------- RESIGN ---------- */

  function resign() {
    if (!gameStarted || gameFinished) return false;

    const settings = window.APPARA_SETTINGS
      ? window.APPARA_SETTINGS.getSettings()
      : { confirmResign: true };

    if (settings.confirmResign) {
      const confirmed = window.confirm(
        "Are you sure you want to resign?"
      );

      if (!confirmed) return false;
    }

    gameFinished = true;
    gameStarted = false;

    if (window.APPARA_TIMER) {
      window.APPARA_TIMER.stop();
    }

    if (window.APPARA_MULTIPLAYER) {
      window.APPARA_MULTIPLAYER.resign();
    }

    if (window.APPARA_SOUND) {
      window.APPARA_SOUND.gameEnd();
    }

    const turn = window.APPARA_ENGINE
      ? window.APPARA_ENGINE.turn()
      : "w";

    finishGameRecord(turn === "w" ? "loss" : "win");

    notify("Game resigned.", "info");

    return true;
  }

  /* ---------- PAUSE / RESUME ---------- */

  function pauseGame() {
    if (!gameStarted || gameFinished || gamePaused) {
      return false;
    }

    gamePaused = true;

    if (window.APPARA_TIMER) {
      window.APPARA_TIMER.pause();
    }

    if (window.APPARA_MULTIPLAYER) {
      window.APPARA_MULTIPLAYER.pause();
    }

    const button = getElement("pause-btn");

    if (button) button.textContent = "Resume";

    notify("Game paused.", "info");

    return true;
  }

  function resumeGame() {
    if (!gameStarted || gameFinished || !gamePaused) {
      return false;
    }

    gamePaused = false;

    if (window.APPARA_TIMER) {
      window.APPARA_TIMER.resume();
    }

    if (window.APPARA_MULTIPLAYER) {
      window.APPARA_MULTIPLAYER.resume();
    }

    const button = getElement("pause-btn");

    if (button) button.textContent = "Pause";

    notify("Game resumed.", "info");

    return true;
  }

  function togglePause() {
    return gamePaused ? resumeGame() : pauseGame();
  }

  /* ---------- FINISH GAME RECORD ---------- */

  function finishGameRecord(result) {
    if (!window.APPARA_PROFILE) return;

    window.APPARA_PROFILE.recordGame(result, {
      opponent: currentMode === "computer"
        ? "Computer"
        : currentMode === "online"
          ? "Online Player"
          : "Local Player",
      mode: currentMode,
      moves: window.APPARA_ENGINE
        ? window.APPARA_ENGINE.getHistory().length
        : 0
    });
  }

  /* ---------- END GAME CHECK ---------- */

  function checkGameEnd() {
    if (!window.APPARA_ENGINE || gameFinished) return false;

    const status = window.APPARA_ENGINE.getGameStatus();

    if (!status || !status.isOver) return false;

    gameFinished = true;
    gameStarted = false;

    if (window.APPARA_TIMER) {
      window.APPARA_TIMER.stop();
    }

    if (window.APPARA_SOUND) {
      window.APPARA_SOUND.gameEnd();
    }

    if (status.status === "checkmate") {
      const winner = window.APPARA_ENGINE.turn() === "w"
        ? "Black"
        : "White";

      notify(winner + " wins by checkmate!", "success");

      if (currentMode === "computer") {
        finishGameRecord(
          winner === "White" ? "win" : "loss"
        );
      } else if (currentMode === "offline") {
        finishGameRecord("draw");
      }
    } else {
      notify(status.message || "Game drawn.", "info");
      finishGameRecord("draw");
    }

    return true;
  }

  /* ---------- EVENT BINDING ---------- */

  function bindClick(id, callback) {
    const element = getElement(id);

    if (!element || element.dataset.gameBound) return;

    element.dataset.gameBound = "true";

    element.addEventListener("click", function () {
      playButtonSound();
      callback();
    });
  }

  function bindEvents() {
    bindClick("quick-play-btn", handleQuickPlay);
    bindClick("undo-btn", undoMove);
    bindClick("flip-board-btn", flipBoard);
    bindClick("draw-btn", offerDraw);
    bindClick("resign-btn", resign);
    bindClick("pause-btn", togglePause);

    document.querySelectorAll("[data-mode]").forEach(function (button) {
      if (button.dataset.gameModeBound) return;

      button.dataset.gameModeBound = "true";

      button.addEventListener("click", function () {
        const mode = button.dataset.mode;

        if (mode === "computer") {
          startGame("computer", { difficulty: "medium" });
        } else if (mode === "offline") {
          startGame("offline");
        } else if (mode === "online") {
          startGame("online");
        } else if (mode === "training") {
          startGame("training");
        }
      });
    });
  }

  /* ---------- INITIALIZE ---------- */

  function init() {
    if (initialized) {
      updateGameDisplay();
      return true;
    }

    bindEvents();

    if (window.APPARA_ENGINE) {
      window.APPARA_ENGINE.createGame();
    }

    if (window.APPARA_BOARD) {
      window.APPARA_BOARD.init();
    }

    if (window.APPARA_SOUND) {
      window.APPARA_SOUND.init();
    }

    if (window.APPARA_PROFILE) {
      window.APPARA_PROFILE.init();
    }

    if (window.APPARA_SETTINGS) {
      window.APPARA_SETTINGS.init();
    }

    updateGameDisplay();

    initialized = true;

    return true;
  }

  /* ---------- STATE ---------- */

  function getState() {
    return {
      initialized: initialized,
      mode: currentMode,
      started: gameStarted,
      paused: gamePaused,
      finished: gameFinished,
      timeControl: Object.assign({}, activeTimeControl)
    };
  }

  function destroy() {
    if (window.APPARA_TIMER) {
      window.APPARA_TIMER.stop();
    }

    initialized = false;
    gameStarted = false;
    gamePaused = false;
    gameFinished = false;
  }

  return {
    init: init,
    notify: notify,
    startGame: startGame,
    handleQuickPlay: handleQuickPlay,
    updateGameDisplay: updateGameDisplay,
    undoMove: undoMove,
    flipBoard: flipBoard,
    offerDraw: offerDraw,
    resign: resign,
    pauseGame: pauseGame,
    resumeGame: resumeGame,
    togglePause: togglePause,
    checkGameEnd: checkGameEnd,
    getState: getState,
    destroy: destroy
  };
})();

/* =========================================================
   APPARA CHESS — MAIN GAME CONTROLLER
   PART 19 END
   ========================================================= */
      
