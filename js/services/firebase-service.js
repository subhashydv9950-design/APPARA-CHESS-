// ============================================================
// APPARA CHESS
// FILE 35A: FIREBASE SERVICE - PART 1
// PATH: js/services/firebase-service.js
// ============================================================

import {
    initializeApp,
    getApps,
    getApp
} from "firebase/app";

import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    GoogleAuthProvider,
    FacebookAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    PhoneAuthProvider,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    connectAuthEmulator
} from "firebase/auth";

import {
    getFirestore,
    doc,
    collection,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp,
    runTransaction,
    writeBatch,
    onSnapshot,
    connectFirestoreEmulator
} from "firebase/firestore";

import {
    getStorage,
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    connectStorageEmulator
} from "firebase/storage";

import {
    getFunctions,
    httpsCallable,
    connectFunctionsEmulator
} from "firebase/functions";

// ============================================================
// FIREBASE SERVICE CLASS
// ============================================================

export class FirebaseService {

    constructor(options = {}) {

        this.options = {
            region: "asia-south1",
            persistence: "local",
            ...options
        };

        this.app = null;
        this.auth = null;
        this.db = null;
        this.storage = null;
        this.functions = null;

        this.initialized = false;
        this.initializing = null;
        this.disposed = false;

        this.authUnsubscribe = null;
        this.authListeners = new Set();

        this.recaptchaVerifier = null;
        this.phoneConfirmation = null;

        this.providers = {
            google: null,
            facebook: null
        };

        this.listeners = new Map();
    }

    // --------------------------------------------------------
    // INITIALIZE FIREBASE
    // --------------------------------------------------------

    async initialize(firebaseConfig, options = {}) {

        if (this.disposed) {
            throw new Error(
                "FirebaseService has been disposed."
            );
        }

        if (this.initialized) {
            return this.getServices();
        }

        if (this.initializing) {
            return this.initializing;
        }

        if (
            !firebaseConfig ||
            typeof firebaseConfig !== "object"
        ) {
            throw new Error(
                "Valid Firebase configuration is required."
            );
        }

        const requiredFields = [
            "apiKey",
            "authDomain",
            "projectId",
            "appId"
        ];

        const missingFields = requiredFields.filter(
            key => !firebaseConfig[key]
        );

        if (missingFields.length > 0) {
            throw new Error(
                `Missing Firebase configuration: ${missingFields.join(", ")}`
            );
        }

        this.initializing = this.performInitialization(
            firebaseConfig,
            options
        );

        try {
            return await this.initializing;
        } finally {
            this.initializing = null;
        }
    }

    async performInitialization(firebaseConfig, options) {

        try {

            const appName = options.appName || "[DEFAULT]";

            const existingApp = getApps().find(
                item => item.name === appName
            );

            this.app = existingApp
                ? getApp(appName)
                : initializeApp(
                    firebaseConfig,
                    appName === "[DEFAULT]"
                        ? undefined
                        : appName
                );

            this.auth = getAuth(this.app);
            this.db = getFirestore(this.app);
            this.storage = getStorage(this.app);

            this.functions = getFunctions(
                this.app,
                options.region || this.options.region
            );

            this.createProviders();

            await this.configurePersistence(
                options.persistence || this.options.persistence
            );

            this.configureEmulators(options);

            this.listenToAuthChanges();

            this.initialized = true;

            this.emit("initialized", {
                projectId: firebaseConfig.projectId
            });

            return this.getServices();

        } catch (error) {

            this.initialized = false;

            this.emit("error", {
                source: "initialize",
                error
            });

            throw error;
        }
    }

    getServices() {
        return {
            app: this.app,
            auth: this.auth,
            db: this.db,
            storage: this.storage,
            functions: this.functions
        };
    }

    isInitialized() {
        return this.initialized;
    }

    // --------------------------------------------------------
    // AUTH PERSISTENCE
    // --------------------------------------------------------

