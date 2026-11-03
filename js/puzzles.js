
/* =========================================================
   APPARA CHESS — PUZZLE SYSTEM
   PART 21C — PUZZLE VALIDATION & BOARD SYNC FIX
   File: js/puzzles.js
   ========================================================= */

window.APPARA_PUZZLES = (function () {
    "use strict";

    const STORAGE_KEY = "appara_chess_puzzles_v1";

    let initialized = false;
    let currentPuzzle = null;
    let puzzleIndex = 0;
    let solvedCount = 0;
    let attempts = 0;
    let isActive = false;
    let isSolved = false;
    let isProcessing = false;

    /*
     * Puzzle solution format:
     * Each move uses UCI notation:
     * e.g. g6g7
     */

    const PUZZLES = [
        {
            id: "AP-P001",
            title: "Queen's Final Strike",
            level: "Beginner",
            difficulty: 1,
            description: "Find the winning queen move.",
            fen: "7k/6pp/5KQ1/8/8/8/8/8 w - - 0 1",
            solution: [
                "g6g7"
            ],
            successMessage: "Brilliant! Checkmate!",
            hint: "Look for a queen move that attacks the black king."
        }
    ];

    function getEngine() {
        return window.APPARA_ENGINE || null;
    }

    function getGame() {
        return getEngine() ? getEngine().getGame() : null;
    }

    function getElement(id) {
        return document.getElementById(id);
    }

    function notify(message, type) {
        if (
            window.APPARA_APP &&
            typeof APPARA_APP.notify === "function"
        ) {
            APPARA_APP.notify(message, type || "info");
        }
    }

    function loadSolvedCount() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "{}"
            );

            solvedCount = Number(saved.solvedCount) || 0;
        } catch (error) {
            solvedCount = 0;
        }

        updateSolvedDisplay();
    }

    function saveProgress() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    solvedCount: solvedCount,
                    lastSolved: currentPuzzle
                        ? currentPuzzle.id
                        : null
                })
            );
        } catch (error) {
            console.warn(
                "[APPARA PUZZLES] Progress could not be saved."
            );
        }
    }

    function init() {
        loadSolvedCount();
        bindEvents();

        initialized = true;
        return true;
    }

    function bindEvents() {
        const startButton = getElement("start-puzzle-btn");

        if (startButton && !startButton.dataset.puzzleBound) {
            startButton.dataset.puzzleBound = "true";

            startButton.addEventListener("click", function () {
                startPuzzle();
            });
        }
    }

    function getPuzzleList() {
        return PUZZLES.map(function (puzzle) {
            return {
                id: puzzle.id,
                title: puzzle.title,
                level: puzzle.level,
                difficulty: puzzle.difficulty,
                description: puzzle.description
            };
        });
    }

    function getPuzzle(id) {
        return PUZZLES.find(function (puzzle) {
            return puzzle.id === id;
        }) || null;
    }

    function choosePuzzle() {
        if (!PUZZLES.length) return null;

        if (PUZZLES.length === 1) {
            puzzleIndex = 0;
            return PUZZLES[0];
        }

        const nextIndex = puzzleIndex % PUZZLES.length;
        puzzleIndex++;

        return PUZZLES[nextIndex];
    }

    function startPuzzle(id) {
        const engine = getEngine();

        if (!engine) {
            notify("Chess engine उपलब्ध नहीं है।", "error");
            return false;
        }

        const puzzle = id
            ? getPuzzle(id)
            : choosePuzzle();

        if (!puzzle) {
            notify("कोई Puzzle उपलब्ध नहीं है।", "error");
            return false;
        }

        stop();

        if (!engine.load(puzzle.fen)) {
            notify("Puzzle position load नहीं हो सकी।", "error");
            return false;
        }

        currentPuzzle = puzzle;
        attempts = 0;
        isActive = true;
        isSolved = false;
        isProcessing = false;

        if (window.APPARA_BOARD) {
            APPARA_BOARD.setOrientation(
                getGame().turn()
            );

            APPARA_BOARD.setMoveHandler(handleMove);
            APPARA_BOARD.refresh();
        }

        updatePuzzleDisplay();
        renderPuzzle();

        notify("Puzzle शुरू हो गया है। सही चाल खोजें!", "success");

        return true;
    }

    function normalizeMove(move) {
        if (!move) return "";

        return (
            String(move.from || "") +
            String(move.to || "") +
            String(move.promotion || "")
        ).toLowerCase();
    }

    function getExpectedMove() {
        if (
            !currentPuzzle ||
            !Array.isArray(currentPuzzle.solution)
        ) {
            return null;
        }

        return currentPuzzle.solution[0] || null;
    }

    function handleMove(move) {
        if (
            !isActive ||
            isSolved ||
            isProcessing ||
            !currentPuzzle
        ) {
            return false;
        }

        const engine = getEngine();
        const game = getGame();

        if (!engine || !game || game.game_over()) {
            return false;
        }

        const expectedMove = getExpectedMove();

        if (!expectedMove) {
            notify("इस Puzzle का solution उपलब्ध नहीं है।", "error");
            return false;
        }

        const submitted = normalizeMove(move);

        if (submitted !== expectedMove.toLowerCase()) {
            attempts++;

            notify(
                "यह सही चाल नहीं है। फिर कोशिश करें!",
                "warning"
            );

            updatePuzzleDisplay();

            if (window.APPARA_BOARD) {
                APPARA_BOARD.clearSelection();
                APPARA_BOARD.refresh();
            }

            return false;
        }

        isProcessing = true;

        const result = engine.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion || "q"
        });

        if (!result) {
            isProcessing = false;
            return false;
        }

        if (window.APPARA_BOARD) {
            APPARA_BOARD.clearSelection();
            APPARA_BOARD.refresh();
        }

        const completed = game.game_over();

        if (completed) {
            completePuzzle();
        } else {
            /*
             * Current puzzle has one verified solution move.
             * Do not pretend an unconfigured opponent reply exists.
             */
            completePuzzle();
        }

        isProcessing = false;
        return result;
    }

    function completePuzzle() {
        if (isSolved) return false;

        isSolved = true;
        isActive = false;

        solvedCount++;

        saveProgress();
        updateSolvedDisplay();

        if (window.APPARA_SOUND) {
            APPARA_SOUND.checkmate();
        }

        notify(
            currentPuzzle.successMessage ||
            "Puzzle Solved!",
            "success"
        );

        renderPuzzle();

        if (window.APPARA_BOARD) {
            APPARA_BOARD.setMoveHandler(null);
            APPARA_BOARD.refresh();
        }

        return true;
    }

    function showHint() {
        if (!currentPuzzle || !isActive) {
            notify("पहले Puzzle शुरू करें।", "info");
            return false;
        }

        notify(
            "Hint: " + currentPuzzle.hint,
            "info"
        );

        return true;
    }

    function stop() {
        isActive = false;
        isSolved = false;
        isProcessing = false;
        attempts = 0;

        if (window.APPARA_BOARD) {
            APPARA_BOARD.setMoveHandler(null);
            APPARA_BOARD.clearSelection();
        }

        return true;
    }

    function nextPuzzle() {
        stop();
        return startPuzzle();
    }

    function updateSolvedDisplay() {
        const element = getElement("puzzles-solved");

        if (element) {
            element.textContent = String(solvedCount);
        }
    }

    function updatePuzzleDisplay() {
        const levelElement = getElement("puzzle-level");

        if (levelElement && currentPuzzle) {
            levelElement.textContent =
                currentPuzzle.level;
        }
    }

    function renderPuzzle() {
        const container = getElement("puzzle-container");

        if (!container || !currentPuzzle) return;

        const title = currentPuzzle.title;
        const description = currentPuzzle.description;

        container.innerHTML = `
            <div class="puzzle-info">
                <div class="puzzle-info-top">
                    <span class="puzzle-level-badge">
                        ${escapeHTML(currentPuzzle.level)}
                    </span>
                    <span class="puzzle-id">
                        ${escapeHTML(currentPuzzle.id)}
                    </span>
                </div>

                <h3>${escapeHTML(title)}</h3>

                <p>${escapeHTML(description)}</p>

                <div class="puzzle-attempts">
                    Attempts: ${attempts}
                </div>

                ${
                    isSolved
                    ? `
                        <div class="puzzle-success">
                            <span>✓</span>
                            <strong>Puzzle Solved!</strong>
                            <p>${escapeHTML(
                                currentPuzzle.successMessage
                            )}</p>
                        </div>
                    `
                    : `
                        <div class="puzzle-actions">
                            <button
                                type="button"
                                class="btn btn-secondary"
                                id="puzzle-hint-btn"
                            >
                                Show Hint
                            </button>

                            <button
                                type="button"
                                class="btn btn-primary"
                                id="puzzle-next-btn"
                            >
                                Next Puzzle
                            </button>
                        </div>
                    `
                }
            </div>
        `;

        const hintButton = getElement("puzzle-hint-btn");
        const nextButton = getElement("puzzle-next-btn");

        if (hintButton) {
            hintButton.addEventListener("click", showHint);
        }

        if (nextButton) {
            nextButton.addEventListener("click", nextPuzzle);
        }
    }

    function escapeHTML(value) {
        return String(value).replace(
            /[&<>"']/g,
            function (character) {
                return {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;"
                }[character];
            }
        );
    }

    function getSolvedCount() {
        return solvedCount;
    }

    function getState() {
        return {
            initialized: initialized,
            active: isActive,
            solved: isSolved,
            processing: isProcessing,
            attempts: attempts,
            solvedCount: solvedCount,
            currentPuzzle: currentPuzzle
                ? currentPuzzle.id
                : null
        };
    }

    function destroy() {
        stop();
        initialized = false;
        return true;
    }

    return {
        init: init,
        start: startPuzzle,
        startPuzzle: startPuzzle,
        stop: stop,
        nextPuzzle: nextPuzzle,
        showHint: showHint,
        handleMove: handleMove,
        getPuzzle: getPuzzle,
        getPuzzleList: getPuzzleList,
        getSolvedCount: getSolvedCount,
        getState: getState,
        destroy: destroy
    };
})();

/* =========================================================
   APPARA CHESS — PART 21C END
   FILE END: js/puzzles.js
   ========================================================= */
           
