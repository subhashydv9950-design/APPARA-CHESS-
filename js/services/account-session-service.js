/* =========================================================
   APPARA CHESS
   CORRECTION 22 — COMPLETE FILE
   FILE: js/services/account-session-service.js
   PURPOSE: Firebase account session and cloud profile
   ========================================================= */

import { PlayerService } from "./player-service.js";

export class AccountSessionService {
  constructor(options = {}) {
    this.firebaseService = options.firebaseService || null;
    this.authService = options.authService || null;
    this.storageService = options.storageService || null;

    this.playerService = null;
    this.loading = false;
    this.activeUid = null;
  }

  async activate(user = null) {
    if (this.loading) {
      throw new Error("Account session is already loading.");
    }

    if (!this.firebaseService?.isInitialized?.()) {
      throw new Error("Firebase is not initialized.");
    }

    if (!this.authService?.isLoggedIn?.()) {
      throw new Error("Please sign in first.");
    }

    const currentUser = this.authService.getCurrentUser();

    if (!currentUser?.uid) {
      throw new Error("Signed-in account could not be identified.");
    }

    if (user?.uid && user.uid !== currentUser.uid) {
      throw new Error("Account identity does not match.");
    }

    if (
      this.playerService &&
      this.activeUid === currentUser.uid &&
      this.playerService.getProfile()
    ) {
      return this.playerService;
    }

    this.loading = true;

    try {
      this.disposePlayer();

      const player = new PlayerService({
        firebaseService: this.firebaseService,
        authService: this.authService,
        storageService: this.storageService,
        collection: "players"
      });

      await player.initialize({
        firebaseService: this.firebaseService,
        authService: this.authService
      });

      // Firebase Auth का मूल User Data प्राप्त करें।
      const firebaseUser = this.firebaseService.auth?.currentUser;
      const profile = player.getProfile();

      // सुरक्षित User Data में email/photoURL न होने पर
      // Firebase के मूल User Data से प्रोफाइल अपडेट करें।
      if (profile && firebaseUser) {
        const updates = {};

        if (!profile.email && firebaseUser.email) {
          updates.email = firebaseUser.email;
        }

        if (!profile.avatar && firebaseUser.photoURL) {
          updates.avatar = firebaseUser.photoURL;
        }

        if (
          !profile.displayName &&
          firebaseUser.displayName
        ) {
          updates.displayName = firebaseUser.displayName;
        }

        if (Object.keys(updates).length > 0) {
          await player.updateProfile(updates);
        }
      }

      this.playerService = player;
      this.activeUid = currentUser.uid;

      return player;

    } catch (error) {
      this.disposePlayer();
      throw error;

    } finally {
      this.loading = false;
    }
  }

  getPlayerService() {
    return this.playerService;
  }

  isCloudAccountActive() {
    return Boolean(
      this.playerService &&
      this.activeUid &&
      this.playerService.getProfile()
    );
  }

  disposePlayer() {
    try {
      this.playerService?.dispose?.();
    } catch (error) {
      console.warn(
        "Player session cleanup failed:",
        error
      );
    }

    this.playerService = null;
    this.activeUid = null;
  }

  dispose() {
    this.disposePlayer();
    this.loading = false;
  }
}

/* =========================================================
   FILE: js/services/account-session-service.js
   CORRECTION 22 COMPLETE — FULL FILE COMPLETE
   ========================================================= */