    async configurePersistence(type = "local") {

        if (!this.auth) return false;

        const persistence =
            type === "session"
                ? browserSessionPersistence
                : browserLocalPersistence;

        try {

            await setPersistence(
                this.auth,
                persistence
            );

            return true;

        } catch (error) {

            this.emit("error", {
                source: "persistence",
                error
            });

            return false;
        }
    }

    // --------------------------------------------------------
    // AUTH PROVIDERS
    // --------------------------------------------------------

    createProviders() {

        this.providers.google =
            new GoogleAuthProvider();

        this.providers.google.setCustomParameters({
            prompt: "select_account"
        });

        this.providers.facebook =
            new FacebookAuthProvider();

        this.providers.facebook.addScope("email");

        return this.providers;
    }

    getProvider(providerName) {

        const provider =
            this.providers[
                String(providerName).toLowerCase()
            ];

        if (!provider) {
            throw new Error(
                `Unsupported authentication provider: ${providerName}`
            );
        }

        return provider;
    }

    // --------------------------------------------------------
    // EMAIL SIGN UP
    // --------------------------------------------------------

    async signUpWithEmail(
        email,
        password,
        displayName = ""
    ) {

        this.requireAuth();

        this.validateEmail(email);
        this.validatePassword(password);

        const credential =
            await createUserWithEmailAndPassword(
                this.auth,
                email.trim(),
                password
            );

        if (displayName.trim()) {

            await updateProfile(
                credential.user,
                {
                    displayName: displayName.trim()
                }
            );
        }

        await sendEmailVerification(
            credential.user
        );

        this.emit("accountCreated", {
            uid: credential.user.uid,
            emailVerified:
                credential.user.emailVerified
        });

        return credential;
    }

    // --------------------------------------------------------
    // EMAIL SIGN IN
    // --------------------------------------------------------

    async signInWithEmail(email, password) {

        this.requireAuth();

        this.validateEmail(email);

        if (!password) {
            throw new Error(
                "Password is required."
            );
        }

        const credential =
            await signInWithEmailAndPassword(
                this.auth,
                email.trim(),
                password
            );

        this.emit("signedIn", {
            uid: credential.user.uid
        });

        return credential;
    }

    async sendVerificationEmail() {

        this.requireAuth();

        const user = this.auth.currentUser;

        if (!user) {
            throw new Error(
                "No authenticated user."
            );
        }

        await sendEmailVerification(user);

        return true;
    }

    async sendPasswordReset(email) {

        this.requireAuth();

        this.validateEmail(email);

        await sendPasswordResetEmail(
            this.auth,
            email.trim()
        );

        return true;
    }

    async changePassword(newPassword) {

        this.requireAuth();

        const user = this.auth.currentUser;

        if (!user) {
            throw new Error(
                "No authenticated user."
            );
        }

        this.validatePassword(newPassword);

        await updatePassword(
            user,
            newPassword
        );

        return true;
    }

    async reauthenticateWithEmail(password) {

        this.requireAuth();

        const user = this.auth.currentUser;

        if (!user || !user.email) {
            throw new Error(
                "Email account is not available."
            );
        }

        const credential =
            EmailAuthProvider.credential(
                user.email,
                password
            );

        return reauthenticateWithCredential(
            user,
            credential
        );
    }

    // --------------------------------------------------------
    // GOOGLE / FACEBOOK LOGIN
    // --------------------------------------------------------

    async signInWithProvider(
        providerName,
        method = "popup"
    ) {

        this.requireAuth();

        const provider =
            this.getProvider(providerName);

        if (method === "redirect") {

            await signInWithRedirect(
                this.auth,
                provider
            );

            return {
                redirected: true
            };
        }

        const credential =
            await signInWithPopup(
                this.auth,
                provider
            );

        this.emit("signedIn", {
            uid: credential.user.uid,
            provider: providerName
        });

        return credential;
    }

    async getProviderRedirectResult() {

        this.requireAuth();

        const result =
            await getRedirectResult(this.auth);

        if (result?.user) {

            this.emit("signedIn", {
                uid: result.user.uid
            });
        }

        return result;
    }

