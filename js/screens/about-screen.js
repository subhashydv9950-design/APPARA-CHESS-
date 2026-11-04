/* =========================================================
   APPARA CHESS
   FILE 64: js/screens/about-screen.js
   About Screen
   ========================================================= */

import { escapeHTML } from "../core/dom-utils.js";

export class AboutScreen {
  constructor(options = {}) {
    this.navigation = options.navigation || null;
    this.eventBus = options.eventBus || null;
    this.container = options.container || null;

    this.appName = "APPARA CHESS";
    this.tagline = "The Royal Chess Experience";
    this.version = options.version || "1.0.0";
    this.build = options.build || "Initial Release";

    this.destroyed = false;

    this.boundClick = this.handleClick.bind(this);
  }

  async mount(container) {
    this.container = container || this.container;

    if (!this.container) {
      throw new Error("AboutScreen: container is required.");
    }

    this.destroyed = false;

    this.render();

    this.container.addEventListener(
      "click",
      this.boundClick
    );

    return this;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <section class="about-screen screen">

        <header class="screen-header about-header">
          <button
            class="icon-button"
            data-action="back"
            aria-label="Go back">
            ←
          </button>

          <div class="screen-heading">
            <span class="eyebrow">DISCOVER OUR WORLD</span>
            <h1>About APPARA</h1>
          </div>
        </header>

        <main class="about-content">

          <section class="about-brand-card">
            <div class="about-logo">
              <span class="about-logo-symbol">♛</span>
              <span class="about-logo-crown">✦</span>
            </div>

            <h2>APPARA CHESS</h2>

            <p class="about-tagline">
              ${this.escape(this.tagline)}
            </p>

            <div class="about-version">
              <span>VERSION ${this.escape(this.version)}</span>
              <span class="about-version-dot">•</span>
              <span>${this.escape(this.build)}</span>
            </div>
          </section>

          <section class="about-section">
            <span class="about-section-label">OUR VISION</span>

            <h3>Chess Beyond The Ordinary</h3>

            <p>
              APPARA CHESS is designed to bring the timeless
              strategy of chess into a premium interactive
              experience.
            </p>

            <p>
              Explore beautiful chess environments, customize
              your boards and pieces, improve your skills,
              challenge opponents and build your own chess
              journey.
            </p>
          </section>

          <section class="about-feature-grid">

            <article class="about-feature-card">
              <span class="about-feature-icon">♟</span>
              <h3>Classic Chess</h3>
              <p>
                Enjoy the traditional rules and strategy
                of chess.
              </p>
            </article>

            <article class="about-feature-card">
              <span class="about-feature-icon">✧</span>
              <h3>3D Experience</h3>
              <p>
                Discover immersive boards, pieces and
                environments.
              </p>
            </article>

            <article class="about-feature-card">
              <span class="about-feature-icon">🏆</span>
              <h3>Competition</h3>
              <p>
                Improve your skills through challenges,
                ranks and tournaments.
              </p>
            </article>

            <article class="about-feature-card">
              <span class="about-feature-icon">🎨</span>
              <h3>Customization</h3>
              <p>
                Create your own royal chess collection.
              </p>
            </article>

          </section>

          <section class="about-founder-card">
            <span class="about-section-label">
              THE CREATOR
            </span>

            <div class="founder-avatar">
              SY
            </div>

            <h3>Subhash Yadav</h3>

            <p class="founder-role">
              Founder & Developer
            </p>

            <p class="founder-description">
              Building APPARA CHESS with a vision to make
              chess more immersive, creative and enjoyable.
            </p>

            <div class="founder-social-links">

              <a
                href="https://www.instagram.com/iamsubhash177/"
                target="_blank"
                rel="noopener noreferrer"
                class="about-social-link">
                <span>◎</span>
                Instagram
              </a>

              <a
                href="mailto:yahu9950@gmail.com"
                class="about-social-link">
                <span>✉</span>
                Email
              </a>

            </div>
          </section>

          <section class="about-section about-credits">
            <span class="about-section-label">
              APP INFORMATION
            </span>

            <div class="about-info-row">
              <span>Application</span>
              <strong>APPARA CHESS</strong>
            </div>

            <div class="about-info-row">
              <span>Version</span>
              <strong>${this.escape(this.version)}</strong>
            </div>

            <div class="about-info-row">
              <span>Developer</span>
              <strong>Subhash Yadav</strong>
            </div>

            <div class="about-info-row">
              <span>Platform</span>
              <strong>Web & Mobile</strong>
            </div>
          </section>

          <footer class="about-footer">
            <div class="about-footer-crown">♛</div>

            <h3>APPARA CHESS</h3>

            <p>${this.escape(this.tagline)}</p>

            <span>
              © ${new Date().getFullYear()} APPARA CHESS
            </span>

            <span class="about-footer-note">
              Made with passion for chess.
            </span>
          </footer>

        </main>
      </section>
    `;
  }

  handleClick(event) {
    const button = event.target.closest("[data-action]");

    if (!button || !this.container.contains(button)) {
      return;
    }

    if (button.dataset.action === "back") {
      this.goBack();
    }
  }

  goBack() {
    if (
      this.navigation &&
      typeof this.navigation.back === "function"
    ) {
      this.navigation.back();
      return;
    }

    if (
      this.navigation &&
      typeof this.navigation.navigate === "function"
    ) {
      this.navigation.navigate("home");
    }
  }

  escape(value) {
    if (typeof escapeHTML === "function") {
      return escapeHTML(String(value ?? ""));
    }

    const element = document.createElement("span");
    element.textContent = String(value ?? "");

    return element.innerHTML;
  }

  destroy() {
    this.destroyed = true;

    if (this.container) {
      this.container.removeEventListener(
        "click",
        this.boundClick
      );

      this.container.innerHTML = "";
    }

    this.container = null;
  }
}

export function createAboutScreen(options = {}) {
  return new AboutScreen(options);
}

/* ================= FILE 64 END ================= */
