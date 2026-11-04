/* =========================================================
   APPARA CHESS — APPLICATION INTEGRATION TESTS
   FILE: tests/app-integration.test.js
   PURPOSE: Navigation and game-session integration checks
   ========================================================= */

import {
  Navigation,
  APP_ROUTES,
  NAVIGATION_EVENTS
} from "../js/ui/navigation.js";

import {
  createGameSession
} from "../js/chess/game-session.js";

import {
  Assert,
  test,
  TestRegistry
} from "./test-utils.js";


/* ---------------------------------------------------------
   NAVIGATION TEST HELPERS
--------------------------------------------------------- */

function createNavigation() {
  const container = document.createElement("main");

  document.body.appendChild(container);

  const navigation = new Navigation({
    document,
    container,
    transitionDuration: 0
  });

  navigation.initialize(container);

  return {
    navigation,
    container,
    cleanup() {
      navigation.dispose();
      container.remove();
    }
  };
}


/* ---------------------------------------------------------
   REGISTER APPLICATION INTEGRATION SUITE
--------------------------------------------------------- */

TestRegistry.register("Application Integration", () => {

  const tests = [];


  /* -------------------------------------------------------
     1. NAVIGATION INITIALIZATION
  ------------------------------------------------------- */

  tests.push(
    test("Navigation initializes with a container", () => {
      const setup = createNavigation();

      Assert.exists(setup.navigation);
      Assert.equal(
        setup.navigation.container,
        setup.container
      );

      setup.cleanup();
    })
  );


  tests.push(
    test("Navigation starts without an active route", () => {
      const setup = createNavigation();

      Assert.equal(
        setup.navigation.getCurrentRoute(),
        null
      );

      setup.cleanup();
    })
  );


  tests.push(
    test("Navigation exposes application routes", () => {
      Assert.equal(APP_ROUTES.HOME, "home");
      Assert.equal(APP_ROUTES.GAME, "game");
      Assert.equal(APP_ROUTES.ONLINE, "online");
      Assert.equal(APP_ROUTES.SETTINGS, "settings");
      Assert.equal(APP_ROUTES.PROFILE, "profile");
    })
  );


  /* -------------------------------------------------------
     2. ROUTE REGISTRATION
  ------------------------------------------------------- */

  tests.push(
    test("Navigation registers a route", () => {
      const setup = createNavigation();

      const registered = setup.navigation.register(
        "test-home",
        {
          title: "Test Home",
          render: () => {
            const element = document.createElement("section");
            element.textContent = "Home screen";
            return element;
          }
        }
      );

      Assert.true(registered);
      Assert.true(
        setup.navigation.hasRoute("test-home")
      );

      setup.cleanup();
    })
  );


  tests.push(
    test("Navigation rejects a route without a renderer", () => {
      const setup = createNavigation();

      Assert.throws(() => {
        setup.navigation.register("invalid-route", {});
      });

      setup.cleanup();
    })
  );


  tests.push(
    test("Navigation lists registered routes", () => {
      const setup = createNavigation();

      setup.navigation.register("home-test", {
        render: () => document.createElement("div")
      });

      setup.navigation.register("settings-test", {
        render: () => document.createElement("div")
      });

      const routes = setup.navigation.getRoutes();

      Assert.includes(routes, "home-test");
      Assert.includes(routes, "settings-test");

      setup.cleanup();
    })
  );


  /* -------------------------------------------------------
     3. SCREEN NAVIGATION
  ------------------------------------------------------- */

  tests.push(
    test("Navigation opens a registered screen", async () => {
      const setup = createNavigation();

      setup.navigation.register("home-test", {
        title: "Home Test",
        render: () => {
          const element = document.createElement("section");
          element.textContent = "APPARA HOME";
          return element;
        }
      });

      const result = await setup.navigation.navigate(
        "home-test",
        {},
        { skipHistory: true }
      );

      Assert.true(result);
      Assert.equal(
        setup.navigation.getCurrentRoute(),
        "home-test"
      );

      Assert.equal(
        setup.container.firstElementChild.textContent,
        "APPARA HOME"
      );

      setup.cleanup();
    })
  );


  tests.push(
    test("Navigation preserves route parameters", async () => {
      const setup = createNavigation();

      setup.navigation.register("profile-test", {
        render: ({ params }) => {
          const element = document.createElement("div");
          element.textContent = params.playerId;
          return element;
        }
      });

      const result = await setup.navigation.navigate(
        "profile-test",
        { playerId: "AC-TEST01" },
        { skipHistory: true }
      );

      Assert.true(result);
      Assert.equal(
        setup.navigation.getCurrentParams().playerId,
        "AC-TEST01"
      );

      setup.cleanup();
    })
  );


  tests.push(
    test("Navigation rejects an unknown route", async () => {
      const setup = createNavigation();

      const result = await setup.navigation.navigate(
        "route-that-does-not-exist"
      );

      Assert.false(result);

      setup.cleanup();
    })
  );


  tests.push(
    test("Navigation updates the document title", async () => {
      const setup = createNavigation();

      setup.navigation.register("title-test", {
        title: "Integration Test",
        render: () => document.createElement("div")
      });

      await setup.navigation.navigate(
        "title-test",
        {},
        { skipHistory: true }
      );

      Assert.equal(
        document.title,
        "Integration Test | APPARA CHESS"
      );

      setup.cleanup();
    })
  );


  /* -------------------------------------------------------
     4. NAVIGATION HISTORY
  ------------------------------------------------------- */

  tests.push(
    test("Navigation stores the previous route", async () => {
      const setup = createNavigation();

      setup.navigation.register("first-test", {
        render: () => document.createElement("div")
      });

      setup.navigation.register("second-test", {
        render: () => document.createElement("div")
      });

      await setup.navigation.navigate(
        "first-test",
        {},
        { skipHistory: true }
      );

      await setup.navigation.navigate("second-test");

      Assert.true(setup.navigation.canGoBack());

      setup.cleanup();
    })
  );


  tests.push(
    test("Navigation can return to the previous screen", async () => {
      const setup = createNavigation();

      setup.navigation.register("first-test", {
        render: () => document.createElement("div")
      });

      setup.navigation.register("second-test", {
        render: () => document.createElement("div")
      });

      await setup.navigation.navigate(
        "first-test",
        {},
        { skipHistory: true }
      );

      await setup.navigation.navigate("second-test");

      const result = await setup.navigation.back();

      Assert.true(result);
      Assert.equal(
        setup.navigation.getCurrentRoute(),
        "first-test"
      );

      setup.cleanup();
    })
  );


  tests.push(
    test("Navigation can clear its history", async () => {
      const setup = createNavigation();

      setup.navigation.register("first-test", {
        render: () => document.createElement("div")
      });

      setup.navigation.register("second-test", {
        render: () => document.createElement("div")
      });

      await setup.navigation.navigate(
        "first-test",
        {},
        { skipHistory: true }
      );

      await setup.navigation.navigate("second-test");

      setup.navigation.clearHistory();

      Assert.false(setup.navigation.canGoBack());

      setup.cleanup();
    })
  );


  /* -------------------------------------------------------
     5. NAVIGATION GUARDS AND EVENTS
  ------------------------------------------------------- */

  tests.push(
    test("Navigation guard can block a route change", async () => {
      const setup = createNavigation();

      setup.navigation.register("guard-test", {
        render: () => document.createElement("div")
      });

      const removeGuard = setup.navigation.addGuard(() => false);

      const result = await setup.navigation.navigate(
        "guard-test"
      );

      Assert.false(result);
      Assert.equal(
        setup.navigation.getCurrentRoute(),
        null
      );

      removeGuard();
      setup.cleanup();
    })
  );


  tests.push(
    test("Navigation guard can be removed", () => {
      const setup = createNavigation();

      const guard = () => true;
      const removeGuard = setup.navigation.addGuard(guard);

      Assert.true(
        setup.navigation.beforeNavigateGuards.has(guard)
      );

      removeGuard();

      Assert.false(
        setup.navigation.beforeNavigateGuards.has(guard)
      );

      setup.cleanup();
    })
  );


  tests.push(
    test("Navigation exposes event constants", () => {
      Assert.equal(
        NAVIGATION_EVENTS.NAVIGATE,
        "navigation:navigate"
      );

      Assert.equal(
        NAVIGATION_EVENTS.ERROR,
        "navigation:error"
      );

      Assert.equal(
        NAVIGATION_EVENTS.AUTH_REQUIRED,
        "navigation:auth-required"
      );
    })
  );


  /* -------------------------------------------------------
     6. GAME SESSION INTEGRATION
  ------------------------------------------------------- */

  tests.push(
    test("Application game session creates both game and AI", () => {
      const session = createGameSession({
        mode: "offline",
        difficulty: "medium"
      });

      Assert.exists(session.gameState);
      Assert.exists(session.aiEngine);

      session.dispose();
    })
  );


  tests.push(
    test("Game session starts with a playable chess position", () => {
      const session = createGameSession();

      const snapshot = session.gameState.getSnapshot();

      Assert.exists(snapshot.board);
      Assert.equal(snapshot.turn, "w");
      Assert.exists(snapshot.fen);

      session.dispose();
    })
  );


  tests.push(
    test("Game session updates after a legal player move", () => {
      const session = createGameSession();

      const result = session.gameState.makeMove({
        from: "e2",
        to: "e4"
      });

      Assert.true(result.success);
      Assert.equal(
        session.gameState.getTurn(),
        "b"
      );

      session.dispose();
    })
  );


  tests.push(
    test("Game session rejects an illegal player move", () => {
      const session = createGameSession();

      const result = session.gameState.makeMove({
        from: "e2",
        to: "e5"
      });

      Assert.false(result.success);
      Assert.equal(
        session.gameState.getTurn(),
        "w"
      );

      session.dispose();
    })
  );


  tests.push(
    test("Game session supports pause and resume", () => {
      const session = createGameSession();

      const pauseResult = session.gameState.pause();

      Assert.true(pauseResult.success);
      Assert.true(session.gameState.isPaused());

      const resumeResult = session.gameState.resume();

      Assert.true(resumeResult.success);
      Assert.false(session.gameState.isPaused());

      session.dispose();
    })
  );


  tests.push(
    test("Game session disposal is safe to repeat", () => {
      const session = createGameSession();

      session.dispose();
      session.dispose();

      Assert.true(true);
    })
  );


  return tests;
});


/* =========================================================
   FILE: tests/app-integration.test.js
   FULL FILE COMPLETE — NEW FILE 9/10
   ========================================================= */
