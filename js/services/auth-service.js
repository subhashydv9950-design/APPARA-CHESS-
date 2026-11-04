// ============================================================
// APPARA CHESS
// FILE 36A: AUTH SERVICE - PART 1
// PATH: js/services/auth-service.js
// ============================================================

export const AUTH_STATES = Object.freeze({
    INITIALIZING: "initializing",
    SIGNED_OUT: "signed_out",
    SIGNED_IN: "signed_in",
    VERIFYING: "verifying",
    ERROR: "error"
});

export const AUTH_PROVIDERS = Object.freeze({
    EMAIL: "email",
    GOOGLE: "google",
    FACEBOOK: "facebook",
    PHONE: "phone"
});

export class AuthService {

    constructor(options = {}) {

        this.options = {
            requireVerifiedEmail: false,
            allowProviderPopup: true,
            defaultProviderMethod: "popup",
            ...options
        };

        this.firebase = options.firebaseService || null;
        this.playerService = options.playerService || null;

        this.state = AUTH_STATES.INITIALIZING;

        this.currentUser = null;
        this.isAuthenticated = false;

        this.authUnsubscribe = null;

        this.listeners = new Map();

        this.initialized = false;
        this.disposed = false;

        this.lastError = null;
        this.pendingProvider = null;
    }

    // --------------------------------------------------------
    // INITIALIZATION
    // --------------------------------------------------------

    initialize(firebaseService, playerService = null) {

        this.ensureActive();

        if (firebaseService) {
            this.firebase = firebaseService;
        }

        if (playerService) {
            this.playerService = playerService;
        }

        if (!this.firebase) {
            throw new Error(
                "FirebaseService is required."
            );
        }

        if (!this.firebase.isInitialized()) {
            throw new Error(
                "Initialize FirebaseService before AuthService."
            );
        }

        if (this.authUnsubscribe) {
            this.authUnsubscribe();
            this.authUnsubscribe = null;
        }

        this.setState(AUTH_STATES.INITIALIZING);

        this.authUnsubscribe =
            this.firebase.onAuthStateChanged(user => {

                this.currentUser = user;
                this.isAuthenticated = Boolean(user);

                this.setState(
                    user
                        ? AUTH_STATES.SIGNED_IN
                        : AUTH_STATES.SIGNED_OUT
                );

                this.emit("userChanged", {
                    user: this.getCurrentUser(),
                    authenticated: this.isAuthenticated
                });
            });

        this.initialized = true;

        this.emit("initialized", {
            authenticated: this.isAuthenticated
        });

        return this;
    }

    // --------------------------------------------------------
    // EMAIL REGISTRATION
    // --------------------------------------------------------

    async registerWithEmail(data = {}) {

        this.ensureInitialized();

        const email = String(
            data.email || ""
        ).trim();

        const password = String(
            data.password || ""
        );

        const displayName = String(
            data.displayName || ""
        ).trim();

        if (!email) {
            throw new Error(
                "Email address is required."
            );
        }

        if (!password) {
            throw new Error(
                "Password is required."
            );
        }

        if (displayName.length < 2) {
            throw new Error(
                "Enter a display name with at least 2 characters."
            );
        }

        if (displayName.length > 30) {
            throw new Error(
                "Display name cannot exceed 30 characters."
            );
        }

        this.setState(AUTH_STATES.VERIFYING);

        try {

            const credential =
                await this.firebase.signUpWithEmail(
                    email,
                    password,
                    displayName
                );

            this.currentUser =
                this.firebase.getSafeUserData(
                    credential.user
                );

            this.isAuthenticated = true;

            this.emit("registered", {
                user: this.getCurrentUser(),
                verificationSent: true
            });

            return {
                success: true,
                user: this.getCurrentUser(),
                verificationSent: true
            };

        } catch (error) {

            this.handleError(error);

            throw this.createFriendlyError(error);
        }
    }

    // --------------------------------------------------------
    // EMAIL LOGIN
    // --------------------------------------------------------

