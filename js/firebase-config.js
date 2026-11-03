/* =========================================
   APPARA CHESS — FIREBASE CONFIGURATION
   PART 07 START
========================================= */

"use strict";

window.APPARA_FIREBASE = (function () {

  const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_FIREBASE_APP_ID"
  };

  let app = null;
  let auth = null;
  let database = null;

  let initialized = false;
  let available = false;
  let initializationError = null;

  function isConfigured() {
    return (
      firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" &&
      firebaseConfig.projectId !== "YOUR_PROJECT_ID" &&
      firebaseConfig.appId !== "YOUR_FIREBASE_APP_ID"
    );
  }

  function initialize() {

    if (initialized) {
      return available;
    }

    initialized = true;

    if (!window.firebase) {
      initializationError = "Firebase SDK could not be loaded.";
      console.warn("[APPARA] " + initializationError);
      return false;
    }

    if (!isConfigured()) {
      initializationError = "Firebase configuration is incomplete.";
      console.info("[APPARA] Add your Firebase project configuration to enable online play.");
      return false;
    }

    try {

      app = firebase.apps.length
        ? firebase.app()
        : firebase.initializeApp(firebaseConfig);

      auth = firebase.auth();
      database = firebase.database();

      available = true;
      initializationError = null;

      console.info("[APPARA] Firebase initialized successfully.");

      return true;

    } catch (error) {

      available = false;
      initializationError = error.message;

      console.error(
        "[APPARA] Firebase initialization failed:",
        error
      );

      return false;
    }
  }

  function isAvailable() {
    return available && !!auth && !!database;
  }

  function getAuth() {
    return auth;
  }

  function getDatabase() {
    return database;
  }

  function getApp() {
    return app;
  }

  function getCurrentUser() {
    return auth ? auth.currentUser : null;
  }

  function getError() {
    return initializationError;
  }

  function getConfigStatus() {
    return {
      initialized: initialized,
      available: available,
      configured: isConfigured(),
      error: initializationError
    };
  }

  function getRoomReference(roomCode) {

    if (!isAvailable()) {
      throw new Error("Firebase is not connected.");
    }

    if (!roomCode || typeof roomCode !== "string") {
      throw new Error("A valid room code is required.");
    }

    const cleanCode = roomCode
      .trim()
      .toUpperCase();

    if (!/^[A-Z0-9]{4,8}$/.test(cleanCode)) {
      throw new Error("Invalid room code.");
    }

    return database.ref("rooms/" + cleanCode);
  }

  function getUserReference(userId) {

    if (!isAvailable()) {
      throw new Error("Firebase is not connected.");
    }

    if (!userId || typeof userId !== "string") {
      throw new Error("A valid user ID is required.");
    }

    return database.ref("users/" + userId);
  }

  function getLeaderboardReference() {

    if (!isAvailable()) {
      throw new Error("Firebase is not connected.");
    }

    return database.ref("leaderboard");
  }

  function getTournamentReference(tournamentId) {

    if (!isAvailable()) {
      throw new Error("Firebase is not connected.");
    }

    if (!tournamentId || typeof tournamentId !== "string") {
      throw new Error("A valid tournament ID is required.");
    }

    return database.ref("tournaments/" + tournamentId);
  }

  return Object.freeze({
    initialize,
    isAvailable,
    getAuth,
    getDatabase,
    getApp,
    getCurrentUser,
    getError,
    getConfigStatus,
    getRoomReference,
    getUserReference,
    getLeaderboardReference,
    getTournamentReference
  });

})();

/* =========================================
   APPARA CHESS — FIREBASE CONFIGURATION
   PART 07 END
========================================= */
