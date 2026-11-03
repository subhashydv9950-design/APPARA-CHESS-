
/* =========================================
   APPARA CHESS
   PART 18 — MAIN APPLICATION CONTROLLER
========================================= */

class ApparaChessApp {
  constructor() {
    this.initialized = false;
    this.currentPage = "home-page";
    this.notificationTimer = null;

    this.init();
  }

  init() {
    if (this.initialized) return;

    this.connectNavigation();
    this.connectHomeButtons();
    this.connectHeaderControls();
    this.connectKeyboard();
    this.connectGameEvents();

    this.showPage("home-page");
    this.updateHeader();
    this.hideLoadingScreen();

    this.initialized = true;

    console.log("APPARA CHESS initialized successfully.");
  }

  /* NAVIGATION */

  connectNavigation() {
    document.querySelectorAll("[data-page]").forEach(button => {
      button.addEventListener("click", () => {
        const page = button.dataset.page;
        if (page) this.showPage(page);
      });
    });

    document.querySelectorAll("[data-back]").forEach(button => {
      button.addEventListener("click", () => {
        this.showPage(button.dataset.back);
      });
    });

    this.bindClick("brand-home", () => {
      this.showPage("home-page");
    });

    this.bindClick("home-logo", () => {
      this.showPage("home-page");
    });
  }

