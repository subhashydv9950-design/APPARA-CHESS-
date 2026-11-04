
/* =========================================================
   APPARA CHESS — FILE 56
   SCREEN: TRAINING CENTER
   PATH: js/screens/training-screen.js
   PART 1/1 — COMPLETE FILE
========================================================= */

const TRAINING_CATEGORIES = [
  {
    id: "beginner",
    title: "Beginner Training",
    subtitle: "Learn chess from the basics",
    icon: "♙",
    level: "Beginner",
    lessons: [
      { id: "pieces", title: "Meet the Chess Pieces", detail: "Learn how every piece moves.", duration: "5 min" },
      { id: "board", title: "Understanding the Board", detail: "Files, ranks and square coordinates.", duration: "5 min" },
      { id: "check", title: "Check and Checkmate", detail: "Understand the king's danger.", duration: "8 min" },
      { id: "castling", title: "Castling Basics", detail: "Learn the special king and rook move.", duration: "6 min" }
    ]
  },
  {
    id: "tactics",
    title: "Tactical Training",
    subtitle: "Improve your calculation",
    icon: "⚔",
    level: "Intermediate",
    lessons: [
      { id: "fork", title: "The Fork", detail: "Attack two targets at once.", duration: "7 min" },
      { id: "pin", title: "The Pin", detail: "Restrict an opponent's piece.", duration: "7 min" },
      { id: "skewer", title: "The Skewer", detail: "Force a valuable piece to move.", duration: "7 min" },
      { id: "discovered", title: "Discovered Attack", detail: "Reveal an attack by moving a piece.", duration: "8 min" }
    ]
  },
  {
    id: "strategy",
    title: "Chess Strategy",
    subtitle: "Build a stronger game plan",
    icon: "♜",
    level: "Advanced",
    lessons: [
      { id: "opening", title: "Opening Principles", detail: "Control the center and develop pieces.", duration: "10 min" },
      { id: "middlegame", title: "Middlegame Planning", detail: "Create useful plans and improve pieces.", duration: "12 min" },
      { id: "endgame", title: "Endgame Fundamentals", detail: "Learn king activity and pawn endings.", duration: "12 min" },
      { id: "king-safety", title: "King Safety", detail: "Recognize threats around your king.", duration: "8 min" }
    ]
  }
];

export class TrainingScreen {
  constructor(options = {}) {
    this.container = options.container || null;
    this.navigation = options.navigation || null;
    this.puzzleService = options.puzzleService || null;
    this.playerService = options.playerService || null;
    this.progressionService = options.progressionService || null;

    this.selectedCategory = "beginner";
    this.completedLessons = new Set();
    this.loading = false;
    this.destroyed = false;
    this.elements = {};
  }

  mount(container = this.container) {
    if (!container) {
      throw new Error("TrainingScreen requires a container element.");
    }

    this.container = container;
    this.destroyed = false;

    this.render();
    this.bindEvents();
    this.loadProgress();

    return this;
  }