    // --------------------------------------------------------
    // PHONE OTP
    // --------------------------------------------------------

    createPhoneRecaptcha(
        containerId,
        options = {}
    ) {

        this.requireAuth();

        if (
            typeof document === "undefined" ||
            !document.getElementById(containerId)
        ) {
            throw new Error(
                "Phone verification container not found."
            );
        }

        this.clearPhoneRecaptcha();

        this.recaptchaVerifier =
            new RecaptchaVerifier(
                this.auth,
                containerId,
                {
                    size: options.size || "invisible",

                    callback:
                        options.onVerified || (() => {}),

                    "expired-callback":
                        options.onExpired || (() => {})
                }
            );

        return this.recaptchaVerifier;
    }

    async sendPhoneOTP(phoneNumber) {

        this.requireAuth();

        if (!this.recaptchaVerifier) {
            throw new Error(
                "Create phone verification first."
            );
        }

        if (
            typeof phoneNumber !== "string" ||
            !/^\+[1-9]\d{7,14}$/.test(
                phoneNumber.trim()
            )
        ) {
            throw new Error(
                "Enter a valid phone number with country code."
            );
        }

        this.phoneConfirmation =
            await signInWithPhoneNumber(
                this.auth,
                phoneNumber.trim(),
                this.recaptchaVerifier
            );

        this.emit("phoneOTPSent", {});

        return true;
    }

    async verifyPhoneOTP(code) {

        if (!this.phoneConfirmation) {
            throw new Error(
                "Request a phone OTP first."
            );
        }

        const otp = String(code || "").trim();

        if (!/^\d{6}$/.test(otp)) {
            throw new Error(
                "Enter the valid 6-digit OTP."
            );
        }

        const result =
            await this.phoneConfirmation.confirm(otp);

        this.phoneConfirmation = null;

        this.emit("signedIn", {
            uid: result.user.uid,
            provider: "phone"
        });

        return result;
    }

    clearPhoneRecaptcha() {

        if (this.recaptchaVerifier) {

            try {
                this.recaptchaVerifier.clear();
            } catch {
                // Ignore cleanup errors.
            }
        }

        this.recaptchaVerifier = null;
        this.phoneConfirmation = null;
    }

    // --------------------------------------------------------
    // AUTH STATE
    // --------------------------------------------------------

    listenToAuthChanges() {

        if (!this.auth) return;

        if (this.authUnsubscribe) {
            this.authUnsubscribe();
        }

        this.authUnsubscribe =
            onAuthStateChanged(
                this.auth,
                user => {

                    const userData = user
                        ? this.getSafeUserData(user)
                        : null;

                    this.authListeners.forEach(
                        callback => {

                            try {
                                callback(userData);
                            } catch (error) {

                                this.emit("error", {
                                    source: "auth-listener",
                                    error
                                });
                            }
                        }
                    );

                    this.emit("authStateChanged", {
                        user: userData,
                        authenticated: Boolean(user)
                    });
                }
            );
    }

    onAuthStateChanged(callback) {

        if (typeof callback !== "function") {
            return () => {};
        }

        this.authListeners.add(callback);

        if (this.auth) {

            callback(
                this.auth.currentUser
                    ? this.getSafeUserData(
                        this.auth.currentUser
                    )
                    : null
            );
        }

        return () => {
            this.authListeners.delete(callback);
        };
    }

    getCurrentUser() {

        if (!this.auth?.currentUser) {
            return null;
        }

        return this.getSafeUserData(
            this.auth.currentUser
        );
    }

    getSafeUserData(user) {

        if (!user) return null;

        return {
            uid: user.uid,
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            emailVerified: Boolean(user.emailVerified),
            isAnonymous: Boolean(user.isAnonymous),

            providerIds: user.providerData.map(
                item => item.providerId
            )
        };
    }

    async signOut() {

        this.requireAuth();

        this.clearPhoneRecaptcha();

        await signOut(this.auth);

        this.emit("signedOut", {});

        return true;
    }

