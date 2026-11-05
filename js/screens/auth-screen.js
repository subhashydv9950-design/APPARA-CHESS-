/* =========================================================
   APPARA CHESS
   CORRECTION 13A — PART 1/2
   FILE: js/screens/auth-screen.js
   ========================================================= */

export class AuthScreen {
  constructor(options = {}) {
    this.authService = options.authService || null;
    this.modalManager = options.modalManager || null;
    this.components = options.components || null;
    this.navigation = options.navigation || null;
    this.onAuthSuccess = options.onAuthSuccess || null;

    this.container = null;
    this.mode = "login";
    this.loading = false;
    this.disposed = false;
    this.unsubscribeAuth = null;
  }

  initialize(container) {
    this.ensureActive();

    if (!container) {
      throw new Error("Auth screen container is required.");
    }

    if (!this.authService) {
      throw new Error("AuthService is not connected.");
    }

    this.container = container;
    this.render();

    // AuthService emits "userChanged", not "auth:state-changed".
    this.unsubscribeAuth = this.authService.on?.(
      "userChanged",
      payload => {
        if (payload?.user) {
          this.handleSuccess(payload.user);
        }
      }
    );

    return this;
  }

  render() {
    if (!this.container) return false;

    this.container.replaceChildren();
    this.container.className = "ac-auth-screen";

    const background = this.createElement("div", {
      className: "ac-auth-background"
    });

    const panel = this.createElement("main", {
      className: "ac-auth-panel"
    });

    const brand = this.createElement("div", {
      className: "ac-auth-brand"
    });

    brand.append(
      this.createElement("div", {
        className: "ac-auth-logo",
        text: "♔"
      }),
      this.createElement("div", {
        className: "ac-auth-brand-name",
        text: "APPARA CHESS"
      }),
      this.createElement("div", {
        className: "ac-auth-tagline",
        text: "THE ROYAL CHESS EXPERIENCE"
      })
    );

    const heading = this.createElement("div", {
      className: "ac-auth-heading"
    });

    heading.append(
      this.createElement("h1", {
        text: this.mode === "login"
          ? "Welcome Back"
          : "Create Your Account"
      }),
      this.createElement("p", {
        text: this.mode === "login"
          ? "Enter the royal arena."
          : "Join the APPARA CHESS community."
      })
    );

    panel.append(
      brand,
      heading,
      this.createModeTabs(),
      this.createEmailForm(),
      this.createDivider("OR CONTINUE WITH"),
      this.createProviderButtons(),
      this.createGuestButton(),
      this.createFooter()
    );

    background.append(panel);
    this.container.append(background);

    return true;
  }

  createModeTabs() {
    const tabs = this.createElement("div", {
      className: "ac-auth-tabs"
    });

    for (const mode of ["login", "signup"]) {
      const button = this.createElement("button", {
        className: this.mode === mode
          ? "ac-auth-tab active"
          : "ac-auth-tab",
        text: mode === "login" ? "Login" : "Sign Up"
      });

      button.type = "button";
      button.addEventListener("click", () => {
        this.setMode(mode);
      });

      tabs.append(button);
    }

    return tabs;
  }

  setMode(mode) {
    if (!["login", "signup"].includes(mode)) {
      return false;
    }

    if (this.loading) return false;

    this.mode = mode;
    this.render();

    return true;
  }

  createEmailForm() {
    const form = this.createElement("form", {
      className: "ac-auth-form"
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      this.submitEmailForm(form);
    });

    if (this.mode === "signup") {
      form.append(this.createField({
        label: "Display Name",
        name: "displayName",
        placeholder: "Enter your name",
        type: "text",
        required: true,
        maxLength: 24
      }));
    }

    form.append(
      this.createField({
        label: "Email Address",
        name: "email",
        placeholder: "you@example.com",
        type: "email",
        required: true,
        autocomplete: "email"
      }),
      this.createField({
        label: "Password",
        name: "password",
        placeholder: "Enter password",
        type: "password",
        required: true,
        minLength: 6
      })
    );

    if (this.mode === "signup") {
      form.append(this.createField({
        label: "Confirm Password",
        name: "confirmPassword",
        placeholder: "Confirm password",
        type: "password",
        required: true,
        minLength: 6
      }));
    }

    if (this.mode === "login") {
      const forgot = this.createElement("button", {
        className: "ac-auth-forgot",
        text: "Forgot Password?"
      });

      forgot.type = "button";
      forgot.addEventListener("click", () => {
        this.showPasswordReset();
      });

      form.append(forgot);
    }

    const submit = this.createElement("button", {
      className: "ac-auth-submit",
      text: this.mode === "login"
        ? "ENTER THE ARENA"
        : "CREATE ACCOUNT"
    });

    submit.type = "submit";
    submit.dataset.authSubmit = "true";

    form.append(submit);

    return form;
  }

