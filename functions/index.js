
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");

const admin = require("firebase-admin");
const crypto = require("crypto");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

setGlobalOptions({
  region: "asia-south1",
  maxInstances: 10,
  memory: "256MiB",
  timeoutSeconds: 30
});

// ============================================
// APPARA CHESS — BACKEND CONFIGURATION
// ============================================

const CONFIG = {
  appName: "APPARA CHESS",
  maxFriends: 200,
  maxRoomPlayers: 12,
  quickMatchPlayers: 8,
  startingCoins: 2500,
  startingDiamonds: 0,
  startingXP: 0,
  startingRating: 800,
  playerIdLength: 6
};

const COLLECTIONS = {
  players: "players",
  friendRequests: "friendRequests",
  friendships: "friendships",
  rooms: "rooms",
  queues: "matchmakingQueues",
  matches: "matches",
  transactions: "transactions",
  tournaments: "tournaments",
  reports: "reports"
};

// ============================================
// COMMON SECURITY HELPERS
// ============================================

function requireAuth(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError(
      "unauthenticated",
      "Please sign in to continue."
    );
  }

  return request.auth.uid;
}

function cleanText(value, maxLength = 40) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}

function requireString(value, fieldName, maxLength = 100) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > maxLength
  ) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid ${fieldName}.`
    );
  }

  return value.trim();
}

function makePlayerId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  const bytes = crypto.randomBytes(CONFIG.playerIdLength);

  for (let i = 0; i < CONFIG.playerIdLength; i++) {
    result += chars[bytes[i] % chars.length];
  }

  return `AC-${result}`;
}

function makeRoomCode() {
  return crypto.randomBytes(4)
    .toString("hex")
    .toUpperCase();
}

function makeTransactionId() {
  return crypto.randomUUID();
}

function validMode(mode) {
  return [
    "bullet",
    "blitz",
    "rapid",
    "classical",
    "casual"
  ].includes(mode);
}

function validCurrency(currency) {
  return currency === "coins" || currency === "diamonds";
}

function getRatingMode(mode) {
  return ["bullet", "blitz", "rapid", "classical"].includes(mode)
    ? mode
    : "rapid";
}

async function getPlayer(uid) {
  const ref = db.collection(COLLECTIONS.players).doc(uid);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new HttpsError(
      "not-found",
      "Player profile was not found."
    );
  }

  return {
    ref,
    data: snapshot.data()
  };
}

async function getOrCreatePlayerId(transaction) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const playerId = makePlayerId();

    const existing = await transaction.get(
      db.collection(COLLECTIONS.players)
        .where("playerId", "==", playerId)
        .limit(1)
    );

    if (existing.empty) {
      return playerId;
    }
  }

  throw new HttpsError(
    "internal",
    "Could not generate a unique player ID."
  );
}

function defaultRatings() {
  return {
    bullet: CONFIG.startingRating,
    blitz: CONFIG.startingRating,
    rapid: CONFIG.startingRating,
    classical: CONFIG.startingRating
  };
}

function defaultStats() {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    puzzlesSolved: 0,
    tournamentsPlayed: 0
  };
}

// ============================================
// CREATE / LOAD PLAYER PROFILE
// ============================================

exports.ensurePlayerProfile = onCall(async (request) => {
  const uid = requireAuth(request);

  const user = request.auth.token || {};
  const playerRef = db.collection(COLLECTIONS.players).doc(uid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(playerRef);

    if (snapshot.exists) {
      const player = snapshot.data();

      return {
        success: true,
        created: false,
        playerId: player.playerId,
        profile: player
      };
    }

    const playerId = await getOrCreatePlayerId(transaction);

    const displayName = cleanText(
      request.data?.displayName ||
      user.name ||
      "Chess Player",
      30
    ) || "Chess Player";

    const profile = {
      uid,
      playerId,
      displayName,

      photoURL: cleanText(user.picture || "", 500),

      bio: "",
      country: "",

      level: 1,
      xp: CONFIG.startingXP,

      coins: CONFIG.startingCoins,
      diamonds: CONFIG.startingDiamonds,

      ratings: defaultRatings(),
      stats: defaultStats(),

      friendsCount: 0,
      isOnline: true,

      privacy: {
        showOnlineStatus: true,
        allowFriendRequests: true
      },

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    transaction.create(playerRef, profile);

    return {
      success: true,
      created: true,
      playerId,
      profile
    };
  });
});

// ============================================
// FIND PLAYER BY PERMANENT APPARA ID
// ============================================

exports.findPlayerByID = onCall(async (request) => {
  requireAuth(request);

  const playerId = requireString(
    request.data?.playerId,
    "player ID",
    20
  ).toUpperCase();

  if (!/^AC-[A-Z2-9]{6}$/.test(playerId)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid APPARA CHESS player ID."
    );
  }

  const result = await db
    .collection(COLLECTIONS.players)
    .where("playerId", "==", playerId)
    .limit(1)
    .get();

  if (result.empty) {
    return {
      success: false,
      player: null
    };
  }

  const player = result.docs[0].data();

  // Never expose private account information.
  return {
    success: true,
    player: {
      playerId: player.playerId,
      displayName: player.displayName || "Chess Player",
      photoURL: player.photoURL || "",
      level: player.level || 1,
      country: player.country || "",
      isOnline: player.privacy?.showOnlineStatus === false
        ? false
        : Boolean(player.isOnline)
    }
  };
});

// ============================================
// GET OWN PLAYER PROFILE
// ============================================

exports.getMyPlayerProfile = onCall(async (request) => {
  const uid = requireAuth(request);

  const result = await getPlayer(uid);

  return {
    success: true,
    profile: result.data
  };
});

// ============================================
// FILE 75 — PART 1 END
// Continue PART 2 directly below this line.
// ============================================
   
// ============================================
// UPDATE PLAYER PROFILE
// ============================================

exports.updateMyPlayerProfile = onCall(async (request) => {
  const uid = requireAuth(request);

  const allowedFields = [
    "displayName",
    "bio",
    "country",
    "photoURL"
  ];

  const updates = {};

  for (const field of allowedFields) {
    if (request.data?.[field] === undefined) continue;

    if (field === "displayName") {
      const value = cleanText(request.data[field], 30);

      if (value.length < 2) {
        throw new HttpsError(
          "invalid-argument",
          "Display name must contain at least 2 characters."
        );
      }

      updates.displayName = value;
    }

    if (field === "bio") {
      updates.bio = cleanText(request.data[field], 160);
    }

    if (field === "country") {
      updates.country = cleanText(request.data[field], 50);
    }

    if (field === "photoURL") {
      const value = request.data[field];

      if (
        typeof value !== "string" ||
        value.length > 1000 ||
        (value && !/^https:\/\//i.test(value))
      ) {
        throw new HttpsError(
          "invalid-argument",
          "Invalid profile photo URL."
        );
      }

      updates.photoURL = value;
    }
  }

  if (!Object.keys(updates).length) {
    throw new HttpsError(
      "invalid-argument",
      "No valid profile changes provided."
    );
  }

  updates.updatedAt = FieldValue.serverTimestamp();

  const playerRef = db.collection(COLLECTIONS.players).doc(uid);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(playerRef);

    if (!snapshot.exists) {
      throw new HttpsError(
        "not-found",
        "Player profile not found."
      );
    }

    transaction.update(playerRef, updates);
  });

  return {
    success: true,
    message: "Profile updated successfully."
  };
});

// ============================================
// SEND FRIEND REQUEST
// ============================================

exports.sendFriendRequest = onCall(async (request) => {
  const uid = requireAuth(request);

  const targetPlayerId = requireString(
    request.data?.playerId,
    "player ID",
    20
  ).toUpperCase();

  if (!/^AC-[A-Z2-9]{6}$/.test(targetPlayerId)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid player ID."
    );
  }

  const targetQuery = await db
    .collection(COLLECTIONS.players)
    .where("playerId", "==", targetPlayerId)
    .limit(1)
    .get();

  if (targetQuery.empty) {
    throw new HttpsError(
      "not-found",
      "Player not found."
    );
  }

  const targetDoc = targetQuery.docs[0];
  const targetUid = targetDoc.id;
  const target = targetDoc.data();

  if (targetUid === uid) {
    throw new HttpsError(
      "failed-precondition",
      "You cannot send a friend request to yourself."
    );
  }

  if (target.privacy?.allowFriendRequests === false) {
    throw new HttpsError(
      "permission-denied",
      "This player is not accepting friend requests."
    );
  }

  const senderResult = await getPlayer(uid);
  const sender = senderResult.data;

  const friendshipId = [uid, targetUid].sort().join("_");
  const friendshipRef = db
    .collection(COLLECTIONS.friendships)
    .doc(friendshipId);

  const requestId = `${uid}_${targetUid}`;
  const requestRef = db
    .collection(COLLECTIONS.friendRequests)
    .doc(requestId);

  await db.runTransaction(async (transaction) => {
    const friendship = await transaction.get(friendshipRef);
    const existingRequest = await transaction.get(requestRef);

    if (friendship.exists) {
      throw new HttpsError(
        "already-exists",
        "You are already friends."
      );
    }

    if (existingRequest.exists) {
      throw new HttpsError(
        "already-exists",
        "Friend request already sent."
      );
    }

    transaction.create(requestRef, {
      fromUid: uid,
      toUid: targetUid,
      fromPlayerId: sender.playerId,
      toPlayerId: target.playerId,
      fromName: sender.displayName || "Chess Player",
      fromPhotoURL: sender.photoURL || "",
      status: "pending",
      createdAt: FieldValue.serverTimestamp()
    });
  });

  return {
    success: true,
    message: "Friend request sent."
  };
});

// ============================================
// ACCEPT FRIEND REQUEST
// ============================================

exports.acceptFriendRequest = onCall(async (request) => {
  const uid = requireAuth(request);

  const fromPlayerId = requireString(
    request.data?.fromPlayerId,
    "sender player ID",
    20
  ).toUpperCase();

  const senderQuery = await db
    .collection(COLLECTIONS.players)
    .where("playerId", "==", fromPlayerId)
    .limit(1)
    .get();

  if (senderQuery.empty) {
    throw new HttpsError(
      "not-found",
      "Sender player not found."
    );
  }

  const senderUid = senderQuery.docs[0].id;

  if (senderUid === uid) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid friend request."
    );
  }

  const requestRef = db
    .collection(COLLECTIONS.friendRequests)
    .doc(`${senderUid}_${uid}`);

  const friendshipId = [uid, senderUid].sort().join("_");

  const friendshipRef = db
    .collection(COLLECTIONS.friendships)
    .doc(friendshipId);

  const currentPlayerRef = db
    .collection(COLLECTIONS.players)
    .doc(uid);

  const senderPlayerRef = db
    .collection(COLLECTIONS.players)
    .doc(senderUid);

  await db.runTransaction(async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    const friendshipSnapshot = await transaction.get(friendshipRef);

    if (!requestSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "Friend request not found."
      );
    }

    const friendRequest = requestSnapshot.data();

    if (
      friendRequest.toUid !== uid ||
      friendRequest.fromUid !== senderUid ||
      friendRequest.status !== "pending"
    ) {
      throw new HttpsError(
        "permission-denied",
        "This friend request cannot be accepted."
      );
    }

    if (friendshipSnapshot.exists) {
      transaction.delete(requestRef);
      return;
    }

    const currentSnapshot = await transaction.get(currentPlayerRef);
    const senderSnapshot = await transaction.get(senderPlayerRef);

    if (!currentSnapshot.exists || !senderSnapshot.exists) {
      throw new HttpsError(
        "not-found",
        "Player profile not found."
      );
    }

    transaction.create(friendshipRef, {
      playerUids: [uid, senderUid],
      createdAt: FieldValue.serverTimestamp()
    });

    transaction.delete(requestRef);

    transaction.update(currentPlayerRef, {
      friendsCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    });

    transaction.update(senderPlayerRef, {
      friendsCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  return {
    success: true,
    message: "Friend request accepted."
  };
});

// ============================================
// DECLINE FRIEND REQUEST
// ============================================

exports.declineFriendRequest = onCall(async (request) => {
  const uid = requireAuth(request);

  const fromPlayerId = requireString(
    request.data?.fromPlayerId,
    "sender player ID",
    20
  ).toUpperCase();

  const senderQuery = await db
    .collection(COLLECTIONS.players)
    .where("playerId", "==", fromPlayerId)
    .limit(1)
    .get();

  if (senderQuery.empty) {
    throw new HttpsError(
      "not-found",
      "Sender player not found."
    );
  }

  const senderUid = senderQuery.docs[0].id;

  const requestRef = db
    .collection(COLLECTIONS.friendRequests)
    .doc(`${senderUid}_${uid}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(requestRef);

    if (!snapshot.exists) {
      throw new HttpsError(
        "not-found",
        "Friend request not found."
      );
    }

    const data = snapshot.data();

    if (data.toUid !== uid || data.status !== "pending") {
      throw new HttpsError(
        "permission-denied",
        "You cannot decline this request."
      );
    }

    transaction.delete(requestRef);
  });

  return {
    success: true,
    message: "Friend request declined."
  };
});

