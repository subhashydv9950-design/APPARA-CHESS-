
/* =========================================================
   APPARA CHESS
   CORRECTION 17 — COMPLETE FILE
   FILE: js/services/firebase-bootstrap.js
   PURPOSE: Firebase और Authentication को initialize करना
   ========================================================= */

import { FIREBASE_CONFIG, FIREBASE_OPTIONS } from "../../config/firebase-config.js";

import { FirebaseService } from "./firebase-service.js";
import { AuthService } from "./auth-service.js";

export class FirebaseBootstrap {

  constructor() {
    this.firebaseService = null;
    this.authService = null;

    this.initialized = false;
    this.initializing = false;
    this.error = null;
  }

  async initialize() {
    if (this.initialized) {
      return this.getServices();
    }

    if (this.initializing) {
      throw new Error("Firebase initialization is already running.");
    }

    this.initializing = true;
    this.error = null;

    try {
      this.firebaseService = new FirebaseService({
        region: FIREBASE_OPTIONS.region,
        persistence: FIREBASE_OPTIONS.persistence
      });

      await this.firebaseService.initialize(
        FIREBASE_CONFIG,
        FIREBASE_OPTIONS
      );

      this.authService = new AuthService({
        firebaseService: this.firebaseService,
        requireVerifiedEmail: false,
        allowProviderPopup: true,
        defaultProviderMethod: "popup"
      });

      this.authService.initialize(
        this.firebaseService
      );

      this.initialized = true;

      return this.getServices();

    } catch (error) {
      this.error = error;

      this.dispose();

      throw error;

    } finally {
      this.initializing = false;
    }
  }

  getServices() {
    return {
      firebaseService: this.firebaseService,
      authService: this.authService,
      initialized: this.initialized
    };
  }

  isInitialized() {
    return this.initialized;
  }

  getError() {
    return this.error;
  }

  dispose() {
    try {
      this.authService?.dispose?.();
    } catch (error) {
      console.warn("AuthService cleanup error:", error);
    }

    try {
      this.firebaseService?.dispose?.();
    } catch (error) {
      console.warn("FirebaseService cleanup error:", error);
    }

    this.authService = null;
    this.firebaseService = null;
    this.initialized = false;
  }
}

export function createFirebaseBootstrap() {
  return new FirebaseBootstrap();
}

/* =========================================================
   CORRECTION 17 COMPLETE
   FULL FILE COMPLETE
   PATH: js/services/firebase-bootstrap.js
   ========================================================= */
