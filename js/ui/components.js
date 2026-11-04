
/* =========================================================
   APPARA CHESS — FILE 49
   File: js/ui/components.js
   Section: UI
   Purpose: Reusable interface components
   ========================================================= */

import { createElement, escapeHTML } from "../core/dom-utils.js";

/* ---------------------------------------------------------
   COMPONENT CONFIGURATION
   --------------------------------------------------------- */

export const UI_COMPONENT_EVENTS = Object.freeze({
  BUTTON_CLICK: "ui:button-click",
  CARD_CLICK: "ui:card-click",
  NOTIFICATION: "ui:notification"
});

export const UI_COMPONENT_CLASSES = Object.freeze({
  button: "ac-button",
  card: "ac-card",
  badge: "ac-badge",
  avatar: "ac-avatar",
  progress: "ac-progress",
  loader: "ac-loader",
  notification: "ac-notification"
});

/* ---------------------------------------------------------
   COMPONENT FACTORY
   --------------------------------------------------------- */

export class UIComponents {
  constructor(options = {}) {
    this.eventBus = options.eventBus || null;
    this.document = options.document || globalThis.document;

    this.notificationContainer = null;
    this.activeNotifications = new Set();

    this.disposed = false;
  }

  /* -------------------------------------------------------
     BASIC ELEMENT CREATION
     ------------------------------------------------------- */

  element(tag, options = {}) {
    this.ensureActive();

    if (!this.document) {
      throw new Error("Document is not available.");
    }

    const node = this.document.createElement(tag);

    if (options.className) {
      node.className = options.className;
    }

    if (options.id) {
      node.id = options.id;
    }

    if (options.text !== undefined) {
      node.textContent = String(options.text);
    }

    if (options.attributes) {
      for (const [name, value] of Object.entries(
        options.attributes
      )) {
        if (value === null || value === undefined) continue;

        node.setAttribute(name, String(value));
      }
    }

    if (options.dataset) {
      for (const [name, value] of Object.entries(
        options.dataset
      )) {
        node.dataset[name] = String(value);
      }
    }

    if (options.children) {
      for (const child of options.children) {
        if (child) node.append(child);
      }
    }

    return node;
  }

  append(parent, child) {
    if (!parent || !child) return false;

    parent.append(child);
    return true;
  }

  clear(container) {
    if (!container) return false;

    container.replaceChildren();
    return true;
  }

  /* -------------------------------------------------------
     BUTTON
     ------------------------------------------------------- */

  createButton(options = {}) {
    const {
      text = "Button",
      variant = "primary",
      size = "medium",
      icon = "",
      disabled = false,
      loading = false,
      fullWidth = false,
      type = "button",
      onClick = null,
      title = ""
    } = options;

    const button = this.element("button", {
      className: [
        UI_COMPONENT_CLASSES.button,
        `ac-button--${variant}`,
        `ac-button--${size}`,
        fullWidth ? "ac-button--full" : ""
      ].filter(Boolean).join(" "),
      attributes: {
        type,
        title,
        disabled: disabled || loading,
        "aria-busy": loading ? "true" : "false"
      }
    });

    if (icon) {
      const iconNode = this.element("span", {
        className: "ac-button__icon",
        text: icon,
        attributes: {
          "aria-hidden": "true"
        }
      });

      button.append(iconNode);
    }

    const label = this.element("span", {
      className: "ac-button__label",
      text: loading ? "Loading..." : text
    });

    button.append(label);

    if (loading) {
      button.append(this.createSpinner("small"));
    }

    if (typeof onClick === "function") {
      button.addEventListener("click", event => {
        if (button.disabled) return;

        this.emit(UI_COMPONENT_EVENTS.BUTTON_CLICK, {
          text,
          event
        });

        onClick(event);
      });
    }

    return button;
  }

  /* -------------------------------------------------------
     CARD
     ------------------------------------------------------- */