    // --------------------------------------------------------
    // USER PROFILE
    // --------------------------------------------------------

    async updateUserProfile(profile = {}) {

        this.requireAuth();

        const user = this.auth.currentUser;

        if (!user) {
            throw new Error(
                "No authenticated user."
            );
        }

        const updates = {};

        if (typeof profile.displayName === "string") {
            updates.displayName =
                profile.displayName.trim();
        }

        if (typeof profile.photoURL === "string") {
            updates.photoURL = profile.photoURL;
        }

        await updateProfile(user, updates);

        this.emit("profileUpdated", {
            uid: user.uid
        });

        return this.getSafeUserData(user);
    }

    // ========================================================
    // PART 1 COMPLETE
    // CONTINUE DIRECTLY WITH FILE 35B BELOW
    // ========================================================

      // ========================================================
    // FIRESTORE: DOCUMENTS
    // ========================================================

    getDocumentReference(path) {

        this.requireDatabase();

        if (
            typeof path !== "string" ||
            !path.trim()
        ) {
            throw new Error(
                "A valid Firestore document path is required."
            );
        }

        return doc(this.db, path);
    }

    getCollectionReference(path) {

        this.requireDatabase();

        if (
            typeof path !== "string" ||
            !path.trim()
        ) {
            throw new Error(
                "A valid Firestore collection path is required."
            );
        }

        return collection(this.db, path);
    }

    async getDocument(path) {

        const reference =
            this.getDocumentReference(path);

        const snapshot = await getDoc(reference);

        if (!snapshot.exists()) return null;

        return {
            id: snapshot.id,
            ...snapshot.data()
        };
    }

    async setDocument(path, data, options = {}) {

        const reference =
            this.getDocumentReference(path);

        await setDoc(
            reference,
            data,
            {
                merge: Boolean(options.merge)
            }
        );

        return true;
    }

    async updateDocument(path, data) {

        const reference =
            this.getDocumentReference(path);

        await updateDoc(reference, data);

        return true;
    }

    async deleteDocument(path) {

        const reference =
            this.getDocumentReference(path);

        await deleteDoc(reference);

        return true;
    }

    async addDocument(path, data) {

        const reference =
            this.getCollectionReference(path);

        const result = await addDoc(
            reference,
            data
        );

        return result.id;
    }

    // ========================================================
    // FIRESTORE: QUERIES
    // ========================================================

