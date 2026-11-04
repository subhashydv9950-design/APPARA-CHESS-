
/* =========================================================
   APPARA CHESS — FILE 51
   File: js/ui/navigation.js
   Section: UI
   Purpose: Application screen navigation
   ========================================================= */

export const NAVIGATION_EVENTS = Object.freeze({
  REGISTER: "navigation:register",
  BEFORE_NAVIGATE: "navigation:before-navigate",
  NAVIGATE: "navigation:navigate",
  AFTER_NAVIGATE: "navigation:after-navigate",
  BACK: "navigation:back",
  ERROR: "navigation:error"
});

export const APP_ROUTES = Object.freeze({
  HOME: "home",
  GAME: "game",
  ONLINE: "online",
  TRAINING: "training",
  PUZZLES: "puzzles",
  TOURNAMENTS: "tournaments",
  WORLD: "world",
  SHOP: "shop",
  LEADERBOARD: "leaderboard",
  PROFILE: "profile",
  SETTINGS: "settings",
  ABOUT: "about",
  AUTH: "auth",
  REVIEW: "review"
});

export class Navigation {
  constructor(options = {}) {
    this.document = options.document || globalThis.document;
    this.eventBus = options.eventBus || null;

    this.container = options.container || null;

    this.routes = new Map();
    this.history = [];

    this.currentRoute = null;
    this.currentParams = {};

    this.transitionDuration =
      Math.max(0, Number(options.transitionDuration ?? 180));

    this.beforeNavigateGuards = new Set();

    this.navigating = false;
    this.disposed = false;

    this.navigationSequence = 0;
  }

  /* -------------------------------------------------------
     INITIALIZATION
     ------------------------------------------------------- */

  initialize(container = null) {
    this.ensureActive();

    if (container) {
      this.container = container;
    }

    if (!this.container && this.document) {
      this.container = this.document.querySelector(
        "[data-app-content]"
      ) || this.document.getElementById("app-content");
    }

    if (!this.container) {
      throw new Error(
        "Navigation container not found. Provide a container element."
      );
    }

    this.container.classList.add("ac-screen-container");

    return this;
  }

  /* -------------------------------------------------------
     ROUTE REGISTRATION
     ------------------------------------------------------- */

  register(name, configuration = {}) {
    this.ensureActive();

    if (!name || typeof name !== "string") {
      throw new TypeError("Route name must be a string.");
    }

    const {
      render = null,
      element = null,
      requiresAuth = false,
      requiresOnline = false,
      beforeEnter = null,
      afterEnter = null,
      beforeLeave = null,
      afterLeave = null,
      title = name
    } = configuration;

    if (typeof render !== "function" && !element) {
      throw new Error(
        `Route "${name}" needs a render function or an element.`
      );
    }

    this.routes.set(name, {
      name,
      render,
      element,
      requiresAuth,
      requiresOnline,
      beforeEnter,
      afterEnter,
      beforeLeave,
      afterLeave,
      title
    });

    this.emit(NAVIGATION_EVENTS.REGISTER, {
      name,
      title
    });

    return true;
  }

  registerMany(routeConfigurations = {}) {
    for (const [name, configuration] of Object.entries(
      routeConfigurations
    )) {
      this.register(name, configuration);
    }

    return this.routes.size;
  }

  unregister(name) {
    if (!this.routes.has(name)) return false;

    if (this.currentRoute === name) {
      return false;
    }

    return this.routes.delete(name);
  }

  hasRoute(name) {
    return this.routes.has(name);
  }

  getRoutes() {
    return [...this.routes.keys()];
  }

  /* -------------------------------------------------------
     NAVIGATE
     ------------------------------------------------------- */

