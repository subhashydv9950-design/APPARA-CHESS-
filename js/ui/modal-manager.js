
/* =========================================================
   APPARA CHESS — FILE 50
   File: js/ui/modal-manager.js
   Section: UI
   Purpose: Central modal and dialog management
   ========================================================= */

export const MODAL_EVENTS = Object.freeze({
  OPEN: "modal:open",
  CLOSE: "modal:close",
  CONFIRM: "modal:confirm",
  CANCEL: "modal:cancel",
  ERROR: "modal:error"
});

export class ModalManager {
  constructor(options = {}) {
    this.document = options.document || globalThis.document;
    this.eventBus = options.eventBus || null;

    this.container = null;
    this.stack = [];
    this.listeners = new Map();

    this.previousFocus = null;
    this.disposed = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /* -------------------------------------------------------
     INITIALIZATION
     ------------------------------------------------------- */

  initialize() {
    this.ensureActive();

    if (!this.document) {
      throw new Error("Document is not available.");
    }

    if (this.container?.isConnected) {
      return this.container;
    }

    this.container = this.document.createElement("div");
    this.container.className = "ac-modal-root";
    this.container.setAttribute("data-modal-root", "");

    this.document.body.append(this.container);

    this.document.addEventListener(
      "keydown",
      this.handleKeyDown
    );

    return this.container;
  }

  /* -------------------------------------------------------
     OPEN MODAL
     ------------------------------------------------------- */

  open(options = {}) {
    this.ensureActive();
    this.initialize();

    const {
      id = this.createId(),
      title = "",
      content = null,
      footer = null,
      size = "medium",
      closable = true,
      closeOnBackdrop = true,
      closeOnEscape = true,
      showCloseButton = true,
      className = "",
      onClose = null
    } = options;

    const existing = this.getModal(id);

    if (existing) {
      return existing;
    }

    this.previousFocus = this.document.activeElement;

    const backdrop = this.document.createElement("div");
    backdrop.className = "ac-modal-backdrop";
    backdrop.dataset.modalId = id;

    const dialog = this.document.createElement("section");
    dialog.className = [
      "ac-modal",
      `ac-modal--${size}`,
      className
    ].filter(Boolean).join(" ");

    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    if (title) {
      dialog.setAttribute("aria-label", title);
    } else {
      dialog.setAttribute("aria-label", "Dialog");
    }

    const header = this.document.createElement("header");
    header.className = "ac-modal__header";

    if (title) {
      const heading = this.document.createElement("h2");
      heading.className = "ac-modal__title";
      heading.textContent = title;
      dialog.setAttribute("aria-labelledby", `${id}-title`);
      heading.id = `${id}-title`;
      header.append(heading);
    }

    if (showCloseButton && closable) {
      const closeButton = this.createButton("×", {
        className: "ac-modal__close",
        label: "Close dialog"
      });

      closeButton.addEventListener("click", () => {
        this.close(id, "close-button");
      });

      header.append(closeButton);
    }

    if (title || showCloseButton) {
      dialog.append(header);
    }

    const body = this.document.createElement("div");
    body.className = "ac-modal__body";

    this.appendContent(body, content);

    dialog.append(body);

    if (footer) {
      const footerElement = this.document.createElement("footer");
      footerElement.className = "ac-modal__footer";

      this.appendContent(footerElement, footer);

      dialog.append(footerElement);
    }

    backdrop.append(dialog);
    this.container.append(backdrop);

    const modal = {
      id,
      backdrop,
      dialog,
      body,
      title,
      closable,
      closeOnBackdrop,
      closeOnEscape,
      onClose,
      openedAt: Date.now()
    };

    this.stack.push(modal);

    if (closeOnBackdrop) {
      backdrop.addEventListener("click", event => {
        if (event.target === backdrop) {
          this.close(id, "backdrop");
        }
      });
    }

    this.updateStackState();

    const focusTarget = dialog.querySelector(
      "button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );

    (focusTarget || dialog).focus?.();

    this.emit(MODAL_EVENTS.OPEN, {
      id,
      title,
      stackSize: this.stack.length
    });

    return modal;
  }

  /* -------------------------------------------------------
     CLOSE MODAL
     ------------------------------------------------------- */

  close(id = null, reason = "programmatic") {
    const modal = id
      ? this.getModal(id)
      : this.stack[this.stack.length - 1];

    if (!modal) return false;

    if (!modal.closable && reason !== "force") {
      return false;
    }

    const index = this.stack.indexOf(modal);

    if (index === -1) return false;

    this.stack.splice(index, 1);
    modal.backdrop.remove();

    try {
      modal.onClose?.(reason);
    } catch (error) {
      this.emit(MODAL_EVENTS.ERROR, {
        id: modal.id,
        error
      });
    }

    this.updateStackState();

    this.emit(MODAL_EVENTS.CLOSE, {
      id: modal.id,
      reason,
      stackSize: this.stack.length
    });

    if (this.stack.length === 0) {
      this.previousFocus?.focus?.();
      this.previousFocus = null;
    } else {
      this.stack[this.stack.length - 1].dialog.focus?.();
    }

    return true;
  }

  closeAll(reason = "programmatic") {
    const modals = [...this.stack].reverse();

    for (const modal of modals) {
      this.close(modal.id, "force");
    }

    return true;
  }

  /* -------------------------------------------------------
     CONFIRMATION DIALOG
     ------------------------------------------------------- */

  confirm(options = {}) {
    const {
      title = "Are you sure?",
      message = "Please confirm this action.",
      confirmText = "Confirm",
      cancelText = "Cancel",
      danger = false
    } = options;

    return new Promise(resolve => {
      let settled = false;

      const finish = value => {
        if (settled) return;

        settled = true;
        resolve(value);
      };

      const content = this.document.createElement("div");
      content.className = "ac-confirm-dialog";

      const messageElement = this.document.createElement("p");
      messageElement.className = "ac-confirm-dialog__message";
      messageElement.textContent = message;

      content.append(messageElement);

      const footer = this.document.createElement("div");
      footer.className = "ac-modal-actions";

      const cancelButton = this.createButton(cancelText, {
        className: "ac-button ac-button--secondary"
      });

      cancelButton.addEventListener("click", () => {
        this.emit(MODAL_EVENTS.CANCEL, { title });
        this.close(modalId, "cancel");
        finish(false);
      });

      const confirmButton = this.createButton(confirmText, {
        className: danger
          ? "ac-button ac-button--danger"
          : "ac-button ac-button--primary"
      });

      confirmButton.addEventListener("click", () => {
        this.emit(MODAL_EVENTS.CONFIRM, { title });
        this.close(modalId, "confirm");
        finish(true);
      });

      footer.append(cancelButton, confirmButton);

      const modalId = this.createId();

      this.open({
        id: modalId,
        title,
        content,
        footer,
        closable: true,
        closeOnBackdrop: false
      });

      const modal = this.getModal(modalId);

      modal.onClose = reason => {
        if (reason !== "confirm") {
          finish(false);
        }
      };
    });
  }

  /* -------------------------------------------------------
     ALERT DIALOG
     ------------------------------------------------------- */

  alert(options = {}) {
    const {
      title = "Notice",
      message = "",
      buttonText = "OK",
      variant = "info"
    } = options;

    return new Promise(resolve => {
      let settled = false;

      const finish = () => {
        if (settled) return;

        settled = true;
        resolve(true);
      };

      const content = this.document.createElement("div");
      content.className = `ac-alert-dialog ac-alert-dialog--${variant}`;

      const messageElement = this.document.createElement("p");
      messageElement.className = "ac-alert-dialog__message";
      messageElement.textContent = message;

      content.append(messageElement);

      const footer = this.document.createElement("div");
      footer.className = "ac-modal-actions";

      const button = this.createButton(buttonText, {
        className: "ac-button ac-button--primary"
      });

      const modalId = this.createId();

      button.addEventListener("click", () => {
        this.close(modalId, "confirm");
        finish();
      });

      footer.append(button);

      this.open({
        id: modalId,
        title,
        content,
        footer
      });

      const modal = this.getModal(modalId);

      modal.onClose = finish;
    });
  }

  /* -------------------------------------------------------
     CONTENT MANAGEMENT
     ------------------------------------------------------- */

  setContent(id, content) {
    const modal = this.getModal(id);

    if (!modal) return false;

    modal.body.replaceChildren();
    this.appendContent(modal.body, content);

    return true;
  }

  setTitle(id, title) {
    const modal = this.getModal(id);

    if (!modal) return false;

    const heading = modal.dialog.querySelector(
      ".ac-modal__title"
    );

    if (heading) {
      heading.textContent = title;
    }

    modal.title = title;

    return true;
  }

  getModal(id) {
    return this.stack.find(modal => modal.id === id) || null;
  }

  getActiveModal() {
    return this.stack[this.stack.length - 1] || null;
  }

  getStack() {
    return this.stack.map(modal => ({
      id: modal.id,
      title: modal.title,
      openedAt: modal.openedAt
    }));
  }

  /* -------------------------------------------------------
     KEYBOARD HANDLING
     ------------------------------------------------------- */

  handleKeyDown(event) {
    const modal = this.getActiveModal();

    if (!modal) return;

    if (event.key === "Escape") {
      if (modal.closeOnEscape && modal.closable) {
        event.preventDefault();
        this.close(modal.id, "escape");
      }

      return;
    }

    if (event.key !== "Tab") return;

    const focusable = [
      ...modal.dialog.querySelectorAll(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])"
      )
    ].filter(element => element.offsetParent !== null);

    if (focusable.length === 0) {
      event.preventDefault();
      modal.dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      this.document.activeElement === last
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  /* -------------------------------------------------------
     HELPERS
     ------------------------------------------------------- */

  createButton(text, options = {}) {
    const button = this.document.createElement("button");

    button.type = "button";
    button.className = options.className || "ac-modal-button";
    button.textContent = text;

    if (options.label) {
      button.setAttribute("aria-label", options.label);
    }

    return button;
  }

  appendContent(container, content) {
    if (content === null || content === undefined) {
      return;
    }

    if (typeof content === "string" ||
        typeof content === "number") {
      container.textContent = String(content);
      return;
    }

    if (content instanceof this.document.defaultView.Node) {
      container.append(content);
      return;
    }

    if (Array.isArray(content)) {
      for (const item of content) {
        this.appendContent(container, item);
      }
    }
  }

  updateStackState() {
    if (!this.container) return;

    this.container.dataset.modalCount = String(
      this.stack.length
    );

    this.stack.forEach((modal, index) => {
      modal.backdrop.style.zIndex = String(1000 + index);
      modal.backdrop.setAttribute(
        "aria-hidden",
        index === this.stack.length - 1 ? "false" : "true"
      );
    });

    if (this.document.body) {
      this.document.body.classList.toggle(
        "ac-modal-open",
        this.stack.length > 0
      );
    }
  }

  createId() {
    return `ac-modal-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  emit(eventName, payload = {}) {
    this.eventBus?.emit?.(eventName, payload);
  }

  ensureActive() {
    if (this.disposed) {
      throw new Error("ModalManager has been disposed.");
    }
  }

  /* -------------------------------------------------------
     DISPOSAL
     ------------------------------------------------------- */

  dispose() {
    if (this.disposed) return;

    this.closeAll("force");

    this.document?.removeEventListener(
      "keydown",
      this.handleKeyDown
    );

    this.container?.remove();
    this.container = null;

    this.listeners.clear();
    this.eventBus = null;
    this.disposed = true;
  }
}

/* ---------------------------------------------------------
   FACTORY
   --------------------------------------------------------- */

export function createModalManager(options = {}) {
  return new ModalManager(options);
}

/* ================= FILE 50 END ================= */
        
