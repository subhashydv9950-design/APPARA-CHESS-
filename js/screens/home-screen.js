
/* =========================================================
   APPARA CHESS — FILE 53
   File: js/screens/home-screen.js
   Section: Screens
   Purpose: Premium main home screen
   ========================================================= */

export class HomeScreen {
  constructor(options = {}) {
    this.playerService = options.playerService || null;
    this.progressionService = options.progressionService || null;
    this.navigation = options.navigation || null;
    this.components = options.components || null;
    this.eventBus = options.eventBus || null;

    this.container = null;
    this.player = null;
    this.disposed = false;

    this.unsubscribe = [];
  }

  /* -------------------------------------------------------
     INITIALIZATION
     ------------------------------------------------------- */

  initialize(container) {
    this.ensureActive();

    if (!container) {
      throw new Error("Home screen container is required.");
    }

    this.container = container;

    this.loadPlayerData();
    this.render();
    this.subscribeToEvents();

    return this;
  }

  loadPlayerData() {
    try {
      this.player =
        this.playerService?.getProfile?.() || null;
    } catch (error) {
      console.error("[HomeScreen] Profile loading failed:", error);
      this.player = null;
    }

    return this.player;
  }

  /* -------------------------------------------------------
     MAIN RENDER
     ------------------------------------------------------- */

  render() {
    if (!this.container) return false;

    this.container.replaceChildren();
    this.container.className = "ac-home-screen";

    const layout = this.createElement("div", {
      className: "ac-home-layout"
    });

    layout.append(this.createTopBar());

    const main = this.createElement("main", {
      className: "ac-home-main"
    });

    main.append(
      this.createWelcomeSection(),
      this.createArenaSection(),
      this.createGameModes(),
      this.createBottomNavigation()
    );

    layout.append(main);
    this.container.append(layout);

    return true;
  }

  /* -------------------------------------------------------
     TOP BAR
     ------------------------------------------------------- */

  createTopBar() {
    const bar = this.createElement("header", {
      className: "ac-home-topbar"
    });

    const left = this.createElement("div", {
      className: "ac-home-topbar__left"
    });

    const menuButton = this.createButton("☰", {
      className: "ac-home-menu-button",
      label: "Open menu"
    });

    menuButton.addEventListener("click", () => {
      this.openMenu();
    });

    const profile = this.createElement("button", {
      className: "ac-home-mini-profile"
    });

    profile.type = "button";

    profile.append(
      this.createAvatar(),
      this.createElement("span", {
        className: "ac-home-mini-profile__name",
        text: this.getPlayerName()
      })
    );

    profile.addEventListener("click", () => {
      this.navigate("profile");
    });

    left.append(menuButton, profile);

    const right = this.createElement("div", {
      className: "ac-home-resources"
    });

    right.append(
      this.createResource("🪙", this.getCoins(), "coins"),
      this.createResource("💎", this.getDiamonds(), "diamonds"),
      this.createResource("🏆", "Rank", "rank")
    );

    bar.append(left, right);

    return bar;
  }

  createResource(icon, value, type) {
    const button = this.createButton("", {
      className: `ac-home-resource ac-home-resource--${type}`
    });

    button.append(
      this.createElement("span", {
        className: "ac-home-resource__icon",
        text: icon
      }),
      this.createElement("span", {
        className: "ac-home-resource__value",
        text: String(value)
      })
    );

    button.addEventListener("click", () => {
      if (type === "coins" || type === "diamonds") {
        this.navigate("shop", { currency: type });
      } else if (type === "rank") {
        this.navigate("leaderboard");
      }
    });

    return button;
  }

  /* -------------------------------------------------------
     WELCOME AND PLAYER LEVEL
     ------------------------------------------------------- */

  createWelcomeSection() {
    const section = this.createElement("section", {
      className: "ac-home-welcome"
    });

    const text = this.createElement("div", {
      className: "ac-home-welcome__text"
    });

    text.append(
      this.createElement("p", {
        className: "ac-home-eyebrow",
        text: "WELCOME TO THE ROYAL ARENA"
      }),
      this.createElement("h1", {
        text: `Welcome, ${this.getPlayerName()}`
      }),
      this.createElement("p", {
        className: "ac-home-welcome__subtitle",
        text: "Your next great chess journey begins here."
      })
    );

    const level = this.createLevelCard();

    section.append(text, level);

    return section;
  }

  createLevelCard() {
    const level = this.getPlayerLevel();
    const xp = this.getPlayerXP();
    const nextXP = this.getNextLevelXP();

    const card = this.createElement("div", {
      className: "ac-home-level-card"
    });

    const heading = this.createElement("div", {
      className: "ac-home-level-card__heading"
    });

    heading.append(
      this.createElement("span", {
        text: `LEVEL ${level}`
      }),
      this.createElement("span", {
        text: `${xp} / ${nextXP} XP`
      })
    );

    card.append(heading);

    const progress = this.createElement("div", {
      className: "ac-home-level-progress"
    });

    const fill = this.createElement("div", {
      className: "ac-home-level-progress__fill"
    });

    fill.style.width = `${
      Math.min(100, Math.max(0, (xp / Math.max(1, nextXP)) * 100))
    }%`;

    progress.append(fill);
    card.append(progress);

    return card;
  }