    async loginWithEmail(data = {}) {

        this.ensureInitialized();

        const email = String(
            data.email || ""
        ).trim();

        const password = String(
            data.password || ""
        );

        if (!email || !password) {
            throw new Error(
                "Email and password are required."
            );
        }

        this.setState(AUTH_STATES.VERIFYING);

        try {

            const credential =
                await this.firebase.signInWithEmail(
                    email,
                    password
                );

            const user = credential.user;

            if (
                this.options.requireVerifiedEmail &&
                !user.emailVerified
            ) {

                this.setState(AUTH_STATES.SIGNED_IN);

                return {
                    success: false,
                    verificationRequired: true,
                    user: this.getCurrentUser()
                };
            }

            this.emit("loginSuccess", {
                user: this.getCurrentUser(),
                provider: AUTH_PROVIDERS.EMAIL
            });

            return {
                success: true,
                user: this.getCurrentUser()
            };

        } catch (error) {

            this.handleError(error);

            throw this.createFriendlyError(error);
        }
    }

    // --------------------------------------------------------
    // GOOGLE LOGIN
    // --------------------------------------------------------

    async loginWithGoogle(options = {}) {

        return this.loginWithProvider(
            AUTH_PROVIDERS.GOOGLE,
            options
        );
    }

    // --------------------------------------------------------
    // FACEBOOK LOGIN
    // --------------------------------------------------------

    async loginWithFacebook(options = {}) {

        return this.loginWithProvider(
            AUTH_PROVIDERS.FACEBOOK,
            options
        );
    }

    // --------------------------------------------------------
    // COMMON PROVIDER LOGIN
    // --------------------------------------------------------

    async loginWithProvider(provider, options = {}) {

        this.ensureInitialized();

        if (
            ![
                AUTH_PROVIDERS.GOOGLE,
                AUTH_PROVIDERS.FACEBOOK
            ].includes(provider)
        ) {
            throw new Error(
                "Unsupported login provider."
            );
        }

        const method =
            options.method ||
            this.options.defaultProviderMethod;

        if (
            method === "popup" &&
            !this.options.allowProviderPopup
        ) {
            throw new Error(
                "Popup authentication is disabled."
            );
        }

        this.pendingProvider = provider;

        this.setState(AUTH_STATES.VERIFYING);

        try {

            const result =
                await this.firebase.signInWithProvider(
                    provider,
                    method
                );

            if (result.redirected) {

                return {
                    success: true,
                    redirected: true,
                    provider
                };
            }

            this.currentUser =
                this.firebase.getSafeUserData(
                    result.user
                );

            this.isAuthenticated = true;

            this.emit("loginSuccess", {
                user: this.getCurrentUser(),
                provider
            });

            this.pendingProvider = null;

            return {
                success: true,
                user: this.getCurrentUser(),
                provider
            };

        } catch (error) {

            this.pendingProvider = null;

            this.handleError(error);

            throw this.createFriendlyError(error);
        }
    }

    // --------------------------------------------------------
    // REDIRECT LOGIN RESULT
    // --------------------------------------------------------

    async completeRedirectLogin() {

        this.ensureInitialized();

        try {

            const result =
                await this.firebase.getProviderRedirectResult();

            if (!result?.user) {
                return {
                    success: false,
                    redirected: false
                };
            }

            this.currentUser =
                this.firebase.getSafeUserData(
                    result.user
                );

            this.isAuthenticated = true;

            this.pendingProvider = null;

            this.emit("loginSuccess", {
                user: this.getCurrentUser(),
                provider: this.pendingProvider
            });

            return {
                success: true,
                user: this.getCurrentUser()
            };

        } catch (error) {

            this.handleError(error);

            throw this.createFriendlyError(error);
        }
    }

    // --------------------------------------------------------
    // PHONE OTP: SEND
    // --------------------------------------------------------

    async sendPhoneOTP(phoneNumber, options = {}) {

        this.ensureInitialized();

        if (!options.containerId) {
            throw new Error(
                "Phone verification container ID is required."
            );
        }

        this.setState(AUTH_STATES.VERIFYING);

        try {

            this.firebase.createPhoneRecaptcha(
                options.containerId,
                {
                    size: options.recaptchaSize || "invisible"
                }
            );

            await this.firebase.sendPhoneOTP(
                phoneNumber
            );

            this.emit("phoneCodeSent", {
                phoneNumber
            });

            return {
                success: true,
                message: "Verification code sent."
            };

        } catch (error) {

            this.handleError(error);

            throw this.createFriendlyError(error);
        }
    }

    // --------------------------------------------------------
    // PHONE OTP: VERIFY
    // --------------------------------------------------------

