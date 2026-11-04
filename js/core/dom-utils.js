
/* =========================================================
   APPARA CHESS — DOM UTILITIES
   FILE: js/core/dom-utils.js
   PURPOSE: Reusable and safe DOM operations
   ========================================================= */

function getDocument() {
  if (typeof document === "undefined") {
    throw new Error("DOM is not available in this environment.");
  }

  return document;
}

function validateElement(element) {
  return (
    element !== null &&
    typeof element === "object" &&
    element.nodeType === 1
  );
}

export const DOMUtils = {
  /**
   * Find one element using a CSS selector.
   */
  $(selector, parent = null) {
    if (typeof selector !== "string" || !selector.trim()) {
      return null;
    }

    const root = parent || getDocument();

    if (typeof root.querySelector !== "function") {
      return null;
    }

    return root.querySelector(selector);
  },

  /**
   * Find multiple elements.
   */
  $$(selector, parent = null) {
    if (typeof selector !== "string" || !selector.trim()) {
      return [];
    }

    const root = parent || getDocument();

    if (typeof root.querySelectorAll !== "function") {
      return [];
    }

    return [...root.querySelectorAll(selector)];
  },

  /**
   * Find an element by its ID.
   */
  byId(id) {
    if (typeof id !== "string" || !id.trim()) {
      return null;
    }

    return getDocument().getElementById(id);
  },

  /**
   * Create an HTML element.
   */
  create(tagName, options = {}) {
    if (
      typeof tagName !== "string" ||
      !/^[a-z][a-z0-9-]*$/i.test(tagName)
    ) {
      throw new TypeError("Invalid HTML tag name.");
    }

    const element = getDocument().createElement(tagName);

    if (options.className) {
      element.className = String(options.className);
    }

    if (options.id) {
      element.id = String(options.id);
    }

    if (options.text !== undefined) {
      element.textContent = String(options.text);
    }

    if (options.attributes && typeof options.attributes === "object") {
      for (const [name, value] of Object.entries(options.attributes)) {
        if (value === null || value === undefined) continue;

        element.setAttribute(name, String(value));
      }
    }

    return element;
  },

  /**
   * Set plain text safely.
   */
  setText(element, value) {
    if (!validateElement(element)) return false;

    element.textContent = value === null || value === undefined
      ? ""
      : String(value);

    return true;
  },

  /**
   * Read plain text.
   */
  getText(element) {
    if (!validateElement(element)) return "";

    return element.textContent || "";
  },

  /**
   * Set an element's HTML content.
   * Use only for trusted, internally generated markup.
   */
  setHTML(element, trustedHTML) {
    if (!validateElement(element)) return false;

    element.innerHTML = String(trustedHTML ?? "");

    return true;
  },

  /**
   * Add one or more CSS classes.
   */
  addClass(element, ...classNames) {
    if (!validateElement(element)) return false;

    const validNames = classNames
      .flat()
      .filter(name => typeof name === "string" && name.trim());

    element.classList.add(...validNames);

    return true;
  },

  /**
   * Remove CSS classes.
   */
  removeClass(element, ...classNames) {
    if (!validateElement(element)) return false;

    const validNames = classNames
      .flat()
      .filter(name => typeof name === "string" && name.trim());

    element.classList.remove(...validNames);

    return true;
  },

  /**
   * Toggle one CSS class.
   */
  toggleClass(element, className, force) {
    if (!validateElement(element)) return false;

    if (typeof className !== "string" || !className.trim()) {
      return false;
    }

    return element.classList.toggle(className, force);
  },

  /**
   * Check whether an element has a CSS class.
   */
  hasClass(element, className) {
    if (!validateElement(element)) return false;

    return element.classList.contains(className);
  },

  /**
   * Show an element.
   */
  show(element, display = "") {
    if (!validateElement(element)) return false;

    element.hidden = false;
    element.style.display = display;

    return true;
  },

  /**
   * Hide an element.
   */
  hide(element) {
    if (!validateElement(element)) return false;

    element.hidden = true;
    element.style.display = "none";

    return true;
  },

  /**
   * Set a CSS property.
   */
  setStyle(element, property, value) {
    if (!validateElement(element)) return false;

    if (
      typeof property !== "string" ||
      !property.trim() ||
      !element.style
    ) {
      return false;
    }

    element.style.setProperty(property, String(value));

    return true;
  },

  /**
   * Set an HTML attribute.
   */
  setAttribute(element, name, value) {
    if (!validateElement(element)) return false;

    if (typeof name !== "string" || !name.trim()) {
      return false;
    }

    if (value === null || value === undefined) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, String(value));
    }

    return true;
  },

  /**
   * Read an HTML attribute.
   */
  getAttribute(element, name) {
    if (!validateElement(element)) return null;

    return element.getAttribute(name);
  },

  /**
   * Attach an event listener.
   * Returns an unsubscribe function.
   */
  on(element, eventName, callback, options = false) {
    if (!validateElement(element)) {
      throw new TypeError("A valid DOM element is required.");
    }

    if (
      typeof eventName !== "string" ||
      typeof callback !== "function"
    ) {
      throw new TypeError("Invalid event listener arguments.");
    }

    element.addEventListener(eventName, callback, options);

    return () => {
      element.removeEventListener(eventName, callback, options);
    };
  },

  /**
   * Remove all child elements.
   */
  clear(element) {
    if (!validateElement(element)) return false;

    element.replaceChildren();

    return true;
  },

  /**
   * Append one or more child nodes.
   */
  append(parent, ...children) {
    if (!validateElement(parent)) return false;

    const validChildren = children.filter(child =>
      child &&
      typeof child.nodeType === "number"
    );

    parent.append(...validChildren);

    return true;
  },

  /**
   * Replace all children with supplied nodes.
   */
  replaceChildren(parent, ...children) {
    if (!validateElement(parent)) return false;

    const validChildren = children.filter(child =>
      child &&
      typeof child.nodeType === "number"
    );

    parent.replaceChildren(...validChildren);

    return true;
  },

  /**
   * Remove an element from the DOM.
   */
  remove(element) {
    if (!validateElement(element)) return false;

    element.remove();

    return true;
  },

  /**
   * Get an element's bounding rectangle.
   */
  getBounds(element) {
    if (!validateElement(element)) return null;

    const rect = element.getBoundingClientRect();

    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left
    };
  },

  /**
   * Focus an element safely.
   */
  focus(element) {
    if (!validateElement(element)) return false;

    if (typeof element.focus !== "function") return false;

    element.focus();

    return true;
  },

  /**
   * Check whether an element is currently visible.
   */
  isVisible(element) {
    if (!validateElement(element)) return false;

    return (
      !element.hidden &&
      element.style.display !== "none" &&
      element.getClientRects().length > 0
    );
  },

  /**
   * Wait until the DOM is ready.
   */
  ready(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function.");
    }

    const doc = getDocument();

    if (doc.readyState === "loading") {
      doc.addEventListener("DOMContentLoaded", callback, {
        once: true
      });
    } else {
      callback();
    }
  }
};

/* =========================================================
   FILE END: js/core/dom-utils.js
   ========================================================= */
    