  /* -------------------------------------------------------
     MAIN CHESS ARENA
     ------------------------------------------------------- */

  createArenaSection() {
    const section = this.createElement("section", {
      className: "ac-home-arena"
    });

    const decoration = this.createElement("div", {
      className: "ac-home-arena__decoration"
    });

    const content = this.createElement("div", {
      className: "ac-home-arena__content"
    });

    content.append(
      this.createElement("p", {
        className: "ac-home-eyebrow",
        text: "THE ROYAL CHESS EXPERIENCE"
      }),
      this.createElement("h2", {
        text: "ENTER THE ARENA"
      }),
      this.createElement("p", {
        text: "Challenge your mind. Master every move."
      })
    );

    const chessSymbol = this.createElement("div", {
      className: "ac-home-arena__symbol",
      text: "♔"
    });

    chessSymbol.setAttribute("aria-hidden", "true");

    const actions = this.createElement("div", {
      className: "ac-home-arena__actions"
    });

    const playButton = this.createButton(
      "PLAY NOW  →",
      {
        className: "ac-home-play-button"
      }
    );

    playButton.addEventListener("click", () => {
      this.navigate("game", {
        mode: "offline",
        setup: true
      });
    });

    const trainingButton = this.createButton(
      "TRAINING",
      {
        className: "ac-home-training-button"
      }
    );

    trainingButton.addEventListener("click", () => {
      this.navigate("training");
    });

    actions.append(playButton, trainingButton);

    content.append(actions);

    section.append(decoration, chessSymbol, content);

    return section;
  }

  /* -------------------------------------------------------
     GAME MODES
     ------------------------------------------------------- */

  createGameModes() {
    const section = this.createElement("section", {
      className: "ac-home-modes"
    });

    const heading = this.createElement("div", {
      className: "ac-home-section-heading"
    });

    heading.append(
      this.createElement("h2", {
        text: "Explore Chess"
      }),
      this.createElement("p", {
        text: "Choose your next challenge"
      })
    );

    section.append(heading);

    const grid = this.createElement("div", {
      className: "ac-home-mode-grid"
    });

    const modes = [
      {
        id: "online",
        icon: "🌐",
        title: "Online Chess",
        description: "Play against real opponents",
        badge: "MULTIPLAYER"
      },
      {
        id: "training",
        icon: "🎯",
        title: "Training",
        description: "Improve your chess skills",
        badge: "LEARN"
      },
      {
        id: "puzzles",
        icon: "🧩",
        title: "Chess Puzzles",
        description: "Solve tactical challenges",
        badge: "DAILY"
      },
      {
        id: "tournaments",
        icon: "🏆",
        title: "Tournaments",
        description: "Compete for rewards",
        badge: "COMPETE"
      }
    ];

    for (const mode of modes) {
      grid.append(this.createModeCard(mode));
    }

    section.append(grid);

    return section;
  }

  createModeCard(mode) {
    const card = this.createElement("button", {
      className: "ac-home-mode-card"
    });

    card.type = "button";

    const icon = this.createElement("span", {
      className: "ac-home-mode-card__icon",
      text: mode.icon
    });

    const badge = this.createElement("span", {
      className: "ac-home-mode-card__badge",
      text: mode.badge
    });

    const title = this.createElement("h3", {
      text: mode.title
    });

    const description = this.createElement("p", {
      text: mode.description
    });

    const arrow = this.createElement("span", {
      className: "ac-home-mode-card__arrow",
      text: "→"
    });

    card.append(icon, badge, title, description, arrow);

    card.addEventListener("click", () => {
      this.navigate(mode.id);
    });

    return card;
  }

  /* -------------------------------------------------------
     BOTTOM NAVIGATION
     ------------------------------------------------------- */

  createBottomNavigation() {
    const section = this.createElement("section", {
      className: "ac-home-extras"
    });

    const items = [
      {
        id: "world",
        icon: "🌍",
        label: "Chess World"
      },
      {
        id: "shop",
        icon: "👑",
        label: "Board Themes"
      },
      {
        id: "leaderboard",
        icon: "📊",
        label: "Leaderboard"
      }
    ];

    for (const item of items) {
      const button = this.createElement("button", {
        className: "ac-home-extra-button"
      });

      button.type = "button";

      button.append(
        this.createElement("span", {
          text: item.icon
        }),
        this.createElement("span", {
          text: item.label
        })
      );

      button.addEventListener("click", () => {
        this.navigate(item.id);
      });

      section.append(button);
    }

    return section;
  }

  /* -------------------------------------------------------
     MENU
     ------------------------------------------------------- */

