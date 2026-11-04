/* =========================================================
   APPARA CHESS — FILE 42
   FILE: js/services/friends-service.js
   SECTION: FRIENDS & SOCIAL SERVICES
   ========================================================= */

export const FRIEND_EVENTS = Object.freeze({
  REQUEST_SENT: "friends:request-sent",
  REQUEST_RECEIVED: "friends:request-received",
  REQUEST_ACCEPTED: "friends:request-accepted",
  REQUEST_REJECTED: "friends:request-rejected",
  FRIEND_REMOVED: "friends:removed",
  LIST_UPDATED: "friends:list-updated",
  ERROR: "friends:error"
});

export class FriendsService {
  constructor({ firebaseService, authService, playerService } = {}) {
    this.firebase = firebaseService;
    this.auth = authService;
    this.players = playerService;

    this.listeners = new Map();
    this.friends = [];
    this.incomingRequests = [];
    this.outgoingRequests = [];
    this.initialized = false;
  }

  initialize() {
    this.requireServices();
    this.initialized = true;
    return this;
  }

  requireServices() {
    if (!this.firebase) {
      throw new Error("FirebaseService is required.");
    }

    if (!this.auth) {
      throw new Error("AuthService is required.");
    }

    if (!this.players) {
      throw new Error("PlayerService is required.");
    }
  }

  getCurrentUser() {
    return this.auth.currentUser || this.auth.user || null;
  }

  getCurrentUID() {
    const user = this.getCurrentUser();
    return user?.uid || null;
  }

  getPlayerProfile() {
    return this.players.getProfile?.() || null;
  }

  requireLogin() {
    const uid = this.getCurrentUID();

    if (!uid) {
      throw new Error("Friends feature के लिए login जरूरी है।");
    }

    return uid;
  }

  async getDocument(collection, id) {
    if (typeof this.firebase.getDocument !== "function") {
      throw new Error("Firebase getDocument method उपलब्ध नहीं है।");
    }

    return this.firebase.getDocument(collection, id);
  }

  async setDocument(collection, id, data) {
    if (typeof this.firebase.setDocument !== "function") {
      throw new Error("Firebase setDocument method उपलब्ध नहीं है।");
    }

    return this.firebase.setDocument(collection, id, data);
  }

  async deleteDocument(collection, id) {
    if (typeof this.firebase.deleteDocument === "function") {
      return this.firebase.deleteDocument(collection, id);
    }

    if (typeof this.firebase.removeDocument === "function") {
      return this.firebase.removeDocument(collection, id);
    }

    throw new Error("Firebase delete method उपलब्ध नहीं है।");
  }

  makeRequestID(fromUID, toUID) {
    return `${fromUID}_${toUID}`;
  }

  makeFriendshipID(uidA, uidB) {
    return [uidA, uidB].sort().join("_");
  }

  normalizePlayer(player = {}) {
    return {
      uid: player.uid || player.id || "",
      playerId: player.playerId || "",
      displayName: player.displayName || player.name || "Chess Player",
      avatar: player.avatar || null,
      level: Number(player.level || 1),
      rank: player.rank || "Bronze",
      country: player.country || null
    };
  }

  async sendRequest(targetUID) {
    const myUID = this.requireLogin();

    if (!targetUID || typeof targetUID !== "string") {
      throw new Error("Valid player UID जरूरी है।");
    }

    if (targetUID === myUID) {
      throw new Error("आप खुद को friend request नहीं भेज सकते।");
    }

    const requestID = this.makeRequestID(myUID, targetUID);
    const reverseID = this.makeRequestID(targetUID, myUID);

    const [existing, reverse] = await Promise.all([
      this.getDocument("friendRequests", requestID),
      this.getDocument("friendRequests", reverseID)
    ]);

    if (existing && existing.status === "pending") {
      throw new Error("Friend request पहले से भेजी जा चुकी है।");
    }

    if (reverse && reverse.status === "pending") {
      throw new Error("इस player की request पहले से आपके पास है।");
    }

    const profile = this.getPlayerProfile() || {};

    const request = {
      requestID,
      fromUID: myUID,
      toUID: targetUID,
      fromPlayer: this.normalizePlayer(profile),
      status: "pending",
      createdAt: Date.now()
    };

    await this.setDocument("friendRequests", requestID, request);

    this.emit(FRIEND_EVENTS.REQUEST_SENT, request);
    return request;
  }

  async acceptRequest(fromUID) {
    const myUID = this.requireLogin();

    if (!fromUID || fromUID === myUID) {
      throw new Error("Invalid friend request.");
    }

    const requestID = this.makeRequestID(fromUID, myUID);
    const request = await this.getDocument("friendRequests", requestID);

    if (!request || request.status !== "pending") {
      throw new Error("Pending friend request नहीं मिली।");
    }

    const myProfile = this.normalizePlayer(
      this.getPlayerProfile() || {}
    );

    const friendshipID = this.makeFriendshipID(fromUID, myUID);

    const friendship = {
      friendshipID,
      members: [fromUID, myUID].sort(),
      players: {
        [myUID]: myProfile,
        [fromUID]: request.fromPlayer || {
          uid: fromUID,
          displayName: "Chess Player"
        }
      },
      createdAt: Date.now(),
      status: "active"
    };

    await this.setDocument("friendships", friendshipID, friendship);

    await this.setDocument("friendRequests", requestID, {
      ...request,
      status: "accepted",
      acceptedAt: Date.now()
    });

    this.emit(FRIEND_EVENTS.REQUEST_ACCEPTED, friendship);
    return friendship;
  }

