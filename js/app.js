/* =========================================================
   APPARA CHESS — MAIN APPLICATION CONTROLLER
   PART 21P — PART 1/3
   File: js/app.js
========================================================= */

window.APPARA_APP = (function () {
  "use strict";

  const state = {
    initialized: false,
    currentPage: "home",
    menuOpen: false,
    modalOpen: false,
    notificationTimer: null,
    elements: {},
    eventHandlers: []
  };

  /* ---------------------------------------------------------
     HELPERS
  --------------------------------------------------------- */

  function getElement(id) {
    return document.getElementById(id);
  }

  function getAll(selector, parent) {
    return Array.from(
      (parent || document).querySelectorAll(selector)
    );
  }

  function safeCall(object, method, ...args) {
    try {
      if (object && typeof object[method] === "function") {
        return object[method](...args);
      }
    } catch (error) {
      console.error(
        "[APPARA APP] " + method + " failed:",
        error
      );
    }

    return undefined;
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ---------------------------------------------------------
     ELEMENT CACHE
  --------------------------------------------------------- */

  function cacheElements() {
    state.elements = {
      app: getElement("app"),
      loadingScreen: getElement("loading-screen"),

      menuToggle: getElement("menu-toggle"),
      sideMenu: getElement("side-menu"),
      closeMenu: getElement("close-menu"),
      menuOverlay: getElement("menu-overlay"),

      modal: getElement("global-modal"),
      modalClose: getElement("modal-close"),
      modalContent: getElement("modal-content"),

      notification: getElement("notification"),

      pageElements: getAll("[data-page]"),
      pages: getAll(".page"),

      bottomNav: getAll("[data-page]")
    };

    return state.elements;
  }

  /* ---------------------------------------------------------
     PAGE NAVIGATION
  --------------------------------------------------------- */

  function normalizePageName(pageName) {
    return String(pageName || "home")
      .replace(/^page-/, "")
      .trim()
      .toLowerCase();
  }

  function showPage(pageName, options) {
    const target = normalizePageName(pageName);
    const settings = options || {};

    const targetElement = getElement("page-" + target);

    if (!targetElement) {
      console.warn(
        "[APPARA APP] Page not found:",
        target
      );
      return false;
    }

    getAll(".page").forEach(function (page) {
      page.classList.remove("active");
      page.setAttribute("aria-hidden", "true");
    });

    targetElement.classList.add("active");
    targetElement.setAttribute("aria-hidden", "false");

    getAll("[data-page]").forEach(function (button) {
      const buttonPage = normalizePageName(
        button.getAttribute("data-page")
      );

      button.classList.toggle(
        "active",
        buttonPage === target
      );

      if (buttonPage === target) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    state.currentPage = target;

    if (settings.closeMenu !== false) {
      closeMenu();
    }

    if (settings.scrollTop !== false) {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }

    handlePageEntry(target);

    return true;
  }

  /* ---------------------------------------------------------
     PAGE ENTRY ACTIONS
  --------------------------------------------------------- */

  function handlePageEntry(pageName) {
    switch (pageName) {
      case "profile":
        safeCall(window.APPARA_PROFILE, "render");
        break;

      case "puzzles":
        safeCall(window.APPARA_PUZZLES, "renderPuzzle");
        break;

      case "tournament":
        safeCall(window.APPARA_TOURNAMENT, "render");
        break;

      case "leaderboard":
        safeCall(window.APPARA_PROFILE, "renderLeaderboard");
        break;

      case "settings":
        safeCall(window.APPARA_SETTINGS, "refresh");
        break;

      case "game":
        safeCall(window.APPARA_GAME, "updateGameDisplay");
        break;
    }
  }

  /* ---------------------------------------------------------
     MENU CONTROLS
  --------------------------------------------------------- */

  function openMenu() {
    const menu = state.elements.sideMenu;
    const overlay = state.elements.menuOverlay;

    if (!menu) return false;

    menu.classList.add("open");
    menu.setAttribute("aria-hidden", "false");

    if (overlay) {
      overlay.classList.add("active");
      overlay.setAttribute("aria-hidden", "false");
    }

    state.menuOpen = true;

    return true;
  }

  function closeMenu() {
    const menu = state.elements.sideMenu;
    const overlay = state.elements.menuOverlay;

    if (menu) {
      menu.classList.remove("open");
      menu.setAttribute("aria-hidden", "true");
    }

    if (overlay) {
      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
    }

    state.menuOpen = false;

    return true;
  }

  function toggleMenu() {
    return state.menuOpen
      ? closeMenu()
      : openMenu();
  }

/* =========================================================
   APPARA CHESS — MAIN APPLICATION CONTROLLER
   PART 21P — PART 1/3 END
   NEXT: PART 21P — PART 2/3
========================================================= */
   /* =========================================================
   APPARA CHESS — MAIN APPLICATION CONTROLLER
   PART 21P — PART 2/3
========================================================= */

/* ---------------------------------------------------------
   MODAL SYSTEM
--------------------------------------------------------- */

function openModal(title, content) {
  const modal = state.elements.modal;
  const modalContent = state.elements.modalContent;

  if (!modal || !modalContent) {
    console.warn("[APPARA APP] Modal elements not found");
    return false;
  }

  modalContent.innerHTML = `
    <div class="modal-heading">
      <h2>${escapeHTML(title || "APPARA CHESS")}</h2>
    </div>
    <div class="modal-body">
      ${String(content || "")}
    </div>
  `;

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");

  state.modalOpen = true;

  return true;
}

function closeModal() {
  const modal = state.elements.modal;

  if (!modal) return false;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");

  state.modalOpen = false;

  return true;
}

/* ---------------------------------------------------------
   NOTIFICATION SYSTEM
--------------------------------------------------------- */

function showNotification(message, type) {
  const notification = state.elements.notification;

  if (!notification) {
    console.info("[APPARA]", message);
    return false;
  }

  if (state.notificationTimer) {
    clearTimeout(state.notificationTimer);
    state.notificationTimer = null;
  }

  notification.textContent = String(message || "");
  notification.className = "notification";

  if (type) {
    notification.classList.add(
      "notification-" + String(type)
    );
  }

  notification.classList.add("show");
  notification.setAttribute("aria-live", "polite");

  const duration =
    window.APPARA_CONFIG &&
    Number(window.APPARA_CONFIG.notificationDuration)
      ? Number(window.APPARA_CONFIG.notificationDuration)
      : 2800;

  state.notificationTimer = window.setTimeout(function () {
    notification.classList.remove("show");
    state.notificationTimer = null;
  }, duration);

  safeCall(window.APPARA_SOUND, "notification");

  return true;
}

/* ---------------------------------------------------------
   GLOBAL CLICK HANDLERS
--------------------------------------------------------- */

function handleDocumentClick(event) {
  const pageButton = event.target.closest("[data-page]");

  if (pageButton) {
    const pageName = pageButton.getAttribute("data-page");

    if (pageName) {
      showPage(pageName);
    }

    return;
  }

  const modeButton = event.target.closest("[data-mode]");

  if (modeButton) {
    const mode = modeButton.getAttribute("data-mode");

    if (mode) {
      startSelectedMode(mode);
    }

    return;
  }

  const closeButton = event.target.closest("[data-close-modal]");

  if (closeButton) {
    closeModal();
  }
}

/* ---------------------------------------------------------
   GAME MODE START
--------------------------------------------------------- */

function startSelectedMode(mode) {
  if (!window.APPARA_GAME) {
    showNotification("Game controller is not ready", "error");
    return false;
  }

  const validModes = [
    "offline",
    "computer",
    "online",
    "training"
  ];

  if (!validModes.includes(mode)) {
    showNotification("Invalid game mode", "error");
    return false;
  }

  if (mode === "online") {
    showPage("online");
    showNotification(
      "Create or join an online room to play",
      "info"
    );
    return true;
  }

  if (mode === "training") {
    showPage("training");
    return true;
  }

  const options = {
    mode: mode,
    difficulty:
      safeCall(window.APPARA_SETTINGS, "getSetting", "difficulty")
      || "medium"
  };

  const started = safeCall(
    window.APPARA_GAME,
    "startGame",
    options
  );

  if (started === false || started === undefined) {
    showNotification("Could not start the game", "error");
    return false;
  }

  showPage("game");

  safeCall(window.APPARA_SOUND, "gameStart");

  return true;
}

/* ---------------------------------------------------------
   QUICK PLAY
--------------------------------------------------------- */

function handleQuickPlay() {
  return startSelectedMode("computer");
}

/* ---------------------------------------------------------
   EVENT BINDING HELPERS
--------------------------------------------------------- */

function addEvent(element, eventName, handler) {
  if (!element) return;

  element.addEventListener(eventName, handler);

  state.eventHandlers.push({
    element: element,
    eventName: eventName,
    handler: handler
  });
}

function bindEvents() {
  const elements = state.elements;

  addEvent(
    elements.menuToggle,
    "click",
    toggleMenu
  );

  addEvent(
    elements.closeMenu,
    "click",
    closeMenu
  );

  addEvent(
    elements.menuOverlay,
    "click",
    closeMenu
  );

  addEvent(
    elements.modalClose,
    "click",
    closeModal
  );

  addEvent(
    elements.modal,
    "click",
    function (event) {
      if (event.target === elements.modal) {
        closeModal();
      }
    }
  );

  addEvent(
    document,
    "click",
    handleDocumentClick
  );

  const quickPlayButton = getElement("quick-play-btn");

  addEvent(
    quickPlayButton,
    "click",
    handleQuickPlay
  );

  addEvent(
    document,
    "keydown",
    function (event) {
      if (event.key === "Escape") {
        if (state.modalOpen) {
          closeModal();
        } else if (state.menuOpen) {
          closeMenu();
        }
      }
    }
  );
}

/* ---------------------------------------------------------
   REMOVE EVENT LISTENERS
--------------------------------------------------------- */

function removeEvents() {
  state.eventHandlers.forEach(function (item) {
    item.element.removeEventListener(
      item.eventName,
      item.handler
    );
  });

  state.eventHandlers = [];
}

/* =========================================================
   APPARA CHESS — MAIN APPLICATION CONTROLLER
   PART 21P — PART 2/3 END
   NEXT: PART 21P — PART 3/3
========================================================= */

   /* =========================================================
   APPARA CHESS — MAIN APPLICATION CONTROLLER
   PART 21P — PART 3/3
========================================================= */

/* ---------------------------------------------------------
   INITIALIZE APPLICATION MODULES
--------------------------------------------------------- */

function initializeModules() {
  const modules = [
    ["sound", window.APPARA_SOUND],
    ["board", window.APPARA_BOARD],
    ["profile", window.APPARA_PROFILE],
    ["puzzles", window.APPARA_PUZZLES],
    ["tournament", window.APPARA_TOURNAMENT],
    ["settings", window.APPARA_SETTINGS],
    ["game", window.APPARA_GAME],
    ["online", window.APPARA_ONLINE]
  ];

  const results = {};

  modules.forEach(function (item) {
    const name = item[0];
    const module = item[1];

    if (!module || typeof module.init !== "function") {
      results[name] = false;

      console.warn(
        "[APPARA APP] Module unavailable:",
        name
      );

      return;
    }

    try {
      const result = module.init();

      results[name] = result !== false;

    } catch (error) {
      results[name] = false;

      console.error(
        "[APPARA APP] Module initialization failed:",
        name,
        error
      );
    }
  });

  return results;
}

/* ---------------------------------------------------------
   LOADING SCREEN
--------------------------------------------------------- */

function hideLoadingScreen() {
  const loading = state.elements.loadingScreen;

  if (loading) {
    loading.classList.add("hidden");
    loading.setAttribute("aria-hidden", "true");
  }

  if (state.elements.app) {
    state.elements.app.classList.add("ready");
  }
}

/* ---------------------------------------------------------
   INITIAL HOME DISPLAY
--------------------------------------------------------- */

function initializeHome() {
  showPage("home", {
    closeMenu: true,
    scrollTop: false
  });

  safeCall(window.APPARA_PROFILE, "render");

  const profile = safeCall(
    window.APPARA_PROFILE,
    "getProfile"
  );

  if (profile && profile.name) {
    const nameElement = getElement("header-player-name");

    if (nameElement) {
      nameElement.textContent = profile.name;
    }
  }
}

/* ---------------------------------------------------------
   APPLICATION STARTUP
--------------------------------------------------------- */

function init() {
  if (state.initialized) {
    return true;
  }

  cacheElements();

  if (!state.elements.app) {
    console.error(
      "[APPARA APP] Main app element #app was not found"
    );

    return false;
  }

  bindEvents();

  const moduleResults = initializeModules();

  initializeHome();

  hideLoadingScreen();

  state.initialized = true;

  console.log("[APPARA CHESS] Application initialized");
  console.table(moduleResults);

  return true;
}

/* ---------------------------------------------------------
   APPLICATION STATE
--------------------------------------------------------- */

function getState() {
  return {
    initialized: state.initialized,
    currentPage: state.currentPage,
    menuOpen: state.menuOpen,
    modalOpen: state.modalOpen
  };
}

/* ---------------------------------------------------------
   CLEANUP
--------------------------------------------------------- */

function destroy() {
  removeEvents();

  if (state.notificationTimer) {
    clearTimeout(state.notificationTimer);
    state.notificationTimer = null;
  }

  closeMenu();
  closeModal();

  state.initialized = false;
  state.elements = {};

  return true;
}

/* ---------------------------------------------------------
   PUBLIC API
--------------------------------------------------------- */

return Object.freeze({
  init: init,

  showPage: showPage,
  openMenu: openMenu,
  closeMenu: closeMenu,
  toggleMenu: toggleMenu,

  openModal: openModal,
  closeModal: closeModal,

  showNotification: showNotification,

  startSelectedMode: startSelectedMode,
  handleQuickPlay: handleQuickPlay,

  getState: getState,
  destroy: destroy
});

})();

/* ---------------------------------------------------------
   AUTOMATIC STARTUP
--------------------------------------------------------- */

(function () {
  function startApp() {
    window.APPARA_APP.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startApp,
      { once: true }
    );
  } else {
    startApp();
  }
})();

/* =========================================================
   APPARA CHESS — MAIN APPLICATION CONTROLLER
   PART 21P — PART 3/3 END
   FILE COMPLETE
========================================================= */