  async navigate(name, params = {}, options = {}) {
    this.ensureActive();

    if (this.navigating) {
      return false;
    }

    const route = this.routes.get(name);

    if (!route) {
      this.emit(NAVIGATION_EVENTS.ERROR, {
        route: name,
        error: new Error(`Route not registered: ${name}`)
      });

      return false;
    }

    if (!this.container) {
      this.initialize();
    }

    const {
      replace = false,
      skipHistory = false,
      force = false
    } = options;

    if (!force && this.currentRoute === name &&
        this.areParamsEqual(this.currentParams, params)) {
      return true;
    }

    this.navigating = true;

    const previousRoute = this.currentRoute;
    const previousParams = { ...this.currentParams };

    const previousConfiguration =
      previousRoute ? this.routes.get(previousRoute) : null;

    const navigationId = ++this.navigationSequence;

    try {
      const allowed = await this.runGuards({
        from: previousRoute,
        to: name,
        params,
        force
      });

      if (!allowed) {
        return false;
      }

      if (previousConfiguration?.beforeLeave) {
        const canLeave = await previousConfiguration.beforeLeave({
          from: previousRoute,
          to: name,
          params: previousParams
        });

        if (canLeave === false) {
          return false;
        }
      }

      if (route.beforeEnter) {
        const canEnter = await route.beforeEnter({
          from: previousRoute,
          to: name,
          params
        });

        if (canEnter === false) {
          return false;
        }
      }

      this.emit(NAVIGATION_EVENTS.BEFORE_NAVIGATE, {
        from: previousRoute,
        to: name,
        params
      });

      const screen = await this.renderRoute(route, params);

      if (navigationId !== this.navigationSequence) {
        return false;
      }

      if (!skipHistory && previousRoute) {
        const entry = {
          route: previousRoute,
          params: previousParams,
          timestamp: Date.now()
        };

        if (replace && this.history.length > 0) {
          this.history[this.history.length - 1] = entry;
        } else {
          this.history.push(entry);
        }
      }

      await this.displayScreen(screen, route);

      this.currentRoute = name;
      this.currentParams = { ...params };

      this.updateDocumentTitle(route.title);

      if (previousConfiguration?.afterLeave) {
        await previousConfiguration.afterLeave({
          from: previousRoute,
          to: name
        });
      }

      if (route.afterEnter) {
        await route.afterEnter({
          from: previousRoute,
          to: name,
          params
        });
      }

      this.emit(NAVIGATION_EVENTS.NAVIGATE, {
        from: previousRoute,
        to: name,
        params
      });

      this.emit(NAVIGATION_EVENTS.AFTER_NAVIGATE, {
        route: name,
        params
      });

      return true;
    } catch (error) {
      this.emit(NAVIGATION_EVENTS.ERROR, {
        route: name,
        error
      });

      return false;
    } finally {
      this.navigating = false;
    }
  }

  /* -------------------------------------------------------
     ROUTE RENDERING
     ------------------------------------------------------- */

  async renderRoute(route, params) {
    if (typeof route.render === "function") {
      const result = await route.render({
        params,
        navigation: this,
        route: route.name
      });

      if (result instanceof this.document.defaultView.Node) {
        return result;
      }

      if (typeof result === "string") {
        const wrapper = this.document.createElement("div");
        wrapper.className = "ac-screen";

        // Route strings are treated as text, not executable HTML.
        wrapper.textContent = result;

        return wrapper;
      }

      if (result === null || result === undefined) {
        return this.document.createElement("div");
      }

      throw new TypeError(
        `Route "${route.name}" returned an unsupported value.`
      );
    }

    if (route.element instanceof this.document.defaultView.Node) {
      return route.element.cloneNode(true);
    }

    throw new Error(
      `Route "${route.name}" could not be rendered.`
    );
  }

  async displayScreen(screen, route) {
    const oldScreen = this.container.firstElementChild;

    screen.classList.add("ac-screen");
    screen.dataset.route = route.name;

    screen.setAttribute("aria-label", route.title);

    if (oldScreen && this.transitionDuration > 0) {
      oldScreen.classList.add("ac-screen--leaving");

      await this.wait(this.transitionDuration);
    }

    this.container.replaceChildren(screen);

    screen.classList.add("ac-screen--active");

    if (this.transitionDuration > 0) {
      await this.wait(20);
    }

    screen.classList.add("ac-screen--visible");

    return screen;
  }

  /* -------------------------------------------------------
     BACK NAVIGATION
     ------------------------------------------------------- */