  createField(options = {}) {
    const wrapper = this.createElement("div", {
      className: "ac-auth-field"
    });

    const label = this.createElement("label", {
      text: options.label
    });

    const input = this.createElement("input", {
      className: "ac-auth-input"
    });

    input.name = options.name;
    input.type = options.type || "text";
    input.placeholder = options.placeholder || "";
    input.required = Boolean(options.required);

    if (options.minLength) {
      input.minLength = options.minLength;
    }

    if (options.maxLength) {
      input.maxLength = options.maxLength;
    }

    if (options.autocomplete) {
      input.autocomplete = options.autocomplete;
    }

    label.htmlFor = `auth-${options.name}`;
    input.id = label.htmlFor;

    wrapper.append(label, input);

    return wrapper;
  }

  async submitEmailForm(form) {
    if (this.loading) return false;

    const data = new FormData(form);

    const email = String(data.get("email") || "")
      .trim()
      .toLowerCase();

    const password = String(data.get("password") || "");

    if (!email || !password) {
      this.showMessage("Enter email and password.", "error");
      return false;
    }

    this.setLoading(true);

    try {
      let result;

      if (this.mode === "signup") {
        const displayName = String(
          data.get("displayName") || ""
        ).trim();

        const confirmPassword = String(
          data.get("confirmPassword") || ""
        );

        if (displayName.length < 2) {
          throw new Error("Name must contain at least 2 characters.");
        }

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        // AuthService expects ONE object argument.
        result = await this.authService.registerWithEmail({
          email,
          password,
          displayName
        });
      } else {
        // AuthService expects ONE object argument.
        result = await this.authService.loginWithEmail({
          email,
          password
        });
      }

      if (!result || result.success === false) {
        throw new Error(
          result?.message || "Authentication failed."
        );
      }

      if (result.user) {
        await this.handleSuccess(result.user);
      }

      return true;

    } catch (error) {
      this.showMessage(this.getErrorMessage(error), "error");
      return false;

    } finally {
      this.setLoading(false);
    }
  }

  async showPasswordReset() {
    const email = this.container
      ?.querySelector('[name="email"]')
      ?.value?.trim();

    if (!email) {
      this.showMessage("Enter your email address first.", "warning");
      return false;
    }

    try {
      const result =
        await this.authService.requestPasswordReset(email);

      if (result?.success === false) {
        throw new Error(result.message || "Reset request failed.");
      }

      this.showMessage(
        "Password reset email has been requested.",
        "success"
      );

      return true;

    } catch (error) {
      this.showMessage(this.getErrorMessage(error), "error");
      return false;
    }
  }

/* =========================================================
   CORRECTION 13A COMPLETE
   FILE NOT COMPLETE YET
   NEXT: CORRECTION 13B — PART 2/2
   ========================================================= */
/* =========================================================
   APPARA CHESS
   CORRECTION 13B — PART 2/2
   FILE: js/screens/auth-screen.js
   CONTINUE INSIDE AuthScreen CLASS
   ========================================================= */

  createProviderButtons() {
    const container = this.createElement("div", {
      className: "ac-auth-providers"
    });

    const providers = [
      { name: "google", label: "Continue with Google", icon: "G" },
      { name: "facebook", label: "Continue with Facebook", icon: "f" }
    ];

    for (const provider of providers) {
      const button = this.createElement("button", {
        className: `ac-auth-provider ac-auth-provider--${provider.name}`
      });

      button.type = "button";

      button.append(
        this.createElement("span", {
          className: "ac-auth-provider__icon",
          text: provider.icon
        }),
        this.createElement("span", {
          text: provider.label
        })
      );

      button.addEventListener("click", () => {
        this.loginWithProvider(provider.name);
      });

      container.append(button);
    }

    const phoneButton = this.createElement("button", {
      className: "ac-auth-phone",
      text: "Continue with Mobile Number"
    });

    phoneButton.type = "button";
    phoneButton.addEventListener("click", () => {
      this.showPhoneLogin();
    });

    container.append(phoneButton);

    return container;
  }