// ============================================
// GET FRIEND REQUESTS
// ============================================

exports.getMyFriendRequests = onCall(async (request) => {
  const uid = requireAuth(request);

  const snapshot = await db
    .collection(COLLECTIONS.friendRequests)
    .where("toUid", "==", uid)
    .where("status", "==", "pending")
    .limit(100)
    .get();

  return {
    success: true,
    requests: snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        requestId: doc.id,
        playerId: data.fromPlayerId || "",
        displayName: data.fromName || "Chess Player",
        photoURL: data.fromPhotoURL || "",
        createdAt: data.createdAt || null
      };
    })
  };
});

// ============================================
// GET FRIEND LIST
// ============================================

exports.getMyFriends = onCall(async (request) => {
  const uid = requireAuth(request);

  const snapshot = await db
    .collection(COLLECTIONS.friendships)
    .where("playerUids", "array-contains", uid)
    .limit(CONFIG.maxFriends)
    .get();

  const friendUids = [];

  snapshot.docs.forEach((doc) => {
    const data = doc.data();

    const friendUid = (data.playerUids || [])
      .find((id) => id !== uid);

    if (friendUid) friendUids.push(friendUid);
  });

  const friends = [];

  for (let i = 0; i < friendUids.length; i += 10) {
    const batch = friendUids.slice(i, i + 10);

    const players = await db
      .collection(COLLECTIONS.players)
      .where(admin.firestore.FieldPath.documentId(), "in", batch)
      .get();

    players.docs.forEach((doc) => {
      const player = doc.data();

      friends.push({
        playerId: player.playerId || "",
        displayName: player.displayName || "Chess Player",
        photoURL: player.photoURL || "",
        level: player.level || 1,
        isOnline: player.privacy?.showOnlineStatus === false
          ? false
          : Boolean(player.isOnline)
      });
    });
  }

  return {
    success: true,
    friends
  };
});