    async verifyPhoneOTP(code) {

        this.ensureInitialized();

        this.setState(AUTH_STATES.VERIFYING);

        try {

            const result =
                await this.firebase.verifyPhoneOTP(code);

            this.currentUser =
                this.firebase.getSafeUserData(
                    result.user
                );

            this.isAuthenticated = true;

            this.emit("loginSuccess", {
                user: this.getCurrentUser(),
                provider: AUTH_PROVIDERS.PHONE
            });

            return {
                success: true,
                user: this.getCurrentUser()
            };

        } catch (error) {

            this.handleError(error);

            throw this.createFriendlyError(error);
        }
    }

    // --------------------------------------------------------
    // EMAIL VERIFICATION
    // --------------------------------------------------------

    async resendVerificationEmail() {

        this.ensureAuthenticated();

        try {

            await this.firebase.sendVerificationEmail();

            this.emit("verificationEmailSent", {});

            return {
                success: true
            };

        } catch (error) {

            this.handleError(error);

            throw this.createFriendlyError(error);
        }
    }

    async refreshUser() {

        this.ensureAuthenticated();

        const authUser =
            this.firebase.auth.currentUser;

        if (!authUser) {
            return null;
        }

        await authUser.reload();

        this.currentUser =
            this.firebase.getSafeUserData(authUser);

        this.emit("userRefreshed", {
            user: this.getCurrentUser()
        });

        return this.getCurrentUser();
    }

    // ========================================================
    // FILE 36A END
    // CONTINUE WITH FILE 36B BELOW
    // ========================================================

    // ========================================================
    // PASSWORD RESET
    // ========================================================

    async requestPasswordReset(email) {
        this.ensureInitialized();

        const cleanEmail = String(email || "").trim().toLowerCase();

        if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            throw this.createFriendlyError({
                code: "auth/invalid-email"
            });
        }