  showPage(pageId) {
    const target = document.getElementById(pageId);

    if (!target) {
      console.warn("APPARA CHESS: Page not found:", pageId);
      return;
    }

    document.querySelectorAll(".page").forEach(page => {
      page.classList.remove("active");
    });

    target.classList.add("active");
    this.currentPage = pageId;

    document.querySelectorAll("[data-page]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === pageId
      );
    });

    window.scrollTo?.({
      top: 0,
      behavior: "smooth"
    });

    if (pageId === "profile-page") {
      window.apparaProfile?.render();
    }

    if (pageId === "tournament-page") {
      window.apparaTournament?.render();
    }

    if (pageId === "settings-page") {
      window.apparaSettings?.render();
    }

    this.closeMenu();
  }

  /* HOME BUTTONS */

  connectHomeButtons() {
    this.bindClick("offline-mode-btn", () => {
      window.apparaGame?.startOffline();
    });

    this.bindClick("computer-mode-btn", () => {
      this.showDifficultyDialog();
    });

    this.bindClick("online-mode-btn", () => {
      this.showPage("online-page");
    });

    this.bindClick("training-mode-btn", () => {
      this.showPage("training-page");
    });

    this.bindClick("tournament-mode-btn", () => {
      this.showPage("tournament-page");
    });

    this.bindClick("puzzle-mode-btn", () => {
      this.showPage("puzzle-page");
    });

    this.bindClick("leaderboard-mode-btn", () => {
      this.showPage("leaderboard-page");
    });

    this.bindClick("statistics-mode-btn", () => {
      this.showPage("profile-page");
    });

    this.bindClick("about-mode-btn", () => {
      this.showPage("about-page");
    });

    this.bindClick("start-offline-btn", () => {
      window.apparaGame?.startOffline();
    });

    this.bindClick("start-computer-btn", () => {
      this.showDifficultyDialog();
    });

    this.bindClick("open-profile-btn", () => {
      this.showPage("profile-page");
    });

    this.bindClick("open-settings-btn", () => {
      this.showPage("settings-page");
    });
  }

  /* COMPUTER DIFFICULTY */

  showDifficultyDialog() {
    const modal = document.getElementById("global-modal");

    if (!modal) {
      window.apparaGame?.startComputer("medium", "w");
      return;
    }

    modal.innerHTML = "";

    const content = document.createElement("div");
    content.className = "modal-content";

    const heading = document.createElement("h2");
    heading.textContent = "Choose AI Difficulty";

    const description = document.createElement("p");
    description.textContent =
      "Select the challenge level for your chess match.";

    const levels = [
      ["beginner", "Beginner"],
      ["easy", "Easy"],
      ["medium", "Medium"],
      ["hard", "Hard"],
      ["expert", "Expert"]
    ];

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "difficulty-options";

    levels.forEach(([value, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;

      button.addEventListener("click", () => {
        this.closeModal();
        window.apparaGame?.startComputer(value, "w");
      });

      buttonGroup.appendChild(button);
    });

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Cancel";
    close.addEventListener("click", () => this.closeModal());

    content.append(heading, description, buttonGroup, close);
    modal.appendChild(content);
    modal.classList.add("active");
  }

  /* HEADER CONTROLS */

  connectHeaderControls() {
    this.bindClick("music-toggle", () => {
      this.toggleMusic();
    });

    this.bindClick("sound-toggle", () => {
      this.toggleSound();
    });

    this.bindClick("menu-toggle", () => {
      this.toggleMenu();
    });

    this.bindClick("menu-close", () => {
      this.closeMenu();
    });

    this.bindClick("modal-close", () => {
      this.closeModal();
    });

    this.bindClick("notification-close", () => {
      this.hideNotification();
    });
  }

  toggleMusic() {
    const sound = window.apparaSound;
    if (!sound) return;

    const enabled = !window.apparaSettings?.get("musicEnabled");

    window.apparaSettings?.set("musicEnabled", enabled);

    if (!window.apparaSettings) {
      sound.toggleMusic?.();
    }

    this.updateHeader();
  }

  toggleSound() {
    const sound = window.apparaSound;
    if (!sound) return;

    const enabled = !window.apparaSettings?.get("soundEnabled");

    window.apparaSettings?.set("soundEnabled", enabled);

    if (!window.apparaSettings) {
      sound.toggleSound?.();
    }

    this.updateHeader();
  }

  updateHeader() {
    const musicButton = document.getElementById("music-toggle");
    const soundButton = document.getElementById("sound-toggle");

    const musicEnabled =
      window.apparaSettings?.get("musicEnabled") ?? true;

    const soundEnabled =
      window.apparaSettings?.get("soundEnabled") ?? true;

    if (musicButton) {
      musicButton.textContent = musicEnabled ? "♫" : "♪";
      musicButton.title = musicEnabled ? "Music On" : "Music Off";
    }

    if (soundButton) {
      soundButton.textContent = soundEnabled ? "🔊" : "🔇";
      soundButton.title = soundEnabled ? "Sound On" : "Sound Off";
    }
  }

  /* MENU */

  toggleMenu() {
    const menu = document.getElementById("side-menu");
    if (!menu) return;

    menu.classList.toggle("active");
    document.body.classList.toggle(
      "menu-open",
      menu.classList.contains("active")
    );
  }

  closeMenu() {
    const menu = document.getElementById("side-menu");

    if (menu) menu.classList.remove("active");

    document.body.classList.remove("menu-open");
  }

  /* GAME EVENTS */

  connectGameEvents() {
    document.addEventListener("click", event => {
      const link = event.target.closest("[data-open-page]");

      if (link) {
        this.showPage(link.dataset.openPage);
      }
    });

    window.addEventListener("online", () => {
      this.showNotification("Internet connection restored");
    });

    window.addEventListener("offline", () => {
      this.showNotification("You are offline");
    });
  }

  /* KEYBOARD SHORTCUTS */

  connectKeyboard() {
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        this.closeMenu();
        this.closeModal();
      }

      if (
        event.key.toLowerCase() === "f" &&
        this.currentPage === "game-page"
      ) {
        window.apparaGame?.flipBoard();
      }
    });
  }

  /* MODAL */

  closeModal() {
    const modal = document.getElementById("global-modal");

    if (modal) {
      modal.classList.remove("active");
      modal.innerHTML = "";
    }
  }

  /* NOTIFICATIONS */

  showNotification(message, duration = 2800) {
    const notification = document.getElementById("notification");

    if (!notification) {
      console.log("[APPARA]", message);
      return;
    }

    const text = notification.querySelector(
      ".notification-text"
    );

    if (text) {
      text.textContent = message;
    } else {
      notification.textContent = message;
    }

    notification.classList.add("active");

    clearTimeout(this.notificationTimer);

    this.notificationTimer = setTimeout(() => {
      this.hideNotification();
    }, duration);
  }

  hideNotification() {
    const notification = document.getElementById("notification");

    if (notification) {
      notification.classList.remove("active");
    }

    clearTimeout(this.notificationTimer);
  }

  /* LOADING SCREEN */

  hideLoadingScreen() {
    const loading = document.getElementById("loading-screen");

    if (!loading) return;

    loading.classList.add("loading-hidden");

    setTimeout(() => {
      loading.style.display = "none";
    }, 500);
  }

  /* UTILITIES */

  bindClick(id, callback) {
    const element = document.getElementById(id);

    if (element) {
      element.addEventListener("click", callback);
    }
  }
}

/* START APPLICATION */

window.apparaApp = new ApparaChessApp();

/* PART 18 END */
    
