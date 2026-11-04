
/* =========================================================
   APPARA CHESS — FILE 52
   File: js/screens/auth-screen.js
   Section: Screens
   Purpose: Login and registration screen
   ========================================================= */

export class AuthScreen {
  constructor(options = {}) {
    this.authService = options.authService || null;
    this.modalManager = options.modalManager || null;
    this.components = options.components || null;
    this.navigation = options.navigation || null;

    this.container = null;
    this.mode = "login";
    this.loading = false;
    this.disposed = false;

    this.onAuthSuccess =
      options.onAuthSuccess || null;

    this.unsubscribeAuth = null;
  }

  /* -------------------------------------------------------
     INITIALIZATION
     ------------------------------------------------------- */

  initialize(container) {
    this.ensureActive();

    if (!container) {
      throw new Error("Auth screen container is required.");
    }

    this.container = container;

    this.render();

    if (this.authService?.on) {
      this.unsubscribeAuth = this.authService.on(
        "auth:state-changed",
        payload => {
          if (payload?.user) {
            this.handleSuccess(payload.user);
          }
        }
      );
    }

    return this;
  }

  /* -------------------------------------------------------
     MAIN RENDER
     ------------------------------------------------------- */

  render() {
    if (!this.container) return false;

    this.container.replaceChildren();
    this.container.className = "ac-auth-screen";

    const background = this.createElement("div", {
      className: "ac-auth-background"
    });

    const glowOne = this.createElement("div", {
      className: "ac-auth-glow ac-auth-glow--one"
    });

    const glowTwo = this.createElement("div", {
      className: "ac-auth-glow ac-auth-glow--two"
    });

    background.append(glowOne, glowTwo);

    const panel = this.createElement("main", {
      className: "ac-auth-panel"
    });

    panel.append(this.createBrand());

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
          ? "Enter the royal arena and continue your journey."
          : "Join APPARA CHESS and begin your royal journey."
      })
    );

    panel.append(heading);
    panel.append(this.createModeTabs());
    panel.append(this.createEmailForm());
    panel.append(this.createDivider("OR CONTINUE WITH"));
    panel.append(this.createProviderButtons());
    panel.append(this.createGuestButton());
    panel.append(this.createFooter());

    background.append(panel);
    this.container.append(background);

    return true;
  }

  /* -------------------------------------------------------
     BRAND
     ------------------------------------------------------- */

  createBrand() {
    const brand = this.createElement("div", {
      className: "ac-auth-brand"
    });

    const logo = this.createElement("div", {
      className: "ac-auth-logo",
      text: "♔"
    });

    const name = this.createElement("div", {
      className: "ac-auth-brand-name",
      text: "APPARA CHESS"
    });

    const tagline = this.createElement("div", {
      className: "ac-auth-tagline",
      text: "THE ROYAL CHESS EXPERIENCE"
    });

    brand.append(logo, name, tagline);

    return brand;
  }

  /* -------------------------------------------------------
     LOGIN / SIGNUP TABS
     ------------------------------------------------------- */

  createModeTabs() {
    const tabs = this.createElement("div", {
      className: "ac-auth-tabs"
    });

    const loginButton = this.createElement("button", {
      text: "Login",
      className: this.mode === "login"
        ? "ac-auth-tab active"
        : "ac-auth-tab"
    });

    const signupButton = this.createElement("button", {
      text: "Sign Up",
      className: this.mode === "signup"
        ? "ac-auth-tab active"
        : "ac-auth-tab"
    });

    loginButton.type = "button";
    signupButton.type = "button";

    loginButton.addEventListener("click", () => {
      this.setMode("login");
    });

    signupButton.addEventListener("click", () => {
      this.setMode("signup");
    });

    tabs.append(loginButton, signupButton);

    return tabs;
  }

  setMode(mode) {
    if (!["login", "signup"].includes(mode)) {
      return false;
    }

    if (this.mode === mode) return true;

    this.mode = mode;
    this.render();

    return true;
  }

  /* -------------------------------------------------------
     EMAIL FORM
     ------------------------------------------------------- */

  createEmailForm() {
    const form = this.createElement("form", {
      className: "ac-auth-form"
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      this.submitEmailForm(form);
    });

    if (this.mode === "signup") {
      form.append(
        this.createField({
          label: "Display Name",
          name: "displayName",
          placeholder: "Enter your name",
          type: "text",
          required: true,
          maxLength: 24
        })
      );
    }

    form.append(
      this.createField({
        label: "Email Address",
        name: "email",
        placeholder: "you@example.com",
        type: "email",
        required: true,
        autocomplete: "email"
      })
    );

    form.append(
      this.createField({
        label: "Password",
        name: "password",
        placeholder: "Enter your password",
        type: "password",
        required: true,
        minLength: 6,
        autocomplete: this.mode === "login"
          ? "current-password"
          : "new-password"
      })
    );

    if (this.mode === "signup") {
      form.append(
        this.createField({
          label: "Confirm Password",
          name: "confirmPassword",
          placeholder: "Confirm your password",
          type: "password",
          required: true,
          minLength: 6,
          autocomplete: "new-password"
        })
      );
    }

    const forgot = this.createElement("button", {
      className: "ac-auth-forgot",
      text: "Forgot Password?"
    });

    forgot.type = "button";
    forgot.hidden = this.mode !== "login";

    forgot.addEventListener("click", () => {
      this.showPasswordReset();
    });

    form.append(forgot);

    const submit = this.createElement("button", {
      className: "ac-auth-submit",
      text: this.mode === "login"
        ? "ENTER THE ARENA"
        : "CREATE ACCOUNT"
    });

    submit.type = "submit";
    submit.dataset.authSubmit = "true";

    form.append(submit);

    this.submitButton = submit;

    return form;
  }

  createField(options = {}) {
    const {
      label,
      name,
      placeholder = "",
      type = "text",
      required = false,
      minLength,
      maxLength,
      autocomplete
    } = options;

    const wrapper = this.createElement("div", {
      className: "ac-auth-field"
    });

    const labelElement = this.createElement("label", {
      text: label
    });

    labelElement.htmlFor = `auth-${name}`;

    const input = this.createElement("input", {
      className: "ac-auth-input"
    });

    input.id = `auth-${name}`;
    input.name = name;
    input.type = type;
    input.placeholder = placeholder;
    input.required = required;

    if (minLength) input.minLength = minLength;
    if (maxLength) input.maxLength = maxLength;
    if (autocomplete) input.autocomplete = autocomplete;

    wrapper.append(labelElement, input);

    return wrapper;
  }

  /* -------------------------------------------------------
     EMAIL SUBMISSION
     ------------------------------------------------------- */

  async submitEmailForm(form) {
    if (this.loading) return false;

    const data = new FormData(form);

    const email = String(data.get("email") || "")
      .trim()
      .toLowerCase();

    const password = String(data.get("password") || "");

    if (!email || !password) {
      this.showMessage("Please enter your email and password.", "error");
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

        if (!displayName) {
          throw new Error("Please enter your display name.");
        }

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        result = await this.authService.registerWithEmail(
          email,
          password,
          {
            displayName
          }
        );
      } else {
        result = await this.authService.loginWithEmail(
          email,
          password
        );
      }

      if (result === false || result?.success === false) {
        throw new Error(
          result?.message || "Authentication failed."
        );
      }

      const user = result?.user || result;

      if (user) {
        await this.handleSuccess(user);
      }

      return true;
    } catch (error) {
      this.showMessage(
        this.getErrorMessage(error),
        "error"
      );

      return false;
    } finally {
      this.setLoading(false);
    }
  }

  /* -------------------------------------------------------
     PASSWORD RESET
     ------------------------------------------------------- */

  async showPasswordReset() {
    const email = this.container?.querySelector(
      '[name="email"]'
    )?.value?.trim();

    if (!email) {
      this.showMessage(
        "Enter your email address first.",
        "warning"
      );

      return false;
    }

    try {
      await this.authService.requestPasswordReset(email);

      this.showMessage(
        "Password reset email has been requested.",
        "success"
      );

      return true;
    } catch (error) {
      this.showMessage(
        this.getErrorMessage(error),
        "error"
      );

      return false;
    }
  }

  /* -------------------------------------------------------
     SOCIAL PROVIDERS
     ------------------------------------------------------- */

  createProviderButtons() {
    const container = this.createElement("div", {
      className: "ac-auth-providers"
    });

    const providers = [
      {
        name: "google",
        label: "Continue with Google",
        icon: "G"
      },
      {
        name: "facebook",
        label: "Continue with Facebook",
        icon: "f"
      }
    ];

    for (const provider of providers) {
      const button = this.createElement("button", {
        className: `ac-auth-provider ac-auth-provider--${provider.name}`
      });

      button.type = "button";

      const icon = this.createElement("span", {
        className: "ac-auth-provider__icon",
        text: provider.icon
      });

      const label = this.createElement("span", {
        text: provider.label
      });

      button.append(icon, label);

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

      if (result === false || result?.success === false) {
        throw new Error(
          result?.message || "Provider login failed."
        );
      }

      const user = result?.user || result;

      if (user) {
        await this.handleSuccess(user);
      }

      return true;
    } catch (error) {
      this.showMessage(
        this.getErrorMessage(error),
        "error"
      );

      return false;
    } finally {
      this.setLoading(false);
    }
  }

  /* -------------------------------------------------------
     PHONE LOGIN
     ------------------------------------------------------- */

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
        placeholder: "Enter OTP",
        inputmode: "numeric",
        autocomplete: "one-time-code"
      }
    });

    otpInput.hidden = true;

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
      otpInput,
      sendButton,
      verifyButton,
      status
    );

    let confirmation = null;

    sendButton.addEventListener("click", async () => {
      const phone = phoneInput.value.trim();

      if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
        status.textContent =
          "Enter the number with country code, e.g. +91...";
        return;
      }

      sendButton.disabled = true;

      try {
        confirmation = await this.authService.requestPhoneOTP(
          phone,
          {
            container: content
          }
        );

        if (!confirmation) {
          throw new Error("OTP request could not be completed.");
        }

        otpInput.hidden = false;
        verifyButton.hidden = false;
        status.textContent = "OTP request completed.";
      } catch (error) {
        status.textContent = this.getErrorMessage(error);
      } finally {
        sendButton.disabled = false;
      }
    });

    verifyButton.addEventListener("click", async () => {
      const otp = otpInput.value.trim();

      if (!/^\d{6}$/.test(otp)) {
        status.textContent = "Enter the 6-digit OTP.";
        return;
      }

      verifyButton.disabled = true;

      try {
        const result = await this.authService.verifyPhoneOTP(
          confirmation,
          otp
        );

        const user = result?.user || result;

        if (!user) {
          throw new Error("Phone verification failed.");
        }

        this.closePhoneDialog();
        await this.handleSuccess(user);
      } catch (error) {
        status.textContent = this.getErrorMessage(error);
      } finally {
        verifyButton.disabled = false;
      }
    });

    this.phoneDialog = content;

    if (this.modalManager) {
      this.modalManager.open({
        id: "ac-phone-login",
        title: "Mobile Login",
        content,
        size: "small"
      });
    } else {
      this.showMessage(
        "Mobile login dialog is unavailable.",
        "error"
      );
    }
  }

  closePhoneDialog() {
    this.modalManager?.close(
      "ac-phone-login",
      "verified"
    );

    this.phoneDialog = null;
  }

  /* -------------------------------------------------------
     GUEST MODE
     ------------------------------------------------------- */

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
      displayName: "Guest Player",
      isGuest: true,
      isAuthenticated: false
    };

    this.handleSuccess(guest, {
      guest: true
    });

    return guest;
  }

  /* -------------------------------------------------------
     SUCCESS
     ------------------------------------------------------- */

  async handleSuccess(user, options = {}) {
    if (!user) return false;

    this.showMessage(
      options.guest
        ? "Guest session started."
        : "Login successful.",
      "success"
    );

    try {
      await this.onAuthSuccess?.(user, options);
    } catch (error) {
      this.showMessage(
        "Account opened, but the next screen could not load.",
        "warning"
      );

      return false;
    }

    if (options.guest) {
      this.navigation?.navigate?.("home", {
        guest: true
      });
    }

    return true;
  }

  /* -------------------------------------------------------
     FOOTER
     ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     LOADING AND MESSAGES
     ------------------------------------------------------- */

  setLoading(loading) {
    this.loading = Boolean(loading);

    const submit = this.container?.querySelector(
      "[data-auth-submit]"
    );

    if (submit) {
      submit.disabled = this.loading;

      submit.textContent = this.loading
        ? "PLEASE WAIT..."
        : this.mode === "login"
          ? "ENTER THE ARENA"
          : "CREATE ACCOUNT";
    }

    this.container?.querySelectorAll(
      ".ac-auth-provider, .ac-auth-guest"
    ).forEach(button => {
      button.disabled = this.loading;
    });
  }

  showMessage(message, type = "info") {
    if (this.components?.notify) {
      this.components.notify(message, { type });
      return;
    }

    let messageBox = this.container?.querySelector(
      ".ac-auth-message"
    );

    if (!messageBox) {
      messageBox = this.createElement("div", {
        className: "ac-auth-message"
      });

      this.container?.querySelector(
        ".ac-auth-panel"
      )?.append(messageBox);
    }

    if (messageBox) {
      messageBox.textContent = message;
      messageBox.dataset.type = type;
    }
  }

  getErrorMessage(error) {
    const code = error?.code || "";

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

    return messages[code] ||
      error?.message ||
      "Something went wrong. Please try again.";
  }

  /* -------------------------------------------------------
     DOM HELPER
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

  ensureActive() {
    if (this.disposed) {
      throw new Error("AuthScreen has been disposed.");
    }
  }
  /* -------------------------------------------------------
     DISPOSAL
     ------------------------------------------------------- */

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

/* ---------------------------------------------------------
   FACTORY
   --------------------------------------------------------- */

export function createAuthScreen(options = {}) {
  return new AuthScreen(options);
}

/* ================= FILE 52 END ================= */