  async loginWithProvider(provider) {
    if (this.loading) return false;

    this.setLoading(true);

    try {
      let result;

      if (provider === "google") {
        result = await this.authService.loginWithGoogle();
      } else if (provider === "facebook") {
        result = await this.authService.loginWithFacebook();
      } else {
        throw new Error("Unsupported login provider.");
      }

      if (!result || result.success === false) {
        throw new Error(result?.message || "Login failed.");
      }

      if (result.user) {
        await this.handleSuccess(result.user);
      }

      return true;

    } catch (error) {
      this.showMessage(this.getErrorMessage(error), "error");
      return false;

    } finally {
      this.setLoading(false);
    }
  }

  showPhoneLogin() {
    const content = this.createElement("div", {
      className: "ac-phone-login"
    });

    const phoneInput = this.createElement("input", {
      className: "ac-auth-input",
      attributes: {
        type: "tel",
        placeholder: "+91 Mobile Number",
        autocomplete: "tel"
      }
    });

    const otpInput = this.createElement("input", {
      className: "ac-auth-input",
      attributes: {
        type: "text",
        placeholder: "Enter 6-digit OTP",
        inputmode: "numeric",
        autocomplete: "one-time-code"
      }
    });

    otpInput.hidden = true;

    const recaptcha = this.createElement("div", {
      attributes: {
        id: "ac-phone-recaptcha"
      }
    });

    const sendButton = this.createElement("button", {
      className: "ac-auth-submit",
      text: "SEND OTP"
    });

    sendButton.type = "button";

    const verifyButton = this.createElement("button", {
      className: "ac-auth-submit",
      text: "VERIFY OTP"
    });

    verifyButton.type = "button";
    verifyButton.hidden = true;

    const status = this.createElement("p", {
      className: "ac-auth-phone-status"
    });

    content.append(
      phoneInput,
      recaptcha,
      otpInput,
      sendButton,
      verifyButton,
      status
    );

    sendButton.addEventListener("click", async () => {
      const phone = phoneInput.value.trim();

      if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
        status.textContent = "Enter number with country code, e.g. +91...";
        return;
      }

      sendButton.disabled = true;

      try {
        // AuthService uses sendPhoneOTP and containerId.
        const result = await this.authService.sendPhoneOTP(phone, {
          containerId: "ac-phone-recaptcha"
        });

        if (!result || result.success === false) {
          throw new Error(result?.message || "OTP could not be sent.");
        }

        otpInput.hidden = false;
        verifyButton.hidden = false;
        status.textContent = "OTP sent. Enter the verification code.";

      } catch (error) {
        status.textContent = this.getErrorMessage(error);

      } finally {
        sendButton.disabled = false;
      }
    });

    verifyButton.addEventListener("click", async () => {
      const code = otpInput.value.trim();

      if (!/^\d{6}$/.test(code)) {
        status.textContent = "Enter the 6-digit OTP.";
        return;
      }

      verifyButton.disabled = true;

      try {
        // AuthService expects only the OTP code.
        const result = await this.authService.verifyPhoneOTP(code);

        if (!result?.user || result.success === false) {
          throw new Error("Phone verification failed.");
        }

        this.closePhoneDialog();
        await this.handleSuccess(result.user);

      } catch (error) {
        status.textContent = this.getErrorMessage(error);

      } finally {
        verifyButton.disabled = false;
      }
    });

    this.phoneDialog = content;