  async back() {
    this.ensureActive();

    if (this.navigating || this.history.length === 0) {
      return false;
    }

    const previous = this.history.pop();

    const success = await this.navigate(
      previous.route,
      previous.params,
      {
        skipHistory: true
      }
    );

    if (!success) {
      this.history.push(previous);
      return false;
    }

    this.emit(NAVIGATION_EVENTS.BACK, {
      route: previous.route,
      params: previous.params
    });

    return true;
  }

  canGoBack() {
    return this.history.length > 0;
  }

  clearHistory() {
    this.history = [];
  }

  /* -------------------------------------------------------
     GUARDS
     ------------------------------------------------------- */

  addGuard(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Navigation guard must be a function.");
    }

    this.beforeNavigateGuards.add(callback);

    return () => {
      this.beforeNavigateGuards.delete(callback);
    };
  }

  async runGuards(context) {
    for (const guard of this.beforeNavigateGuards) {
      const result = await guard(context);

      if (result === false) {
        return false;
      }
    }

    return true;
  }

  /* -------------------------------------------------------
     AUTHENTICATION ROUTE GUARD
     ------------------------------------------------------- */

  createAuthGuard(authService, options = {}) {
    const authRoute = options.authRoute || APP_ROUTES.AUTH;

    return async ({ to, force }) => {
      if (force) return true;

      const route = this.routes.get(to);

      if (!route?.requiresAuth) {
        return true;
      }

      const authenticated = Boolean(
        authService?.isAuthenticated
      );

      if (authenticated) {
        return true;
      }

      if (to !== authRoute && this.hasRoute(authRoute)) {
        await this.navigate(authRoute, {
          returnTo: to
        }, {
          skipHistory: true
        });
      }

      return false;
    };
  }

  /* -------------------------------------------------------
     CURRENT ROUTE
     ------------------------------------------------------- */

  getCurrentRoute() {
    return this.currentRoute;
  }

  getCurrentParams() {
    return { ...this.currentParams };
  }

  getCurrentScreen() {
    return this.container?.firstElementChild || null;
  }

  /* -------------------------------------------------------
     URL HASH SUPPORT
     ------------------------------------------------------- */

  navigateFromHash() {
    if (!globalThis.location) return false;

    const hash = globalThis.location.hash.replace(/^#\/?/, "");

    if (!hash) return false;

    const [name, ...segments] = hash.split("/");

    if (!this.hasRoute(name)) {
      return false;
    }

    const params = {};

    if (segments.length > 0) {
      params.id = decodeURIComponent(segments.join("/"));
    }

    return this.navigate(name, params, {
      skipHistory: true
    });
  }

  updateHash(name, params = {}) {
    if (!globalThis.history || !globalThis.location) {
      return false;
    }

    const suffix = params.id
      ? `/${encodeURIComponent(params.id)}`
      : "";

    const hash = `#/${name}${suffix}`;

    globalThis.history.replaceState(
      null,
      "",
      hash
    );

    return true;
  }

  /* -------------------------------------------------------
     DOCUMENT TITLE
     ------------------------------------------------------- */

  updateDocumentTitle(title) {
    if (!this.document || !title) return;

    this.document.title = `${title} | APPARA CHESS`;
  }

  /* -------------------------------------------------------
     UTILITIES
     ------------------------------------------------------- */

  areParamsEqual(first = {}, second = {}) {
    try {
      return JSON.stringify(first) === JSON.stringify(second);
    } catch {
      return false;
    }
  }

  wait(milliseconds) {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
    });
  }

  emit(eventName, payload = {}) {
    this.eventBus?.emit?.(eventName, payload);
  }

  ensureActive() {
    if (this.disposed) {
      throw new Error("Navigation has been disposed.");
    }
  }

  /* -------------------------------------------------------
     DISPOSAL
     ------------------------------------------------------- */

  dispose() {
    if (this.disposed) return;

    this.navigationSequence++;

    this.routes.clear();
    this.history = [];
    this.beforeNavigateGuards.clear();

    this.container?.replaceChildren();

    this.container = null;
    this.currentRoute = null;
    this.currentParams = {};
    this.eventBus = null;

    this.disposed = true;
  }
}

/* ---------------------------------------------------------
   FACTORY
   --------------------------------------------------------- */

export function createNavigation(options = {}) {
  return new Navigation(options);
}

/* ================= FILE 51 END ================= */
        