    async getCollection(path, options = {}) {

        const reference =
            this.getCollectionReference(path);

        const constraints = [];

        if (Array.isArray(options.where)) {

            options.where.forEach(condition => {

                if (
                    Array.isArray(condition) &&
                    condition.length === 3
                ) {
                    constraints.push(
                        where(
                            condition[0],
                            condition[1],
                            condition[2]
                        )
                    );
                }
            });
        }

        if (options.orderBy) {

            const order = Array.isArray(options.orderBy)
                ? options.orderBy
                : [options.orderBy];

            constraints.push(
                orderBy(
                    order[0],
                    order[1] || "asc"
                )
            );
        }

        if (Number.isFinite(options.limit)) {

            constraints.push(
                limit(
                    Math.max(1, options.limit)
                )
            );
        }

        if (options.startAfter) {
            constraints.push(
                startAfter(options.startAfter)
            );
        }

        const firestoreQuery = constraints.length
            ? query(reference, ...constraints)
            : query(reference);

        const snapshot = await getDocs(
            firestoreQuery
        );

        return snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));
    }

    subscribeDocument(path, callback) {

        const reference =
            this.getDocumentReference(path);

        return onSnapshot(
            reference,

            snapshot => {

                callback(
                    snapshot.exists()
                        ? {
                            id: snapshot.id,
                            ...snapshot.data()
                        }
                        : null
                );
            },

            error => {

                this.emit("error", {
                    source: "firestore-document",
                    error
                });
            }
        );
    }

    subscribeCollection(
        path,
        callback,
        options = {}
    ) {

        const reference =
            this.getCollectionReference(path);

        const constraints = [];

        if (Array.isArray(options.where)) {

            options.where.forEach(condition => {

                if (
                    Array.isArray(condition) &&
                    condition.length === 3
                ) {
                    constraints.push(
                        where(...condition)
                    );
                }
            });
        }

        if (options.orderBy) {

            const order = Array.isArray(options.orderBy)
                ? options.orderBy
                : [options.orderBy];

            constraints.push(
                orderBy(
                    order[0],
                    order[1] || "asc"
                )
            );
        }

        if (Number.isFinite(options.limit)) {

            constraints.push(
                limit(Math.max(1, options.limit))
            );
        }

        const firestoreQuery = constraints.length
            ? query(reference, ...constraints)
            : query(reference);

        return onSnapshot(
            firestoreQuery,

            snapshot => {

                callback(
                    snapshot.docs.map(item => ({
                        id: item.id,
                        ...item.data()
                    }))
                );
            },

            error => {

                this.emit("error", {
                    source: "firestore-collection",
                    error
                });
            }
        );
    }

    // ========================================================
    // FIRESTORE: TRANSACTIONS
    // ========================================================

    async runTransaction(callback) {

        this.requireDatabase();

        if (typeof callback !== "function") {
            throw new Error(
                "Transaction callback is required."
            );
        }

        return runTransaction(
            this.db,
            callback
        );
    }

    createBatch() {

        this.requireDatabase();

        return writeBatch(this.db);
    }

    getServerTimestamp() {
        return serverTimestamp();
    }

    // ========================================================
    // CLOUD STORAGE
    // ========================================================

    async uploadFile(path, file, options = {}) {

        this.requireStorage();

        if (!file) {
            throw new Error(
                "Upload file is required."
            );
        }

        const storageReference = ref(
            this.storage,
            path
        );

        const metadata = options.contentType
            ? {
                contentType: options.contentType
            }
            : undefined;

        const result = await uploadBytes(
            storageReference,
            file,
            metadata
        );

        const downloadURL = await getDownloadURL(
            result.ref
        );

        return {
            path: result.ref.fullPath,
            downloadURL,
            size: result.metadata.size,
            contentType: result.metadata.contentType
        };
    }

    uploadFileWithProgress(
        path,
        file,
        callbacks = {}
    ) {

        this.requireStorage();

        if (!file) {
            throw new Error(
                "Upload file is required."
            );
        }

        const storageReference = ref(
            this.storage,
            path
        );

        const task = uploadBytesResumable(
            storageReference,
            file,
            callbacks.contentType
                ? {
                    contentType: callbacks.contentType
                }
                : undefined
        );

        const unsubscribe = task.on(
            "state_changed",

            snapshot => {

                const progress =
                    snapshot.totalBytes > 0
                        ? (
                            snapshot.bytesTransferred /
                            snapshot.totalBytes
                        ) * 100
                        : 0;

                callbacks.onProgress?.({
                    progress,
                    transferred:
                        snapshot.bytesTransferred,
                    total: snapshot.totalBytes
                });
            },

            error => {

                callbacks.onError?.(error);

                this.emit("error", {
                    source: "storage-upload",
                    error
                });
            },

            async () => {

                try {

                    const downloadURL =
                        await getDownloadURL(
                            task.snapshot.ref
                        );

                    callbacks.onComplete?.({
                        path: task.snapshot.ref.fullPath,
                        downloadURL,
                        size: task.snapshot.totalBytes
                    });

                } catch (error) {
                    callbacks.onError?.(error);
                }
            }
        );

        return {
            task,
            unsubscribe,

            pause: () => task.pause(),
            resume: () => task.resume(),
            cancel: () => task.cancel()
        };
    }

    async getFileURL(path) {

        this.requireStorage();

        return getDownloadURL(
            ref(this.storage, path)
        );
    }

    async deleteFile(path) {

        this.requireStorage();

        await deleteObject(
            ref(this.storage, path)
        );

        return true;
    }

    // ========================================================
    // CLOUD FUNCTIONS
    // ========================================================

    async callFunction(name, data = {}) {

        this.requireFunctions();

        if (
            typeof name !== "string" ||
            !name.trim()
        ) {
            throw new Error(
                "Cloud Function name is required."
            );
        }

        const callable = httpsCallable(
            this.functions,
            name
        );

        const result = await callable(data);

        return result.data;
    }

    // ========================================================
    // FIREBASE EMULATORS
    // ========================================================

    configureEmulators(options = {}) {

        if (!options.useEmulators) {
            return false;
        }

        if (!options.emulators) {
            throw new Error(
                "Emulator configuration is required."
            );
        }

        const emulator = options.emulators;

        if (emulator.auth && this.auth) {

            connectAuthEmulator(
                this.auth,
                emulator.auth,
                {
                    disableWarnings: true
                }
            );
        }

        if (emulator.firestore && this.db) {

            connectFirestoreEmulator(
                this.db,
                emulator.firestore.host,
                emulator.firestore.port
            );
        }

        if (emulator.storage && this.storage) {

            connectStorageEmulator(
                this.storage,
                emulator.storage.host,
                emulator.storage.port
            );
        }

        if (emulator.functions && this.functions) {

            connectFunctionsEmulator(
                this.functions,
                emulator.functions.host,
                emulator.functions.port
            );
        }

        return true;
    }

    // ========================================================
    // VALIDATION
    // ========================================================

    validateEmail(email) {

        if (
            typeof email !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email.trim()
            )
        ) {
            throw new Error(
                "Enter a valid email address."
            );
        }

        return true;
    }

    validatePassword(password) {

        if (
            typeof password !== "string" ||
            password.length < 8
        ) {
            throw new Error(
                "Password must contain at least 8 characters."
            );
        }

        return true;
    }

    requireAuth() {

        if (!this.auth) {
            throw new Error(
                "Firebase Authentication is not initialized."
            );
        }
    }

    requireDatabase() {

        if (!this.db) {
            throw new Error(
                "Firestore is not initialized."
            );
        }
    }

    requireStorage() {

        if (!this.storage) {
            throw new Error(
                "Firebase Storage is not initialized."
            );
        }
    }

    requireFunctions() {

        if (!this.functions) {
            throw new Error(
                "Firebase Functions are not initialized."
            );
        }
    }

    // ========================================================
    // EVENT SYSTEM
    // ========================================================

    on(eventName, callback) {

        if (typeof callback !== "function") {
            return () => {};
        }

        if (!this.listeners.has(eventName)) {

            this.listeners.set(
                eventName,
                new Set()
            );
        }

        this.listeners.get(eventName).add(callback);

        return () => {
            this.off(eventName, callback);
        };
    }

    off(eventName, callback) {

        const callbacks =
            this.listeners.get(eventName);

        if (!callbacks) return;

        callbacks.delete(callback);

        if (callbacks.size === 0) {
            this.listeners.delete(eventName);
        }
    }

    emit(eventName, data = {}) {

        const callbacks =
            this.listeners.get(eventName);

        if (!callbacks) return;

        callbacks.forEach(callback => {

            try {
                callback(data);
            } catch (error) {

                if (eventName !== "error") {

                    this.emit("error", {
                        source: eventName,
                        error
                    });
                }
            }
        });
    }

    // ========================================================
    // DISPOSE
    // ========================================================

    dispose() {

        if (this.authUnsubscribe) {

            this.authUnsubscribe();
            this.authUnsubscribe = null;
        }

        this.clearPhoneRecaptcha();

        this.authListeners.clear();
        this.listeners.clear();

        this.app = null;
        this.auth = null;
        this.db = null;
        this.storage = null;
        this.functions = null;

        this.initialized = false;
        this.disposed = true;
    }
}

// ============================================================
// FACTORY
// ============================================================

export function createFirebaseService(options = {}) {
    return new FirebaseService(options);
}

// ============================================================
// FILE 35 END — BOTH PARTS COMPLETE
// ============================================================