  createCard(options = {}) {
    const {
      title = "",
      subtitle = "",
      content = null,
      footer = null,
      variant = "default",
      interactive = false,
      onClick = null
    } = options;

    const card = this.element("article", {
      className: [
        UI_COMPONENT_CLASSES.card,
        `ac-card--${variant}`,
        interactive ? "ac-card--interactive" : ""
      ].filter(Boolean).join(" ")
    });

    if (title || subtitle) {
      const header = this.element("header", {
        className: "ac-card__header"
      });

      if (title) {
        header.append(this.element("h3", {
          className: "ac-card__title",
          text: title
        }));
      }

      if (subtitle) {
        header.append(this.element("p", {
          className: "ac-card__subtitle",
          text: subtitle
        }));
      }

      card.append(header);
    }

    if (content instanceof this.document.defaultView.Node) {
      card.append(content);
    } else if (content !== null && content !== undefined) {
      card.append(this.element("div", {
        className: "ac-card__content",
        text: String(content)
      }));
    }

    if (footer) {
      const footerNode = this.element("footer", {
        className: "ac-card__footer"
      });

      if (footer instanceof this.document.defaultView.Node) {
        footerNode.append(footer);
      } else {
        footerNode.textContent = String(footer);
      }

      card.append(footerNode);
    }

    if (interactive && typeof onClick === "function") {
      card.tabIndex = 0;
      card.setAttribute("role", "button");

      card.addEventListener("click", event => {
        this.emit(UI_COMPONENT_EVENTS.CARD_CLICK, {
          title,
          event
        });

        onClick(event);
      });

      card.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        onClick(event);
      });
    }

    return card;
  }

  /* -------------------------------------------------------
     BADGE
     ------------------------------------------------------- */

  createBadge(text, options = {}) {
    const {
      variant = "default",
      icon = "",
      size = "medium"
    } = options;

    const badge = this.element("span", {
      className: [
        UI_COMPONENT_CLASSES.badge,
        `ac-badge--${variant}`,
        `ac-badge--${size}`
      ].join(" ")
    });

    if (icon) {
      badge.append(this.element("span", {
        className: "ac-badge__icon",
        text: icon,
        attributes: {
          "aria-hidden": "true"
        }
      }));
    }

    badge.append(this.element("span", {
      className: "ac-badge__text",
      text
    }));

    return badge;
  }

  /* -------------------------------------------------------
     AVATAR
     ------------------------------------------------------- */

  createAvatar(options = {}) {
    const {
      name = "Player",
      image = "",
      size = "medium",
      frame = "default",
      status = ""
    } = options;

    const avatar = this.element("div", {
      className: [
        UI_COMPONENT_CLASSES.avatar,
        `ac-avatar--${size}`,
        `ac-avatar--${frame}`
      ].join(" "),
      attributes: {
        role: "img",
        "aria-label": `${name} avatar`
      }
    });

    if (image) {
      const img = this.element("img", {
        attributes: {
          src: image,
          alt: `${name} avatar`,
          loading: "lazy"
        }
      });

      img.addEventListener("error", () => {
        img.remove();
        avatar.append(this.createAvatarInitial(name));
      }, { once: true });

      avatar.append(img);
    } else {
      avatar.append(this.createAvatarInitial(name));
    }

    if (status) {
      avatar.append(this.element("span", {
        className: `ac-avatar__status ac-avatar__status--${status}`,
        attributes: {
          "aria-label": status
        }
      }));
    }

    return avatar;
  }

  createAvatarInitial(name) {
    const initial = String(name || "P")
      .trim()
      .charAt(0)
      .toUpperCase() || "P";

    return this.element("span", {
      className: "ac-avatar__initial",
      text: initial
    });
  }

  /* -------------------------------------------------------
     PROGRESS BAR
     ------------------------------------------------------- */

  createProgressBar(options = {}) {
    const {
      value = 0,
      max = 100,
      label = "",
      showValue = true,
      variant = "gold"
    } = options;

    const safeMax = Math.max(1, Number(max) || 100);
    const safeValue = Math.min(
      safeMax,
      Math.max(0, Number(value) || 0)
    );

    const percentage = (safeValue / safeMax) * 100;

    const wrapper = this.element("div", {
      className: `ac-progress ac-progress--${variant}`
    });

    if (label || showValue) {
      const header = this.element("div", {
        className: "ac-progress__header"
      });

      if (label) {
        header.append(this.element("span", {
          className: "ac-progress__label",
          text: label
        }));
      }

      if (showValue) {
        header.append(this.element("span", {
          className: "ac-progress__value",
          text: `${Math.round(percentage)}%`
        }));
      }

      wrapper.append(header);
    }

    const track = this.element("div", {
      className: "ac-progress__track",
      attributes: {
        role: "progressbar",
        "aria-valuemin": "0",
        "aria-valuemax": String(safeMax),
        "aria-valuenow": String(safeValue)
      }
    });

    const fill = this.element("div", {
      className: "ac-progress__fill"
    });

    fill.style.width = `${percentage}%`;

    track.append(fill);
    wrapper.append(track);

    return wrapper;
  }

  /* -------------------------------------------------------
     SPINNER / LOADER
     ------------------------------------------------------- */

  createSpinner(size = "medium") {
    return this.element("span", {
      className: `${UI_COMPONENT_CLASSES.loader} ac-loader--${size}`,
      attributes: {
        role: "status",
        "aria-label": "Loading"
      }
    });
  }

  createLoadingScreen(message = "Loading...") {
    const screen = this.element("div", {
      className: "ac-loading-screen"
    });

    screen.append(this.createSpinner("large"));

    screen.append(this.element("p", {
      className: "ac-loading-screen__message",
      text: message
    }));

    return screen;
  }

  /* -------------------------------------------------------
     EMPTY STATE
     ------------------------------------------------------- */

  createEmptyState(options = {}) {
    const {
      icon = "♟",
      title = "Nothing here yet",
      message = "",
      action = null
    } = options;

    const container = this.element("div", {
      className: "ac-empty-state"
    });

    container.append(this.element("div", {
      className: "ac-empty-state__icon",
      text: icon,
      attributes: {
        "aria-hidden": "true"
      }
    }));

    container.append(this.element("h3", {
      className: "ac-empty-state__title",
      text: title
    }));

    if (message) {
      container.append(this.element("p", {
        className: "ac-empty-state__message",
        text: message
      }));
    }

    if (action) {
      container.append(action);
    }

    return container;
  }

  /* -------------------------------------------------------
     NOTIFICATIONS
     ------------------------------------------------------- */

  getNotificationContainer() {
    if (this.notificationContainer?.isConnected) {
      return this.notificationContainer;
    }

    this.notificationContainer = this.element("div", {
      className: "ac-notification-container",
      attributes: {
        "aria-live": "polite",
        "aria-relevant": "additions"
      }
    });

    this.document.body.append(this.notificationContainer);

    return this.notificationContainer;
  }

  notify(message, options = {}) {
    const {
      type = "info",
      duration = 3500,
      title = ""
    } = options;

    const container = this.getNotificationContainer();

    const notification = this.element("div", {
      className: [
        UI_COMPONENT_CLASSES.notification,
        `ac-notification--${type}`
      ].join(" "),
      attributes: {
        role: type === "error" ? "alert" : "status"
      }
    });

    if (title) {
      notification.append(this.element("strong", {
        className: "ac-notification__title",
        text: title
      }));
    }

    notification.append(this.element("p", {
      className: "ac-notification__message",
      text: message
    }));

    const closeButton = this.element("button", {
      className: "ac-notification__close",
      text: "×",
      attributes: {
        type: "button",
        "aria-label": "Close notification"
      }
    });

    closeButton.addEventListener("click", () => {
      this.removeNotification(notification);
    });

    notification.append(closeButton);
    container.append(notification);

    this.activeNotifications.add(notification);

    let timeout = null;

    if (duration > 0) {
      timeout = setTimeout(() => {
        this.removeNotification(notification);
      }, duration);
    }

    notification.addEventListener("remove", () => {
      if (timeout) clearTimeout(timeout);
    }, { once: true });

    this.emit(UI_COMPONENT_EVENTS.NOTIFICATION, {
      message,
      type
    });

    return {
      element: notification,
      close: () => this.removeNotification(notification)
    };
  }

  removeNotification(notification) {
    if (!notification) return false;

    notification.dispatchEvent(new Event("remove"));
    notification.remove();

    this.activeNotifications.delete(notification);

    return true;
  }

  clearNotifications() {
    for (const notification of [...this.activeNotifications]) {
      this.removeNotification(notification);
    }
  }

  /* -------------------------------------------------------
     DIVIDER
     ------------------------------------------------------- */

  createDivider(options = {}) {
    const {
      label = "",
      variant = "default"
    } = options;

    const divider = this.element("div", {
      className: `ac-divider ac-divider--${variant}`,
      attributes: {
        role: "separator"
      }
    });

    if (label) {
      divider.append(this.element("span", {
        className: "ac-divider__label",
        text: label
      }));
    }

    return divider;
  }

  /* -------------------------------------------------------
     EVENT HELPERS
     ------------------------------------------------------- */

  emit(eventName, payload = {}) {
    if (typeof this.eventBus?.emit === "function") {
      this.eventBus.emit(eventName, payload);
    }
  }

  /* -------------------------------------------------------
     VALIDATION / DISPOSAL
     ------------------------------------------------------- */

  ensureActive() {
    if (this.disposed) {
      throw new Error("UIComponents has been disposed.");
    }
  }

  dispose() {
    if (this.disposed) return;

    this.clearNotifications();
    this.notificationContainer?.remove();

    this.notificationContainer = null;
    this.eventBus = null;
    this.disposed = true;
  }
}

/* ---------------------------------------------------------
   FACTORY
   --------------------------------------------------------- */

export function createUIComponents(options = {}) {
  return new UIComponents(options);
}

/* ================= FILE 49 END ================= */
      
