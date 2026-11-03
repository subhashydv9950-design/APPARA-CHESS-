
/* =========================================================
   APPARA CHESS — PUZZLE SYSTEM
   PART 16 — js/puzzles.js
   ========================================================= */

window.APPARA_PUZZLES = (function () {
  "use strict";

  const puzzles = [
    {
      id: 1,
      title: "Mate in One",
      level: "Easy",
      rating: 800,
      fen: "6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1",
      solution: [],
      description: "Find the best move."
    },
    {
      id: 2,
      title: "Queen Attack",
      level: "Easy",
      rating: 900,
      fen: "4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1",
      solution: [],
      description: "Practice queen movement."
    },
    {
      id: 3,
      title: "Knight Practice",
      level: "Medium",
      rating: 1100,
      fen: "4k3/8/8/3n4/8/8/8/4K3 w - - 0 1",
      solution: [],
      description: "Explore knight tactics."
    }
  ];

  let currentPuzzle = null;
  let currentIndex = 0;
  let solved = [];
  let active = false;
  let moveCount = 0;
  let puzzleGame = null;

  const STORAGE_KEY = "appara_chess_puzzles_v1";

  function loadProgress() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      solved = Array.isArray(data.solved) ? data.solved : [];
    } catch (error) {
      solved = [];
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ solved: solved })
      );
    } catch (error) {
      console.warn("Puzzle progress could not be saved.", error);
    }
  }

  function getSolvedCount() {
    return solved.length;
  }

  function getPuzzleList() {
    return puzzles.map(function (puzzle) {
      return {
        id: puzzle.id,
        title: puzzle.title,
        level: puzzle.level,
        rating: puzzle.rating,
        solved: solved.includes(puzzle.id)
      };
    });
  }

  function getPuzzle(id) {
    return puzzles.find(function (puzzle) {
      return puzzle.id === Number(id);
    }) || null;
  }

  function getContainer() {
    return document.getElementById("puzzle-container");
  }

  function notify(message, type) {
    if (window.APPARA_APP &&
        typeof window.APPARA_APP.notify === "function") {
      window.APPARA_APP.notify(message, type || "info");
    } else {
      console.info("[APPARA PUZZLES]", message);
    }
  }

  function renderProgress() {
    const count = document.getElementById("puzzles-solved");
    if (count) count.textContent = String(getSolvedCount());

    const level = document.getElementById("puzzle-level");
    if (level) {
      level.textContent = getSolvedCount() + " / " + puzzles.length;
    }
  }

  function renderPuzzleList() {
    const container = getContainer();
    if (!container) return;

    container.innerHTML = "";

    puzzles.forEach(function (puzzle) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "puzzle-card";

      const title = document.createElement("strong");
      title.textContent = puzzle.title;

      const info = document.createElement("span");
      info.textContent = puzzle.level + " • " + puzzle.rating + " rating";

      const status = document.createElement("span");
      status.textContent = solved.includes(puzzle.id)
        ? "✓ Solved"
        : "Play Puzzle";

      card.appendChild(title);
      card.appendChild(info);
      card.appendChild(status);

      card.addEventListener("click", function () {
        start(puzzle.id);
      });

      container.appendChild(card);
    });
  }

  function start(id) {
    const puzzle = getPuzzle(id);

    if (!puzzle) {
      notify("Puzzle not found.", "error");
      return false;
    }

    if (typeof window.Chess !== "function") {
      notify("Chess engine is not available.", "error");
      return false;
    }

    try {
      puzzleGame = new window.Chess(puzzle.fen);
    } catch (error) {
      notify("Puzzle position could not be loaded.", "error");
      return false;
    }

    currentPuzzle = puzzle;
    currentIndex = puzzles.indexOf(puzzle);
    moveCount = 0;
    active = true;

    if (window.APPARA_ENGINE) {
      window.APPARA_ENGINE.load(puzzle.fen);
    }

    if (window.APPARA_BOARD) {
      window.APPARA_BOARD.setMoveHandler(handleMove);
      window.APPARA_BOARD.clearSelection();
      window.APPARA_BOARD.setLastMove(null);
      window.APPARA_BOARD.render();
      window.APPARA_BOARD.setLegalMoves([]);
    }

    renderActivePuzzle();

    notify("Puzzle started. Find the best move!", "success");
    return true;
  }

  function renderActivePuzzle() {
    const container = getContainer();
    if (!container || !currentPuzzle) return;

    container.innerHTML = "";

    const panel = document.createElement("div");
    panel.className = "active-puzzle";

    const heading = document.createElement("h3");
    heading.textContent = currentPuzzle.title;

    const description = document.createElement("p");
    description.textContent = currentPuzzle.description;

    const level = document.createElement("span");
    level.textContent =
      currentPuzzle.level + " • " + currentPuzzle.rating;

    const status = document.createElement("p");
    status.id = "puzzle-status";
    status.textContent = "Your turn. Find the best move.";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.textContent = "Back to Puzzles";
    backButton.addEventListener("click", function () {
      stop();
    });

    panel.appendChild(heading);
    panel.appendChild(description);
    panel.appendChild(level);
    panel.appendChild(status);
    panel.appendChild(backButton);

    container.appendChild(panel);
  }

  function setPuzzleStatus(message) {
    const status = document.getElementById("puzzle-status");
    if (status) status.textContent = message;
  }

  function handleMove(from, to, promotion) {
    if (!active || !puzzleGame) return false;

    const move = puzzleGame.move({
      from: from,
      to: to,
      promotion: promotion || "q"
    });

    if (!move) {
      return false;
    }

    moveCount += 1;

    if (window.APPARA_BOARD) {
      window.APPARA_BOARD.setLastMove({
        from: from,
        to: to
      });
      window.APPARA_BOARD.refresh();
    }

    if (puzzleGame.game_over()) {
      if (puzzleGame.in_checkmate()) {
        completePuzzle();
      } else {
        setPuzzleStatus("Position finished. Try another puzzle.");
        active = false;
      }
      return true;
    }

    setPuzzleStatus("Move played. Continue analyzing the position.");

    return true;
  }

  function completePuzzle() {
    if (!currentPuzzle) return;

    active = false;

    if (!solved.includes(currentPuzzle.id)) {
      solved.push(currentPuzzle.id);
      saveProgress();
    }

    renderProgress();
    renderPuzzleList();

    notify("Puzzle completed!", "success");

    setPuzzleStatus("Puzzle completed successfully!");
  }

  function nextPuzzle() {
    if (!puzzles.length) return false;

    const nextIndex = (currentIndex + 1) % puzzles.length;
    return start(puzzles[nextIndex].id);
  }

  function stop() {
    active = false;
    currentPuzzle = null;
    puzzleGame = null;
    moveCount = 0;

    if (window.APPARA_BOARD) {
      window.APPARA_BOARD.setMoveHandler(null);
      window.APPARA_BOARD.clearSelection();
    }

    if (window.APPARA_ENGINE) {
      window.APPARA_ENGINE.reset();
    }

    renderPuzzleList();
    renderProgress();
  }

  function init() {
    loadProgress();
    renderProgress();
    renderPuzzleList();

    const startButton = document.getElementById("start-puzzle-btn");

    if (startButton && !startButton.dataset.puzzleBound) {
      startButton.dataset.puzzleBound = "true";

      startButton.addEventListener("click", function () {
        const next = puzzles.find(function (puzzle) {
          return !solved.includes(puzzle.id);
        });

        start(next ? next.id : puzzles[0].id);
      });
    }

    return true;
  }

  function getState() {
    return {
      active: active,
      currentPuzzle: currentPuzzle ? currentPuzzle.id : null,
      moveCount: moveCount,
      solved: solved.slice(),
      total: puzzles.length
    };
  }

  function destroy() {
    stop();
  }

  return {
    init: init,
    start: start,
    stop: stop,
    nextPuzzle: nextPuzzle,
    getPuzzle: getPuzzle,
    getPuzzleList: getPuzzleList,
    getSolvedCount: getSolvedCount,
    getState: getState,
    destroy: destroy
  };
})();

/* =========================================================
   APPARA CHESS — PUZZLE SYSTEM
   PART 16 END
   ========================================================= */