        try {
            await this.firebase.sendPasswordReset(cleanEmail);

            this.emit("passwordResetSent", {
                email: cleanEmail
            });

            return {
                success: true,
                message: "Password reset email sent."
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // ========================================================
    // CHANGE PASSWORD
    // ========================================================

    async changePassword(newPassword) {
        this.ensureAuthenticated();

        const password = String(newPassword || "");

        if (password.length < 8) {
            throw new Error("Password must contain at least 8 characters.");
        }

        try {
            await this.firebase.changePassword(password);

            this.emit("passwordChanged", {
                uid: this.currentUser.uid
            });

            return {
                success: true
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // ========================================================
    // UPDATE PROFILE
    // ========================================================

    async updateProfile(profile = {}) {
        this.ensureAuthenticated();

        const updates = {};

        if (profile.displayName !== undefined) {
            const name = String(profile.displayName).trim();

            if (name.length < 2 || name.length > 30) {
                throw new Error(
                    "Display name must be between 2 and 30 characters."
                );
            }

            updates.displayName = name;
        }

        if (profile.photoURL !== undefined) {
            updates.photoURL = String(profile.photoURL || "");
        }

        if (Object.keys(updates).length === 0) {
            return {
                success: true,
                user: this.getCurrentUser()
            };
        }

        try {
            await this.firebase.updateUserProfile(updates);

            const refreshed = this.firebase.getSafeUserData();

            this.currentUser = {
                ...this.currentUser,
                ...refreshed,
                ...updates
            };

            this.emit("profileUpdated", {
                user: this.getCurrentUser()
            });

            return {
                success: true,
                user: this.getCurrentUser()
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // ========================================================
    // LOGOUT
    // ========================================================

    async logout() {
        this.ensureActive();

        try {
            if (this.firebase && this.firebase.isInitialized) {
                await this.firebase.signOut();
            }

            this.currentUser = null;
            this.isAuthenticated = false;
            this.pendingProvider = null;

            this.setState(AUTH_STATES.SIGNED_OUT);

            this.emit("logout", {
                success: true
            });

            return {
                success: true
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    // ========================================================
    // CURRENT USER INFORMATION
    // ========================================================

    getCurrentUser() {
        if (!this.currentUser) {
            return null;
        }

        return {
            ...this.currentUser
        };
    }

    getState() {
        return this.state;
    }

    isLoggedIn() {
        return Boolean(
            this.isAuthenticated &&
            this.currentUser &&
            this.currentUser.uid
        );
    }

    isEmailVerified() {
        return Boolean(
            this.currentUser &&
            this.currentUser.emailVerified
        );
    }

    getLastError() {
        return this.lastError;
    }

    // ========================================================
    // AUTHENTICATION GUARDS
    // ========================================================

    ensureActive() {
        if (this.disposed) {
            throw new Error("AuthService has been disposed.");
        }
    }

    ensureInitialized() {
        this.ensureActive();

        if (!this.initialized || !this.firebase) {
            throw new Error("Authentication service is not initialized.");
        }
    }

    ensureAuthenticated() {
        this.ensureInitialized();

        if (!this.isLoggedIn()) {
            throw new Error("Please sign in to continue.");
        }
    }

    // ========================================================
    // STATE MANAGEMENT
    // ========================================================

    setState(nextState) {
        const validStates = Object.values(AUTH_STATES);

        if (!validStates.includes(nextState)) {
            throw new Error("Invalid authentication state.");
        }

        const previousState = this.state;

        if (previousState === nextState) {
            return;
        }

        this.state = nextState;

        this.emit("stateChanged", {
            previousState,
            currentState: nextState
        });
    }

    // ========================================================
    // ERROR HANDLING
    // ========================================================

    handleError(error) {
        const friendlyError = this.createFriendlyError(error);

        this.lastError = {
            code: friendlyError.code || "auth/unknown",
            message: friendlyError.message,
            timestamp: Date.now()
        };

        this.emit("authError", {
            error: this.lastError
        });

        return friendlyError;
    }

    createFriendlyError(error) {
        const code = String(
            error?.code || "auth/unknown"
        );

        const messages = {
            "auth/email-already-in-use":
                "This email is already registered.",

            "auth/invalid-email":
                "Please enter a valid email address.",

            "auth/weak-password":
                "Your password is too weak.",

            "auth/user-not-found":
                "No account was found with these details.",

            "auth/wrong-password":
                "The password is incorrect.",

            "auth/invalid-credential":
                "The login details are incorrect or expired.",

            "auth/too-many-requests":
                "Too many attempts. Please try again later.",

            "auth/network-request-failed":
                "Network error. Check your internet connection.",

            "auth/popup-closed-by-user":
                "The sign-in window was closed.",

            "auth/popup-blocked":
                "Your browser blocked the sign-in window.",

            "auth/account-exists-with-different-credential":
                "An account already exists with another sign-in method.",

            "auth/requires-recent-login":
                "Please sign in again before performing this action.",

            "auth/invalid-verification-code":
                "The verification code is incorrect.",

            "auth/code-expired":
                "The verification code has expired.",

            "auth/session-expired":
                "Your session has expired. Please try again.",

            "auth/quota-exceeded":
                "The service limit has been reached. Try again later.",

            "auth/operation-not-allowed":
                "This sign-in method is not enabled yet."
        };

        const friendly = new Error(
            messages[code] ||
            error?.message ||
            "Authentication failed. Please try again."
        );

        friendly.code = code;
        friendly.cause = error;

        return friendly;
    }

    // ========================================================
    // EVENT SYSTEM
    // ========================================================

    on(eventName, callback) {
        this.ensureActive();

        if (typeof callback !== "function") {
            throw new TypeError("Event callback must be a function.");
        }

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }

        this.listeners.get(eventName).add(callback);

        return () => {
            this.off(eventName, callback);
        };
    }

    off(eventName, callback) {
        const eventListeners = this.listeners.get(eventName);

        if (!eventListeners) {
            return false;
        }

        const removed = eventListeners.delete(callback);

        if (eventListeners.size === 0) {
            this.listeners.delete(eventName);
        }

        return removed;
    }

    emit(eventName, payload = {}) {
        const eventListeners = this.listeners.get(eventName);

        if (!eventListeners || eventListeners.size === 0) {
            return;
        }

        for (const callback of [...eventListeners]) {
            try {
                callback(payload);
            } catch (error) {
                console.error(
                    `[AuthService] Event "${eventName}" listener error:`,
                    error
                );
            }
        }
    }

    // ========================================================
    // DISPOSE
    // ========================================================

    dispose() {
        if (this.disposed) {
            return;
        }

        if (typeof this.authUnsubscribe === "function") {
            this.authUnsubscribe();
        }

        this.authUnsubscribe = null;
        this.listeners.clear();

        this.currentUser = null;
        this.isAuthenticated = false;
        this.pendingProvider = null;
        this.initialized = false;
        this.disposed = true;
    }
}

// ============================================================
// AUTH SERVICE FACTORY
// ============================================================

export function createAuthService(options = {}) {
    return new AuthService(options);
}

// ============================================================
// FILE 36 END — BOTH PARTS COMPLETE
// ============================================================