  render() {
    this.container.innerHTML = `
      <main class="training-screen">

        <header class="training-header">
          <button type="button" class="training-back-button" data-action="back">
            ←
          </button>

          <div>
            <span class="training-eyebrow">APPARA CHESS ACADEMY</span>
            <h1>Training Center</h1>
            <p>Learn, practice and master the royal game.</p>
          </div>

          <div class="training-header-icon">♔</div>
        </header>

        <section class="training-hero">
          <div class="training-hero-content">
            <span class="training-hero-label">YOUR JOURNEY TO MASTERY</span>
            <h2>Think better. Play stronger.</h2>
            <p>
              Build your chess knowledge through guided lessons,
              tactical exercises and practice games.
            </p>
            <button type="button" data-action="quick-practice">
              Start Practice →
            </button>
          </div>
          <div class="training-hero-piece" aria-hidden="true">♞</div>
        </section>

        <section class="training-progress-panel">
          <div class="training-progress-heading">
            <div>
              <span class="training-kicker">YOUR PROGRESS</span>
              <h2>Learning Journey</h2>
            </div>
            <span class="training-progress-count" data-role="progress-count">
              0 / 12
            </span>
          </div>

          <div class="training-progress-track">
            <div class="training-progress-fill" data-role="progress-fill"></div>
          </div>

          <p data-role="progress-message">
            Complete lessons to build your chess skills.
          </p>
        </section>

        <section class="training-section">
          <div class="training-section-heading">
            <div>
              <span class="training-kicker">CHOOSE YOUR PATH</span>
              <h2>Training Programs</h2>
            </div>
          </div>

          <div class="training-category-grid">
            ${TRAINING_CATEGORIES.map(category => `
              <button
                type="button"
                class="training-category-card ${category.id === this.selectedCategory ? "active" : ""}"
                data-category="${category.id}"
                aria-pressed="${category.id === this.selectedCategory}"
              >
                <span class="training-category-icon">${category.icon}</span>
                <span class="training-category-level">${category.level}</span>
                <strong>${category.title}</strong>
                <small>${category.subtitle}</small>
              </button>
            `).join("")}
          </div>
        </section>

        <section class="training-section">
          <div class="training-section-heading">
            <div>
              <span class="training-kicker">GUIDED LEARNING</span>
              <h2 data-role="lesson-heading">Beginner Lessons</h2>
            </div>
          </div>

          <div class="training-lesson-list" data-role="lessons"></div>
        </section>

        <section class="training-section">
          <div class="training-section-heading">
            <div>
              <span class="training-kicker">PRACTICE YOUR SKILLS</span>
              <h2>Training Activities</h2>
            </div>
          </div>

          <div class="training-activity-grid">
            <button type="button" class="training-activity-card" data-action="tactics">
              <span>⚡</span>
              <strong>Tactics Practice</strong>
              <small>Solve chess challenges</small>
            </button>

            <button type="button" class="training-activity-card" data-action="endgame">
              <span>♔</span>
              <strong>Endgame Practice</strong>
              <small>Practice important endings</small>
            </button>

            <button type="button" class="training-activity-card" data-action="play-ai">
              <span>♟</span>
              <strong>Play Against AI</strong>
              <small>Practice against a computer</small>
            </button>

            <button type="button" class="training-activity-card" data-action="analysis">
              <span>⌕</span>
              <strong>Game Analysis</strong>
              <small>Review your chess decisions</small>
            </button>
          </div>
        </section>

        <footer class="training-footer">
          <span>APPARA CHESS ACADEMY</span>
          <span>EVERY MOVE MAKES YOU STRONGER</span>
        </footer>

      </main>
    `;

    this.cacheElements();
    this.renderLessons();
    this.updateProgress();
  }

  cacheElements() {
    this.elements.lessons =
      this.container.querySelector('[data-role="lessons"]');

    this.elements.lessonHeading =
      this.container.querySelector('[data-role="lesson-heading"]');

    this.elements.progressCount =
      this.container.querySelector('[data-role="progress-count"]');

    this.elements.progressFill =
      this.container.querySelector('[data-role="progress-fill"]');

    this.elements.progressMessage =
      this.container.querySelector('[data-role="progress-message"]');
  }

  bindEvents() {
    this.container.addEventListener("click", event => {
      const categoryButton = event.target.closest("[data-category]");

      if (categoryButton) {
        this.selectCategory(categoryButton.dataset.category);
        return;
      }

      const lessonButton = event.target.closest("[data-lesson]");

      if (lessonButton) {
        this.openLesson(lessonButton.dataset.lesson);
        return;
      }

      const actionButton = event.target.closest("[data-action]");

      if (!actionButton) return;

      switch (actionButton.dataset.action) {
        case "back":
          this.goBack();
          break;

        case "quick-practice":
          this.startPractice();
          break;

        case "tactics":
          this.openTactics();
          break;

        case "endgame":
          this.openEndgame();
          break;

        case "play-ai":
          this.playAgainstAI();
          break;

        case "analysis":
          this.openAnalysis();
          break;

        default:
          break;
      }
    });
  }

