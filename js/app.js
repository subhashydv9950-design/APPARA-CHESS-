
/* =========================================================
   APPARA CHESS — MAIN APPLICATION
   PART 20 — js/app.js
   ========================================================= */

window.APPARA_APP = (function () {
  "use strict";

  let initialized = false;
  let currentPage = "home";
  let notificationCounter = 0;

  /* ---------- ELEMENT HELPERS ---------- */

  function getElement(id) {
    return document.getElementById(id);
  }

  function getAll(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  /* ---------- NOTIFICATIONS ---------- */

  function notify(message, type) {
    const container = getElement("notification-container");

    if (!container) {
      console.info("[APPARA CHESS]", message);
      return;
    }

    const notification = document.createElement("div");
    const id = "app-notification-" + (++notificationCounter);

    notification.id = id;
    notification.className =
      "notification " + (type || "info");

    notification.setAttribute("role", "status");
    notification.textContent = String(message);

    container.appendChild(notification);

    const duration =
      (window.APPARA_CONFIG &&
        Number(window.APPARA_CONFIG.notificationDuration)) ||
      3000;

    window.setTimeout(function () {
      const item = getElement(id);

      if (item) {
        item.classList.add("notification-hide");

        window.setTimeout(function () {
          if (item.parentNode) item.remove();
        }, 250);
      }
    }, duration);
  }

  /* ---------- PAGE NAVIGATION ---------- */

  function normalizePage(page) {
    const aliases = {
      home: "home",
      game: "game",
      play: "game",
      online: "online",
      training: "training",
      puzzles: "puzzles",
      puzzle: "puzzles",
      tournament: "tournament",
      tournaments: "tournament",
      leaderboard: "leaderboard",
      profile: "profile",
      settings: "settings",
      about: "about"
    };

    return aliases[String(page || "").toLowerCase()] || "home";
  }

  function navigate(page) {
    const target = normalizePage(page);
    const pageElement = getElement("page-" + target);

    if (!pageElement) {
      console.warn("APPARA page not found:", target);
      return false;
    }

    currentPage = target;

    getAll(".page").forEach(function (element) {
      element.classList.toggle(
        "active",
        element.id === "page-" + target
      );

      element.setAttribute(
        "aria-hidden",
        element.id === "page-" + target ? "false" : "true"
      );
    });

    getAll("[data-page]").forEach(function (element) {
      const value = normalizePage(element.dataset.page);

      element.classList.toggle("active", value === target);

      if (value === target) {
        element.setAttribute("aria-current", "page");
      } else {
        element.removeAttribute("aria-current");
      }
    });

    closeMenu();

    if (target === "profile" && window.APPARA_PROFILE) {
      window.APPARA_PROFILE.render();
    }

    if (target === "puzzles" && window.APPARA_PUZZLES) {
      window.APPARA_PUZZLES.init();
    }

    if (target === "tournament" && window.APPARA_TOURNAMENT) {
      window.APPARA_TOURNAMENT.render();
    }

    if (target === "settings" && window.APPARA_SETTINGS) {
      window.APPARA_SETTINGS.syncControls();
    }

    return true;
  }

  function getCurrentPage() {
    return currentPage;
  }

  /* ---------- SIDE MENU ---------- */

  function openMenu() {
    const menu = getElement("side-menu");
    const overlay = getElement("menu-overlay");

    if (menu) {
      menu.classList.add("open");
      menu.setAttribute("aria-hidden", "false");
    }

    if (overlay) {
      overlay.classList.add("active");
      overlay.setAttribute("aria-hidden", "false");
    }

    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    const menu = getElement("side-menu");
    const overlay = getElement("menu-overlay");

    if (menu) {
      menu.classList.remove("open");
      menu.setAttribute("aria-hidden", "true");
    }

    if (overlay) {
      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
    }

    document.body.classList.remove("menu-open");
  }

  function toggleMenu() {
    const menu = getElement("side-menu");

    if (menu && menu.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  /* ---------- MODAL SYSTEM ---------- */

  function openModal(title, content) {
    const modal = getElement("global-modal");
    const modalContent = getElement("modal-content");

    if (!modal || !modalContent) {
      notify("Modal is unavailable.", "error");
      return false;
    }

    modalContent.innerHTML = "";

    if (title) {
      const heading = document.createElement("h2");
      heading.textContent = title;
      modalContent.appendChild(heading);
    }

    if (content instanceof Node) {
      modalContent.appendChild(content);
    } else {
      const body = document.createElement("div");
      body.textContent = String(content || "");
      modalContent.appendChild(body);
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    return true;
  }

  function closeModal() {
    const modal = getElement("global-modal");

    if (!modal) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }

  /* ---------- ABOUT ---------- */

  function showAbout() {
    const wrapper = document.createElement("div");
    wrapper.className = "about-modal-content";

    const description = document.createElement("p");
    description.textContent =
      "APPARA CHESS is a chess experience designed for players " +
      "who enjoy learning, competing and improving.";

    const developer = document.createElement("h3");
    developer.textContent = "Developer & Founder";

    const name = document.createElement("p");
    name.textContent = "Subhash Yadav";

    const instagram = document.createElement("p");
    instagram.textContent = "Instagram: @iamsubhash177";

    const email = document.createElement("p");
    email.textContent = "Email: subhash.ydv9950@gmail.com";

    const version = document.createElement("small");
    version.textContent = "APPARA CHESS • Version 1.0.0";

    wrapper.appendChild(description);
    wrapper.appendChild(developer);
    wrapper.appendChild(name);
    wrapper.appendChild(instagram);
    wrapper.appendChild(email);
    wrapper.appendChild(version);

    return openModal("About APPARA CHESS", wrapper);
  }

  /* ---------- EVENT BINDING ---------- */

  function bindMenuEvents() {
    const menuButton = getElement("menu-toggle");
    const closeButton = getElement("close-menu");
    const overlay = getElement("menu-overlay");

    if (menuButton && !menuButton.dataset.appBound) {
      menuButton.dataset.appBound = "true";
      menuButton.addEventListener("click", toggleMenu);
    }

    if (closeButton && !closeButton.dataset.appBound) {
      closeButton.dataset.appBound = "true";
      closeButton.addEventListener("click", closeMenu);
    }

    if (overlay && !overlay.dataset.appBound) {
      overlay.dataset.appBound = "true";
      overlay.addEventListener("click", closeMenu);
    }
  }

  function bindNavigationEvents() {
    getAll("[data-page]").forEach(function (element) {
      if (element.dataset.appNavigationBound) return;

      element.dataset.appNavigationBound = "true";

      element.addEventListener("click", function (event) {
        const target = element.dataset.page;

        if (!target) return;

        event.preventDefault();
        navigate(target);
      });
    });

    getAll("[data-navigate]").forEach(function (element) {
      if (element.dataset.appNavigateBound) return;

      element.dataset.appNavigateBound = "true";

      element.addEventListener("click", function () {
        navigate(element.dataset.navigate);
      });
    });
  }

  function bindModalEvents() {
    const closeButton = getElement("modal-close");
    const modal = getElement("global-modal");

    if (closeButton && !closeButton.dataset.appBound) {
      closeButton.dataset.appBound = "true";
      closeButton.addEventListener("click", closeModal);
    }

    if (modal && !modal.dataset.appBound) {
      modal.dataset.appBound = "true";

      modal.addEventListener("click", function (event) {
        if (event.target === modal) {
          closeModal();
        }
      });
    }
  }

  function bindAboutEvents() {
    getAll("[data-about]").forEach(function (element) {
      if (element.dataset.aboutBound) return;

      element.dataset.aboutBound = "true";

      element.addEventListener("click", showAbout);
    });
  }

  function bindKeyboardEvents() {
    if (document.documentElement.dataset.keyboardBound) return;

    document.documentElement.dataset.keyboardBound = "true";

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
        closeModal();
      }
    });
  }

  /* ---------- MODULE INITIALIZATION ---------- */

  function initializeModules() {
    try {
      if (window.APPARA_FIREBASE) {
        window.APPARA_FIREBASE.initialize();
      }
    } catch (error) {
      console.warn("Firebase initialization skipped:", error);
    }

    try {
      if (window.APPARA_ENGINE) {
        window.APPARA_ENGINE.createGame();
      }

      if (window.APPARA_BOARD) {
        window.APPARA_BOARD.init();
      }

      if (window.APPARA_SOUND) {
        window.APPARA_SOUND.init();
      }

      if (window.APPARA_AI) {
        window.APPARA_AI.init();
      }

      if (window.APPARA_ONLINE) {
        window.APPARA_ONLINE.init();
      }

      if (window.APPARA_MULTIPLAYER) {
        window.APPARA_MULTIPLAYER.init();
      }

      if (window.APPARA_PROFILE) {
        window.APPARA_PROFILE.init();
      }

      if (window.APPARA_PUZZLES) {
        window.APPARA_PUZZLES.init();
      }

      if (window.APPARA_TOURNAMENT) {
        window.APPARA_TOURNAMENT.init();
      }

      if (window.APPARA_SETTINGS) {
        window.APPARA_SETTINGS.init();
      }

      if (window.APPARA_GAME) {
        window.APPARA_GAME.init();
      }
    } catch (error) {
      console.error("Module initialization error:", error);
      notify("Some game features could not initialize.", "error");
    }
  }

  /* ---------- LOADING SCREEN ---------- */

  function hideLoadingScreen() {
    const loading = getElement("loading-screen");
    const app = getElement("app");

    if (loading) {
      loading.classList.add("hidden");
      loading.setAttribute("aria-hidden", "true");
    }

    if (app) {
      app.classList.add("ready");
    }
  }

  /* ---------- INITIALIZATION ---------- */

  function init() {
    if (initialized) return true;

    bindMenuEvents();
    bindNavigationEvents();
    bindModalEvents();
    bindAboutEvents();
    bindKeyboardEvents();

    initializeModules();

    navigate("home");
    hideLoadingScreen();

    initialized = true;

    console.info("APPARA CHESS initialized successfully.");

    return true;
  }

  /* ---------- CLEANUP ---------- */

  function destroy() {
    closeMenu();
    closeModal();

    if (window.APPARA_GAME) {
      window.APPARA_GAME.destroy();
    }

    if (window.APPARA_BOARD) {
      window.APPARA_BOARD.destroy();
    }

    if (window.APPARA_TIMER) {
      window.APPARA_TIMER.destroy();
    }

    if (window.APPARA_SOUND) {
      window.APPARA_SOUND.destroy();
    }

    initialized = false;
  }

  /* ---------- PUBLIC API ---------- */

  return {
    init: init,
    notify: notify,
    navigate: navigate,
    getCurrentPage: getCurrentPage,
    openMenu: openMenu,
    closeMenu: closeMenu,
    toggleMenu: toggleMenu,
    openModal: openModal,
    closeModal: closeModal,
    showAbout: showAbout,
    destroy: destroy
  };
})();

/* =========================================================
   APPARA CHESS — MAIN APPLICATION
   PART 20 END
   ========================================================= */

/* ---------- START APPLICATION ---------- */

(function () {
  "use strict";

  function startApp() {
    if (window.APPARA_APP) {
      window.APPARA_APP.init();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp, {
      once: true
    });
  } else {
    startApp();
  }
})();
                     