    if (this.modalManager?.open) {
      this.modalManager.open({
        id: "ac-phone-login",
        title: "Mobile Login",
        content,
        size: "small"
      });
    } else {
      this.container?.querySelector(".ac-auth-panel")
        ?.append(content);
    }
  }

  closePhoneDialog() {
    this.modalManager?.close?.(
      "ac-phone-login",
      "verified"
    );

    this.phoneDialog?.remove();
    this.phoneDialog = null;
  }

  createGuestButton() {
    const button = this.createElement("button", {
      className: "ac-auth-guest",
      text: "Continue as Offline Guest"
    });

    button.type = "button";
    button.addEventListener("click", () => {
      this.startGuestMode();
    });

    return button;
  }

  startGuestMode() {
    const guest = {
      uid: `guest-${Date.now()}`,
      playerId: `AC-GUEST-${Date.now().toString(36).toUpperCase()}`,
      displayName: "Guest Player",
      isGuest: true,
      isAuthenticated: false
    };

    this.handleSuccess(guest, { guest: true });

    return guest;
  }

  async handleSuccess(user, options = {}) {
    if (!user) return false;

    try {
      await this.onAuthSuccess?.(user, options);

      this.showMessage(
        options.guest ? "Guest session started." : "Login successful.",
        "success"
      );

      if (options.guest) {
        await this.navigation?.navigate?.("home", {
          guest: true
        });
      }

      return true;

    } catch (error) {
      this.showMessage(
        "Account opened, but the next screen could not load.",
        "warning"
      );

      return false;
    }
  }

  createDivider(text) {
    const divider = this.createElement("div", {
      className: "ac-auth-divider"
    });

    divider.append(
      this.createElement("span", {}),
      this.createElement("p", { text }),
      this.createElement("span", {})
    );

    return divider;
  }

  createFooter() {
    const footer = this.createElement("footer", {
      className: "ac-auth-footer"
    });

    footer.append(
      this.createElement("p", {
        text: "By continuing, you agree to our Terms and Privacy Policy."
      }),
      this.createElement("span", {
        text: "APPARA CHESS · The Royal Chess Experience"
      })
    );

    return footer;
  }

  setLoading(value) {
    this.loading = Boolean(value);

    this.container?.querySelectorAll(
      "[data-auth-submit], .ac-auth-provider, .ac-auth-guest"
    ).forEach(button => {
      button.disabled = this.loading;
    });

    const submit = this.container?.querySelector("[data-auth-submit]");

    if (submit) {
      submit.textContent = this.loading
        ? "PLEASE WAIT..."
        : this.mode === "login"
          ? "ENTER THE ARENA"
          : "CREATE ACCOUNT";
    }
  }

  showMessage(message, type = "info") {
    if (this.components?.notify) {
      this.components.notify(message, { type });
      return;
    }

    let box = this.container?.querySelector(".ac-auth-message");

    if (!box) {
      box = this.createElement("div", {
        className: "ac-auth-message"
      });

      this.container?.querySelector(".ac-auth-panel")?.append(box);
    }

    if (box) {
      box.textContent = message;
      box.dataset.type = type;
    }
  }

  getErrorMessage(error) {
    const messages = {
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect email or password.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/email-already-in-use": "This email is already registered.",
      "auth/weak-password": "Choose a stronger password.",
      "auth/network-request-failed": "Network connection failed.",
      "auth/popup-closed-by-user": "Login popup was closed.",
      "auth/popup-blocked": "Your browser blocked the login popup.",
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/operation-not-allowed": "This login method is not enabled."
    };

    return messages[error?.code] ||
      error?.message ||
      "Something went wrong. Please try again.";
  }

  createElement(tag, options = {}) {
    const documentRef =
      this.container?.ownerDocument || globalThis.document;

    const element = documentRef.createElement(tag);

    if (options.className) {
      element.className = options.className;
    }

    if (options.text !== undefined) {
      element.textContent = String(options.text);
    }

    if (options.attributes) {
      for (const [key, value] of Object.entries(options.attributes)) {
        element.setAttribute(key, String(value));
      }
    }

    return element;
  }

  ensureActive() {
    if (this.disposed) {
      throw new Error("AuthScreen has been disposed.");
    }
  }

  dispose() {
    if (this.disposed) return;

    this.unsubscribeAuth?.();

    this.container?.replaceChildren();

    this.container = null;
    this.phoneDialog = null;
    this.authService = null;
    this.modalManager = null;
    this.components = null;
    this.navigation = null;

    this.disposed = true;
  }
}

export function createAuthScreen(options = {}) {
  return new AuthScreen(options);
}

/* =========================================================
   CORRECTION 13B COMPLETE
   FULL FILE COMPLETE — CORRECTION NUMBER 13
   ========================================================= */