  selectCategory(categoryId) {
    const category = TRAINING_CATEGORIES.find(
      item => item.id === categoryId
    );

    if (!category) return;

    this.selectedCategory = categoryId;

    this.container.querySelectorAll("[data-category]").forEach(button => {
      const active = button.dataset.category === categoryId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    this.renderLessons();
  }

  renderLessons() {
    const category = TRAINING_CATEGORIES.find(
      item => item.id === this.selectedCategory
    );

    if (!category || !this.elements.lessons) return;

    this.elements.lessonHeading.textContent = category.title;

    this.elements.lessons.innerHTML = category.lessons.map((lesson, index) => {
      const completed = this.completedLessons.has(lesson.id);

      return `
        <article class="training-lesson-card ${completed ? "completed" : ""}">
          <div class="training-lesson-number">
            ${completed ? "✓" : String(index + 1).padStart(2, "0")}
          </div>

          <div class="training-lesson-info">
            <strong>${lesson.title}</strong>
            <p>${lesson.detail}</p>
            <small>${lesson.duration}</small>
          </div>

          <button
            type="button"
            data-lesson="${lesson.id}"
            aria-label="${completed ? "Review" : "Start"} ${lesson.title}"
          >
            ${completed ? "Review" : "Start"} →
          </button>
        </article>
      `;
    }).join("");
  }

  async loadProgress() {
    try {
      const profile = this.playerService?.getProfile?.();

      const saved = profile?.training?.completedLessons;

      if (Array.isArray(saved)) {
        this.completedLessons = new Set(saved);
      }
    } catch {
      // Local progress remains available if profile loading fails.
    }

    if (!this.destroyed) {
      this.renderLessons();
      this.updateProgress();
    }
  }

  updateProgress() {
    const total = TRAINING_CATEGORIES.reduce(
      (sum, category) => sum + category.lessons.length,
      0
    );

    const completed = this.completedLessons.size;
    const percentage = total
      ? Math.min(100, Math.round((completed / total) * 100))
      : 0;

    if (this.elements.progressCount) {
      this.elements.progressCount.textContent = `${completed} / ${total}`;
    }

    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${percentage}%`;
    }

    if (this.elements.progressMessage) {
      this.elements.progressMessage.textContent =
        percentage === 100
          ? "All lessons completed. Excellent work!"
          : `${percentage}% completed — keep learning and practicing.`;
    }
  }

  openLesson(lessonId) {
    const lesson = TRAINING_CATEGORIES
      .flatMap(category => category.lessons)
      .find(item => item.id === lessonId);

    if (!lesson) return;

    this.navigation?.navigate("training-lesson", {
      lessonId: lesson.id,
      title: lesson.title,
      detail: lesson.detail,
      category: this.selectedCategory
    });
  }

  async markLessonCompleted(lessonId) {
    const allLessons = TRAINING_CATEGORIES.flatMap(
      category => category.lessons
    );

    if (!allLessons.some(lesson => lesson.id === lessonId)) {
      return false;
    }

    if (this.completedLessons.has(lessonId)) {
      return true;
    }

    this.completedLessons.add(lessonId);

    const profile = this.playerService?.getProfile?.();

    if (profile) {
      profile.training = profile.training || {};
      profile.training.completedLessons = [...this.completedLessons];

      if (typeof this.playerService.replaceProfile === "function") {
        await this.playerService.replaceProfile(profile);
      } else if (typeof this.playerService.updateProfile === "function") {
        await this.playerService.updateProfile(current => {
          current.training = current.training || {};
          current.training.completedLessons = [...this.completedLessons];
        });
      }
    }

    this.renderLessons();
    this.updateProgress();

    return true;
  }

  startPractice() {
    this.navigation?.navigate("game", {
      mode: "offline",
      setup: true,
      source: "training"
    });
  }

  openTactics() {
    if (this.navigation?.navigate) {
      this.navigation.navigate("puzzles", {
        category: "tactics",
        source: "training"
      });
    } else if (this.puzzleService) {
      this.navigation?.navigate("puzzles");
    }
  }

  openEndgame() {
    this.navigation?.navigate("puzzles", {
      category: "endgame",
      source: "training"
    });
  }

  playAgainstAI() {
    this.navigation?.navigate("game", {
      mode: "offline",
      setup: true,
      opponent: "ai",
      source: "training"
    });
  }

  openAnalysis() {
    this.navigation?.navigate("review", {
      source: "training"
    });
  }

  goBack() {
    if (this.navigation?.back) {
      this.navigation.back();
    } else {
      this.navigation?.navigate?.("home");
    }
  }

  destroy() {
    this.destroyed = true;
    this.loading = false;

    if (this.container) {
      this.container.innerHTML = "";
    }

    this.elements = {};
  }
}

export function createTrainingScreen(options = {}) {
  return new TrainingScreen(options);
}

/* =========================================================
   FILE 56 END — js/screens/training-screen.js
========================================================= */
      