  async rejectRequest(fromUID) {
    const myUID = this.requireLogin();
    const requestID = this.makeRequestID(fromUID, myUID);

    const request = await this.getDocument("friendRequests", requestID);

    if (!request || request.status !== "pending") {
      throw new Error("Pending request नहीं मिली।");
    }

    const updated = {
      ...request,
      status: "rejected",
      rejectedAt: Date.now()
    };

    await this.setDocument("friendRequests", requestID, updated);

    this.emit(FRIEND_EVENTS.REQUEST_REJECTED, updated);
    return updated;
  }

  async cancelRequest(targetUID) {
    const myUID = this.requireLogin();
    const requestID = this.makeRequestID(myUID, targetUID);

    const request = await this.getDocument("friendRequests", requestID);

    if (!request || request.status !== "pending") {
      throw new Error("Pending sent request नहीं मिली।");
    }

    await this.setDocument("friendRequests", requestID, {
      ...request,
      status: "cancelled",
      cancelledAt: Date.now()
    });

    return true;
  }

  async removeFriend(friendUID) {
    const myUID = this.requireLogin();
    const friendshipID = this.makeFriendshipID(myUID, friendUID);

    const friendship = await this.getDocument(
      "friendships",
      friendshipID
    );

    if (!friendship) {
      throw new Error("Friendship record नहीं मिला।");
    }

    await this.setDocument("friendships", friendshipID, {
      ...friendship,
      status: "removed",
      removedBy: myUID,
      removedAt: Date.now()
    });

    this.friends = this.friends.filter(
      friend => friend.uid !== friendUID
    );

    this.emit(FRIEND_EVENTS.FRIEND_REMOVED, { friendUID });
    return true;
  }

  async searchPlayerByID(playerID) {
    this.requireLogin();

    if (!playerID || typeof playerID !== "string") {
      throw new Error("Player ID दर्ज करें।");
    }

    const cleanID = playerID.trim().toUpperCase();

    if (typeof this.firebase.findPlayerByID === "function") {
      const result = await this.firebase.findPlayerByID(cleanID);
      return result ? this.normalizePlayer(result) : null;
    }

    if (typeof this.firebase.queryDocuments === "function") {
      const results = await this.firebase.queryDocuments(
        "users",
        "playerId",
        "==",
        cleanID
      );

      const player = Array.isArray(results) ? results[0] : null;
      return player ? this.normalizePlayer(player) : null;
    }

    throw new Error(
      "Player search के लिए Firebase query method configure करना बाकी है।"
    );
  }

  async loadFriends() {
    const myUID = this.requireLogin();

    if (typeof this.firebase.getUserFriendships !== "function") {
      throw new Error(
        "getUserFriendships query method configure करना बाकी है।"
      );
    }

    const records = await this.firebase.getUserFriendships(myUID);

    this.friends = (records || [])
      .filter(item => item.status === "active")
      .map(item => {
        const friendUID = item.members?.find(uid => uid !== myUID);
        return item.players?.[friendUID] || { uid: friendUID };
      })
      .filter(friend => friend.uid);

    this.emit(FRIEND_EVENTS.LIST_UPDATED, this.friends);
    return [...this.friends];
  }

  async loadRequests() {
    const myUID = this.requireLogin();

    if (typeof this.firebase.getFriendRequests !== "function") {
      throw new Error(
        "getFriendRequests query method configure करना बाकी है।"
      );
    }

    const requests = await this.firebase.getFriendRequests(myUID);

    this.incomingRequests = (requests || []).filter(
      item => item.toUID === myUID && item.status === "pending"
    );

    this.outgoingRequests = (requests || []).filter(
      item => item.fromUID === myUID && item.status === "pending"
    );

    this.emit(FRIEND_EVENTS.REQUEST_RECEIVED, this.incomingRequests);

    return {
      incoming: [...this.incomingRequests],
      outgoing: [...this.outgoingRequests]
    };
  }

  getFriends() {
    return [...this.friends];
  }

  getIncomingRequests() {
    return [...this.incomingRequests];
  }

  getOutgoingRequests() {
    return [...this.outgoingRequests];
  }

  isFriend(uid) {
    return this.friends.some(friend => friend.uid === uid);
  }

  on(event, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Callback must be a function.");
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event).add(callback);

    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, payload) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error("FriendsService listener error:", error);
      }
    });
  }

  dispose() {
    this.listeners.clear();
    this.friends = [];
    this.incomingRequests = [];
    this.outgoingRequests = [];
    this.initialized = false;
  }
}

export function createFriendsService(dependencies) {
  return new FriendsService(dependencies);
}

/* ================= FILE 42 END ================= */
        
