
/* =========================================
   APPARA CHESS
   PART 19 — FIREBASE CONFIGURATION
========================================= */

window.APPARA_FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL:
    "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
};

window.apparaFirebaseReady = (async function () {
  try {
    if (!window.firebase) {
      throw new Error("Firebase SDK is not loaded.");
    }

    const config = window.APPARA_FIREBASE_CONFIG;

    if (
      config.apiKey.startsWith("YOUR_") ||
      config.projectId.startsWith("YOUR_")
    ) {
      console.warn(
        "APPARA CHESS: Add your Firebase project credentials."
      );
      return false;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }

    window.apparaFirebaseAuth = firebase.auth();
    window.apparaFirebaseDatabase = firebase.database();

    await window.apparaFirebaseAuth.setPersistence(
      firebase.auth.Auth.Persistence.LOCAL
    );

    console.log("APPARA CHESS Firebase initialized.");
    return true;

  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return false;
  }
})();

/* PART 19 END */