// ============================================
// FILE 75 — PART 2 END
// Continue PART 3 directly below this line.
// ============================================
     
// ============================================
// REMOVE FRIEND
// ============================================

exports.removeFriend = onCall(async (request) => {
  const uid = requireAuth(request);

  const friendPlayerId = requireString(
    request.data?.playerId,
    "friend player ID",
    20
  ).toUpperCase();

  const friendQuery = await db
    .collection(COLLECTIONS.players)
    .where("playerId", "==", friendPlayerId)
    .limit(1)
    .get();

  if (friendQuery.empty) {
    throw new HttpsError("not-found", "Player not found.");
  }

  const friendUid = friendQuery.docs[0].id;

  if (friendUid === uid) {
    throw new HttpsError("invalid-argument", "Invalid player.");
  }

  const friendshipId = [uid, friendUid].sort().join("_");
  const friendshipRef = db
    .collection(COLLECTIONS.friendships)
    .doc(friendshipId);

  const currentRef = db.collection(COLLECTIONS.players).doc(uid);
  const friendRef = db.collection(COLLECTIONS.players).doc(friendUid);

  await db.runTransaction(async (transaction) => {
    const friendship = await transaction.get(friendshipRef);

    if (!friendship.exists) {
      throw new HttpsError("not-found", "Friendship not found.");
    }

    const current = await transaction.get(currentRef);
    const friend = await transaction.get(friendRef);

    transaction.delete(friendshipRef);

    if (current.exists) {
      transaction.update(currentRef, {
        friendsCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    if (friend.exists) {
      transaction.update(friendRef, {
        friendsCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  });

  return {
    success: true,
    message: "Friend removed."
  };
});

// ============================================
// UPDATE ONLINE STATUS
// ============================================

exports.updateOnlineStatus = onCall(async (request) => {
  const uid = requireAuth(request);

  const isOnline = request.data?.isOnline;

  if (typeof isOnline !== "boolean") {
    throw new HttpsError(
      "invalid-argument",
      "Online status must be true or false."
    );
  }

  const playerRef = db.collection(COLLECTIONS.players).doc(uid);

  await playerRef.update({
    isOnline,
    lastSeenAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  return {
    success: true,
    isOnline
  };
});

// ============================================
// CREATE PRIVATE CHESS ROOM
// ============================================

exports.createPrivateRoom = onCall(async (request) => {
  const uid = requireAuth(request);

  const mode = request.data?.mode || "casual";

  if (!validMode(mode)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid chess mode."
    );
  }

  const player = await getPlayer(uid);

  let createdRoom = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const roomCode = makeRoomCode();
    const roomRef = db.collection(COLLECTIONS.rooms).doc(roomCode);

    try {
      await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(roomRef);

        if (existing.exists) {
          throw new HttpsError(
            "already-exists",
            "Room code collision."
          );
        }

        const room = {
          roomCode,
          hostUid: uid,
          hostPlayerId: player.data.playerId,
          mode,
          status: "waiting",
          maxPlayers: 2,
          playerUids: [uid],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromMillis(
            Date.now() + 30 * 60 * 1000
          )
        };

        transaction.create(roomRef, room);
        createdRoom = room;
      });

      break;
    } catch (error) {
      if (error.code !== "already-exists") throw error;
    }
  }

  if (!createdRoom) {
    throw new HttpsError(
      "internal",
      "Unable to create a private room. Please try again."
    );
  }

  return {
    success: true,
    roomCode: createdRoom.roomCode,
    mode: createdRoom.mode,
    maxPlayers: createdRoom.maxPlayers
  };
});

// ============================================
// JOIN PRIVATE CHESS ROOM
// ============================================

exports.joinPrivateRoom = onCall(async (request) => {
  const uid = requireAuth(request);

  const roomCode = requireString(
    request.data?.roomCode,
    "room code",
    20
  ).toUpperCase();

  const roomRef = db.collection(COLLECTIONS.rooms).doc(roomCode);

  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists) {
      throw new HttpsError(
        "not-found",
        "Private room not found."
      );
    }

    const room = snapshot.data();
    const players = room.playerUids || [];

    if (room.expiresAt?.toMillis() < Date.now()) {
      throw new HttpsError(
        "deadline-exceeded",
        "This room has expired."
      );
    }

    if (room.status !== "waiting") {
      throw new HttpsError(
        "failed-precondition",
        "This room is no longer accepting players."
      );
    }

    if (players.includes(uid)) {
      return {
        roomCode,
        status: room.status,
        playerCount: players.length
      };
    }

    if (players.length >= Math.min(room.maxPlayers || 2, 2)) {
      throw new HttpsError(
        "resource-exhausted",
        "This chess room is full."
      );
    }

    const updatedPlayers = [...players, uid];

    transaction.update(roomRef, {
      playerUids: updatedPlayers,
      status: updatedPlayers.length === 2 ? "ready" : "waiting",
      updatedAt: FieldValue.serverTimestamp()
    });

    return {
      roomCode,
      status: updatedPlayers.length === 2 ? "ready" : "waiting",
      playerCount: updatedPlayers.length
    };
  });

  return {
    success: true,
    ...result
  };
});

// ============================================
// LEAVE PRIVATE CHESS ROOM
// ============================================

exports.leavePrivateRoom = onCall(async (request) => {
  const uid = requireAuth(request);

  const roomCode = requireString(
    request.data?.roomCode,
    "room code",
    20
  ).toUpperCase();

  const roomRef = db.collection(COLLECTIONS.rooms).doc(roomCode);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(roomRef);

    if (!snapshot.exists) {
      return;
    }

    const room = snapshot.data();
    const players = room.playerUids || [];

    if (!players.includes(uid)) {
      throw new HttpsError(
        "permission-denied",
        "You are not a member of this room."
      );
    }

    const remainingPlayers = players.filter(
      (playerUid) => playerUid !== uid
    );

    if (remainingPlayers.length === 0) {
      transaction.delete(roomRef);
      return;
    }

    transaction.update(roomRef, {
      playerUids: remainingPlayers,
      status: "waiting",
      hostUid: remainingPlayers[0],
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  return {
    success: true,
    message: "You left the room."
  };
});

// ============================================
// REPORT PLAYER
// ============================================

exports.reportPlayer = onCall(async (request) => {
  const uid = requireAuth(request);

  const targetPlayerId = requireString(
    request.data?.playerId,
    "player ID",
    20
  ).toUpperCase();

  const reason = requireString(
    request.data?.reason,
    "report reason",
    300
  );

  const allowedReasons = [
    "cheating",
    "harassment",
    "inappropriate_name",
    "abusive_behavior",
    "other"
  ];

  if (!allowedReasons.includes(reason)) {
    throw new HttpsError(
      "invalid-argument",
      "Invalid report reason."
    );
  }

  const targetQuery = await db
    .collection(COLLECTIONS.players)
    .where("playerId", "==", targetPlayerId)
    .limit(1)
    .get();

  if (targetQuery.empty) {
    throw new HttpsError("not-found", "Player not found.");
  }

  const targetUid = targetQuery.docs[0].id;

  if (targetUid === uid) {
    throw new HttpsError(
      "invalid-argument",
      "You cannot report yourself."
    );
  }

  await db.collection(COLLECTIONS.reports).add({
    reporterUid: uid,
    reportedUid: targetUid,
    reportedPlayerId: targetPlayerId,
    reason,
    status: "pending",
    createdAt: FieldValue.serverTimestamp()
  });

  return {
    success: true,
    message: "Report submitted for review."
  };
});

// ============================================
// APPARA CHESS BACKEND — FILE 75 COMPLETE
// ============================================

      
