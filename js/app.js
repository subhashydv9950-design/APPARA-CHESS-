
/* =========================================================
   APPARA CHESS
   PART 21F — APP CONTROLLER INTEGRATION
   PART 1/3
   ========================================================= */

window.APPARA_APP = (function () {
    "use strict";

    /* -----------------------------------------------------
       APPLICATION STATE
    ----------------------------------------------------- */

    let initialized = false;
    let initializationStarted = false;
    let currentPage = "home";
    let notificationTimer = null;

    /* -----------------------------------------------------
       DOM HELPERS
    ----------------------------------------------------- */

    function getElement(id) {
        return document.getElementById(id);
    }

    function getAll(selector) {
        return Array.from(
            document.querySelectorAll(selector)
        );
    }

    function setText(id, value) {
        const element = getElement(id);

        if (element) {
            element.textContent = String(value);
        }
    }

    /* -----------------------------------------------------
       APPLICATION NOTIFICATIONS
    ----------------------------------------------------- */

    function notify(message, type) {
        const notification = getElement("notification");

        if (!notification) {
            console.log(
                "[APPARA CHESS]",
                message
            );

            return;
        }

        if (notificationTimer) {
            window.clearTimeout(notificationTimer);
            notificationTimer = null;
        }

        notification.textContent = String(message);

        notification.className =
            "notification show " +
            (type || "info");

        const duration =
            window.APPARA_CONFIG &&
            Number(
                window.APPARA_CONFIG.notificationDuration
            ) > 0
                ? Number(
                    window.APPARA_CONFIG.notificationDuration
                )
                : 3000;

        notificationTimer = window.setTimeout(
            function () {
                notification.classList.remove("show");
                notificationTimer = null;
            },
            duration
        );
    }

    /* -----------------------------------------------------
       PAGE NAVIGATION
    ----------------------------------------------------- */

    function navigate(pageName) {
        const validPages = [
            "home",
            "game",
            "online",
            "training",
            "puzzles",
            "tournament",
            "leaderboard",
            "profile",
            "settings",
            "about"
        ];

        if (!validPages.includes(pageName)) {
            console.warn(
                "APPARA: Invalid page:",
                pageName
            );

            return false;
        }

        const targetId = "page-" + pageName;
        const targetPage = getElement(targetId);

        if (!targetPage) {
            console.warn(
                "APPARA: Page element not found:",
                targetId
            );

            return false;
        }

        currentPage = pageName;

        /* Hide all application pages. */
        getAll(".page").forEach(function (page) {
            page.classList.toggle(
                "active",
                page.id === targetId
            );
        });

        /* Update navigation buttons. */
        getAll("[data-page]").forEach(
            function (button) {
                const buttonPage =
                    button.getAttribute("data-page");

                if (buttonPage) {
                    button.classList.toggle(
                        "active",
                        buttonPage === pageName
                    );

                    if (
                        button.tagName === "BUTTON" ||
                        button.getAttribute("role") === "button"
                    ) {
                        button.setAttribute(
                            "aria-current",
                            buttonPage === pageName
                                ? "page"
                                : "false"
                        );
                    }
                }
            }
        );

        closeMenu();

        /* Refresh relevant page content. */
        if (pageName === "profile") {
            const profile = window.APPARA_PROFILE;

            if (profile && profile.getProfile) {
                const data = profile.getProfile();

                if (data) {
                    setText(
                        "profile-name",
                        data.name || "Guest Player"
                    );

                    setText(
                        "profile-id",
                        data.id || "AP-PLAYER"
                    );

                    setText(
                        "profile-rating",
                        data.rating || 1000
                    );
                }
            }
        }

        if (pageName === "tournament") {
            const tournament =
                window.APPARA_TOURNAMENT;

            if (tournament && tournament.render) {
                tournament.render();
            }
        }

        if (pageName === "puzzles") {
            const puzzles = window.APPARA_PUZZLES;

            if (puzzles && puzzles.getState) {
                const state = puzzles.getState();

                if (state) {
                    setText(
                        "puzzles-solved",
                        state.solvedCount || 0
                    );
                }
            }
        }

        return true;
    }

    function getCurrentPage() {
        return currentPage;
    }

    /* -----------------------------------------------------
       SIDE MENU
    ----------------------------------------------------- */

    function openMenu() {
        const menu = getElement("side-menu");
        const overlay = getElement("menu-overlay");

        if (menu) {
            menu.classList.add("open");
            menu.setAttribute("aria-hidden", "false");
        }

        if (overlay) {
            overlay.classList.add("active");
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
        }

        document.body.classList.remove("menu-open");
    }

    function toggleMenu() {
        const menu = getElement("side-menu");

        if (!menu) return;

        if (menu.classList.contains("open")) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    /* -----------------------------------------------------
       LOADING SCREEN
    ----------------------------------------------------- */

    function hideLoadingScreen() {
        const loadingScreen = getElement(
            "loading-screen"
        );

        const app = getElement("app");

        if (loadingScreen) {
            loadingScreen.classList.add("hidden");
        }

        if (app) {
            app.classList.add("ready");
        }
    }

    function showLoadingScreen() {
        const loadingScreen = getElement(
            "loading-screen"
        );

        const app = getElement("app");

        if (loadingScreen) {
            loadingScreen.classList.remove("hidden");
        }

        if (app) {
            app.classList.remove("ready");
        }
    }

/* =========================================================
   PART 21F — PART 1/3 END
   CONTINUE IN SAME FILE WITH PART 2/3
   ========================================================= */
       
/* =========================================================
   APPARA CHESS
   PART 21F — APP CONTROLLER INTEGRATION
   PART 2/3
   ========================================================= */

    /* -----------------------------------------------------
       MODAL SYSTEM
    ----------------------------------------------------- */

    function openModal(title, content) {
        const modal = getElement("global-modal");
        const modalContent = getElement("modal-content");

        if (!modal || !modalContent) {
            notify("Modal उपलब्ध नहीं है।", "error");
            return false;
        }

        let heading = modal.querySelector(
            "[data-modal-title]"
        );

        if (!heading) {
            heading = document.createElement("h2");
            heading.setAttribute("data-modal-title", "");
            modalContent.prepend(heading);
        }

        heading.textContent = title || "APPARA CHESS";

        let body = modal.querySelector(
            "[data-modal-body]"
        );

        if (!body) {
            body = document.createElement("div");
            body.setAttribute("data-modal-body", "");
            modalContent.appendChild(body);
        }

        body.replaceChildren();

        if (content instanceof Node) {
            body.appendChild(content);
        } else {
            body.innerHTML = String(content || "");
        }

        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal-open");

        return true;
    }

    function closeModal() {
        const modal = getElement("global-modal");

        if (!modal) return false;

        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");

        document.body.classList.remove("modal-open");

        return true;
    }

    /* -----------------------------------------------------
       ABOUT SECTION
    ----------------------------------------------------- */

    function renderAbout() {
        const developerName = "Subhash Yadav";
        const instagram = "iamsubhash177";
        const email = "subhash.ydv9950@gmail.com";

        setText("about-developer", developerName);
        setText("about-instagram", "@" + instagram);
        setText("about-email", email);

        const instagramLink = getElement(
            "about-instagram-link"
        );

        if (instagramLink) {
            instagramLink.href =
                "https://www.instagram.com/" +
                instagram + "/";

            instagramLink.target = "_blank";
            instagramLink.rel = "noopener noreferrer";
        }

        const emailLink = getElement(
            "about-email-link"
        );

        if (emailLink) {
            emailLink.href = "mailto:" + email;
        }
    }

    /* -----------------------------------------------------
       EVENT BINDINGS
    ----------------------------------------------------- */

    function bindEvents() {
        const menuToggle = getElement("menu-toggle");

        if (menuToggle) {
            menuToggle.addEventListener(
                "click",
                toggleMenu
            );
        }

        const closeMenuButton = getElement(
            "close-menu"
        );

        if (closeMenuButton) {
            closeMenuButton.addEventListener(
                "click",
                closeMenu
            );
        }

        const overlay = getElement("menu-overlay");

        if (overlay) {
            overlay.addEventListener(
                "click",
                closeMenu
            );
        }

        const modalClose = getElement("modal-close");

        if (modalClose) {
            modalClose.addEventListener(
                "click",
                closeModal
            );
        }

        /* Close modal when clicking outside its content. */
        const modal = getElement("global-modal");

        if (modal) {
            modal.addEventListener(
                "click",
                function (event) {
                    if (event.target === modal) {
                        closeModal();
                    }
                }
            );
        }

        /* Navigation links and buttons. */
        getAll("[data-page]").forEach(
            function (button) {
                button.addEventListener(
                    "click",
                    function () {
                        const pageName =
                            button.getAttribute("data-page");

                        if (pageName) {
                            navigate(pageName);
                        }
                    }
                );
            }
        );

        /* About page links. */
        const aboutButton = getElement(
            "about-menu-btn"
        );

        if (aboutButton) {
            aboutButton.addEventListener(
                "click",
                function () {
                    navigate("about");
                }
            );
        }

        /* Keyboard shortcuts. */
        document.addEventListener(
            "keydown",
            function (event) {
                if (event.key === "Escape") {
                    closeMenu();
                    closeModal();
                }

                if (
                    event.key === "F1" &&
                    !event.ctrlKey &&
                    !event.altKey
                ) {
                    event.preventDefault();
                    navigate("home");
                }
            }
        );

        /* Prevent accidental form submission reload. */
        document
            .querySelectorAll(
                "form[data-app-form]"
            )
            .forEach(function (form) {
                form.addEventListener(
                    "submit",
                    function (event) {
                        event.preventDefault();
                    }
                );
            });
    }

    /* -----------------------------------------------------
       APPLICATION VISIBILITY
    ----------------------------------------------------- */

    function bindVisibilityEvents() {
        document.addEventListener(
            "visibilitychange",
            function () {
                if (
                    document.hidden &&
                    window.APPARA_TIMER &&
                    window.APPARA_TIMER.isActive &&
                    window.APPARA_TIMER.isActive()
                ) {
                    /*
                     * Do not silently pause a running game.
                     * The timer remains authoritative.
                     */
                }
            }
        );

        window.addEventListener(
            "beforeunload",
            function () {
                if (
                    window.APPARA_SOUND &&
                    window.APPARA_SOUND.stopMusic
                ) {
                    window.APPARA_SOUND.stopMusic();
                }
            }
        );
    }

    /* -----------------------------------------------------
       INITIALIZATION HELPERS
    ----------------------------------------------------- */

    function initializeModule(name, module, method) {
        if (!module) {
            console.warn(
                "APPARA: Module missing:",
                name
            );

            return false;
        }

        const initMethod = method || "init";

        if (typeof module[initMethod] !== "function") {
            console.warn(
                "APPARA: Init method missing:",
                name
            );

            return false;
        }

        try {
            module[initMethod]();

            return true;
        } catch (error) {
            console.error(
                "APPARA: Initialization failed:",
                name,
                error
            );

            notify(
                name + " initialize नहीं हो पाया।",
                "error"
            );

            return false;
        }
    }

    /* -----------------------------------------------------
       FIREBASE STATUS
    ----------------------------------------------------- */

    function updateConnectionStatus() {
        const firebase = window.APPARA_FIREBASE;

        if (!firebase) return;

        const configured =
            typeof firebase.isConfigured === "function"
                ? firebase.isConfigured()
                : false;

        const status = getElement(
            "online-connection-status"
        );

        if (status) {
            status.textContent = configured
                ? "Firebase configured"
                : "Firebase setup required";
        }

        const indicator = getElement(
            "connection-indicator"
        );

        if (indicator) {
            indicator.classList.toggle(
                "connected",
                configured
            );

            indicator.classList.toggle(
                "disconnected",
                !configured
            );
        }
    }

/* =========================================================
   PART 21F — PART 2/3 END
   CONTINUE IN SAME FILE WITH PART 3/3
   ========================================================= */
   
/* =========================================================
   APPARA CHESS
   PART 21F — APP CONTROLLER INTEGRATION
   PART 3/3
   ========================================================= */

    /* -----------------------------------------------------
       INITIALIZE ALL APPLICATION MODULES
    ----------------------------------------------------- */

    function initializeModules() {
        const results = {};

        /*
         * 1. Firebase
         * Firebase must initialize before online module.
         */

        const firebase = window.APPARA_FIREBASE;

        if (
            firebase &&
            typeof firebase.initialize === "function"
        ) {
            try {
                results.firebase = firebase.initialize();
            } catch (error) {
                results.firebase = false;

                console.error(
                    "Firebase initialization error:",
                    error
                );
            }
        }

        /*
         * 2. Chess engine
         */

        results.engine = initializeModule(
            "Chess Engine",
            window.APPARA_ENGINE,
            "createGame"
        );

        /*
         * 3. Board
         */

        results.board = initializeModule(
            "Chess Board",
            window.APPARA_BOARD
        );

        /*
         * 4. Sound
         */

        results.sound = initializeModule(
            "Sound System",
            window.APPARA_SOUND
        );

        /*
         * 5. AI
         */

        results.ai = initializeModule(
            "Chess AI",
            window.APPARA_AI
        );

        /*
         * 6. Online room system
         */

        results.online = initializeModule(
            "Online System",
            window.APPARA_ONLINE
        );

        /*
         * 7. Multiplayer
         */

        results.multiplayer = initializeModule(
            "Multiplayer",
            window.APPARA_MULTIPLAYER
        );

        /*
         * 8. Player profile
         */

        results.profile = initializeModule(
            "Player Profile",
            window.APPARA_PROFILE
        );

        /*
         * 9. Puzzles
         */

        results.puzzles = initializeModule(
            "Chess Puzzles",
            window.APPARA_PUZZLES
        );

        /*
         * 10. Tournament
         */

        results.tournament = initializeModule(
            "Tournament System",
            window.APPARA_TOURNAMENT
        );

        /*
         * 11. Settings
         */

        results.settings = initializeModule(
            "Settings",
            window.APPARA_SETTINGS
        );

        /*
         * 12. Main game controller
         */

        results.game = initializeModule(
            "Game Controller",
            window.APPARA_GAME
        );

        return results;
    }

    /* -----------------------------------------------------
       APPLICATION STARTUP
    ----------------------------------------------------- */

    function startApplication() {
        if (initialized || initializationStarted) {
            return;
        }

        initializationStarted = true;

        showLoadingScreen();

        bindEvents();
        bindVisibilityEvents();

        renderAbout();

        let moduleResults = {};

        try {
            moduleResults = initializeModules();
        } catch (error) {
            console.error(
                "APPARA startup error:",
                error
            );

            notify(
                "Application initialization में समस्या आई।",
                "error"
            );
        }

        updateConnectionStatus();

        /*
         * Start on Home page.
         */

        const homePage = getElement("page-home");

        if (homePage) {
            navigate("home");
        }

        /*
         * Remove loading screen after initialization.
         */

        hideLoadingScreen();

        initialized = true;
        initializationStarted = false;

        window.APPARA_READY = true;

        console.log(
            "APPARA CHESS initialized.",
            moduleResults
        );
    }

    /* -----------------------------------------------------
       APPLICATION RESTART
    ----------------------------------------------------- */

    function restartApplication() {
        if (window.APPARA_GAME &&
            window.APPARA_GAME.destroy) {
            window.APPARA_GAME.destroy();
        }

        if (window.APPARA_TIMER &&
            window.APPARA_TIMER.stop) {
            window.APPARA_TIMER.stop();
        }

        initialized = false;
        initializationStarted = false;

        startApplication();
    }

    /* -----------------------------------------------------
       APPLICATION INFORMATION
    ----------------------------------------------------- */

    function getAppInfo() {
        const config = window.APPARA_CONFIG || {};

        return {
            name: config.name || "APPARA CHESS",
            version: config.version || "1.0.0",
            developer: "Subhash Yadav",
            initialized: initialized,
            currentPage: currentPage,
            ready: Boolean(window.APPARA_READY)
        };
    }

    /* -----------------------------------------------------
       START WHEN DOM IS READY
    ----------------------------------------------------- */

    function boot() {
        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                startApplication,
                { once: true }
            );
        } else {
            startApplication();
        }
    }

    boot();

    /* -----------------------------------------------------
       PUBLIC APPLICATION API
    ----------------------------------------------------- */

    return {
        init: startApplication,
        start: startApplication,
        restart: restartApplication,

        notify: notify,

        navigate: navigate,
        getCurrentPage: getCurrentPage,

        openMenu: openMenu,
        closeMenu: closeMenu,
        toggleMenu: toggleMenu,

        openModal: openModal,
        closeModal: closeModal,

        renderAbout: renderAbout,

        hideLoadingScreen: hideLoadingScreen,
        showLoadingScreen: showLoadingScreen,

        initializeModules: initializeModules,
        updateConnectionStatus: updateConnectionStatus,

        getAppInfo: getAppInfo
    };

})();

/* =========================================================
   APPARA CHESS — PART 21F COMPLETE
   APP CONTROLLER FILE END
   ========================================================= */
       