  openMenu() {
    const menu = this.createElement("div", {
      className: "ac-home-menu"
    });

    const menuItems = [
      ["Profile", "profile"],
      ["Friends", "online"],
      ["Leaderboard", "leaderboard"],
      ["Settings", "settings"],
      ["About APPARA CHESS", "about"]
    ];

    const header = this.createElement("div", {
      className: "ac-home-menu__header"
    });

    header.append(
      this.createElement("strong", {
        text: "APPARA CHESS"
      }),
      this.createButton("×", {
        className: "ac-home-menu__close"
      })
    );

    header.querySelector("button").addEventListener(
      "click",
      () => menu.remove()
    );

    menu.append(header);

    for (const [label, route] of menuItems) {
      const button = this.createButton(label, {
        className: "ac-home-menu__item"
      });

      button.addEventListener("click", () => {
        menu.remove();
        this.navigate(route);
      });

      menu.append(button);
    }

    const backdrop = this.createElement("div", {
      className: "ac-home-menu-backdrop"
    });

    backdrop.append(menu);

    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) {
        backdrop.remove();
      }
    });

    this.container.append(backdrop);
  }

  /* -------------------------------------------------------
     PLAYER DATA HELPERS
     ------------------------------------------------------- */

  getPlayerName() {
    return (
      this.player?.displayName ||
      this.player?.name ||
      "Player"
    );
  }

  getCoins() {
    return Number(
      this.player?.coins ??
      this.player?.currency?.coins ??
      2500
    ).toLocaleString();
  }

  getDiamonds() {
    return Number(
      this.player?.diamonds ??
      this.player?.currency?.diamonds ??
      0
    ).toLocaleString();
  }

  getPlayerLevel() {
    return Math.max(
      1,
      Number(this.player?.level || 1)
    );
  }

  getPlayerXP() {
    return Math.max(
      0,
      Number(
        this.player?.xp ??
        this.player?.experience ??
        0
      )
    );
  }

  getNextLevelXP() {
    try {
      const required =
        this.progressionService?.getXPForNextLevel?.(
          this.getPlayerLevel()
        );

      if (Number.isFinite(required) && required > 0) {
        return required;
      }
    } catch {
      // Use the local display fallback.
    }

    return 1000;
  }

  createAvatar() {
    const name = this.getPlayerName();
    const avatar = this.createElement("div", {
      className: "ac-home-avatar"
    });

    const image = this.player?.avatarURL ||
      this.player?.avatarUrl ||
      this.player?.photoURL;

    if (image) {
      const img = this.createElement("img", {
        attributes: {
          src: image,
          alt: `${name} avatar`
        }
      });

      img.addEventListener("error", () => {
        img.remove();
        avatar.textContent = name.charAt(0).toUpperCase();
      }, { once: true });

      avatar.append(img);
    } else {
      avatar.textContent = name.charAt(0).toUpperCase();
    }

    return avatar;
  }

  /* -------------------------------------------------------
     NAVIGATION
     ------------------------------------------------------- */

  navigate(route, params = {}) {
    if (!this.navigation?.navigate) {
      this.emit("navigation:requested", {
        route,
        params
      });

      return false;
    }

    return this.navigation.navigate(route, params);
  }

  /* -------------------------------------------------------
     EVENT SUBSCRIPTIONS
     ------------------------------------------------------- */

  subscribeToEvents() {
    if (!this.eventBus?.on) return;

    const unsubscribe = this.eventBus.on(
      "player:profile-updated",
      () => {
        this.loadPlayerData();
        this.render();
      }
    );

    if (typeof unsubscribe === "function") {
      this.unsubscribe.push(unsubscribe);
    }
  }

  emit(eventName, payload = {}) {
    this.eventBus?.emit?.(eventName, payload);
  }

  /* -------------------------------------------------------
     DOM HELPERS
     ------------------------------------------------------- */

  createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) {
      element.className = options.className;
    }

    if (options.text !== undefined) {
      element.textContent = String(options.text);
    }

    if (options.attributes) {
      for (const [key, value] of Object.entries(
        options.attributes
      )) {
        element.setAttribute(key, String(value));
      }
    }

    return element;
  }

  createButton(text, options = {}) {
    const button = this.createElement("button", {
      className: options.className || "ac-button",
      text
    });

    button.type = "button";

    if (options.label) {
      button.setAttribute("aria-label", options.label);
    }

    return button;
  }

  /* -------------------------------------------------------
     REFRESH
     ------------------------------------------------------- */

  refresh() {
    this.loadPlayerData();
    return this.render();
  }

  /* -------------------------------------------------------
     VALIDATION / DISPOSAL
     ------------------------------------------------------- */

  ensureActive() {
    if (this.disposed) {
      throw new Error("HomeScreen has been disposed.");
    }
  }

  dispose() {
    if (this.disposed) return;

    for (const unsubscribe of this.unsubscribe) {
      unsubscribe();
    }

    this.unsubscribe = [];

    this.container?.replaceChildren();

    this.container = null;
    this.player = null;
    this.playerService = null;
    this.progressionService = null;
    this.navigation = null;
    this.components = null;
    this.eventBus = null;

    this.disposed = true;
  }
}

/* ---------------------------------------------------------
   FACTORY
   --------------------------------------------------------- */

export function createHomeScreen(options = {}) {
  return new HomeScreen(options);
}

/* ================= FILE 53 END ================= */
        
