/* =========================================================
   APPARA CHESS — ONLINE UI CONTROLLER
   PART 21Q — PART 1/3
   File: js/online-ui.js
========================================================= */

window.APPARA_ONLINE_UI = (function () {
  "use strict";

  const state = {
    initialized: false,
    elements: {},
    handlers: [],
    roomData: null,
    busy: false,
    currentStatus: "disconnected",
    lastMessage: ""
  };

  /* ---------------------------------------------------------
     HELPERS
  --------------------------------------------------------- */

  function getElement(id) {
    return document.getElementById(id);
  }

  function safeCall(object, method, ...args) {
    try {
      if (object && typeof object[method] === "function") {
        return object[method](...args);
      }
    } catch (error) {
      console.error(
        "[APPARA ONLINE UI] " + method + " failed:",
        error
      );
    }

    return undefined;
  }

  function notify(message, type) {
    if (window.APPARA_APP) {
      safeCall(
        window.APPARA_APP,
        "showNotification",
        message,
        type || "info"
      );
    } else {
      console.info("[APPARA ONLINE]", message);
    }
  }

  function setText(element, value) {
    if (element) {
      element.textContent = String(value || "");
    }
  }

  function setVisible(element, visible) {
    if (!element) return;

    element.hidden = !visible;
    element.setAttribute(
      "aria-hidden",
      visible ? "false" : "true"
    );
  }

  function setBusy(value) {
    state.busy = Boolean(value);

    [
      state.elements.createRoom,
      state.elements.joinRoom
    ].forEach(function (button) {
      if (button) {
        button.disabled = state.busy;
        button.classList.toggle("loading", state.busy);
      }
    });
  }

  function getOnlineModule() {
    return window.APPARA_ONLINE || null;
  }

  /* ---------------------------------------------------------
     ELEMENT CACHE
  --------------------------------------------------------- */

  function cacheElements() {
    state.elements = {
      connectionIndicator: getElement("connection-indicator"),
      connectionStatus: getElement("online-connection-status"),

      playerName: getElement("online-player-name"),
      joinPlayerName: getElement("join-player-name"),

      createRoom: getElement("create-room-btn"),
      createdRoomContainer: getElement("created-room-container"),
      createdRoomCode: getElement("created-room-code"),
      copyRoomCode: getElement("copy-room-code-btn"),

      roomCodeInput: getElement("room-code-input"),
      joinRoom: getElement("join-room-btn"),

      roomStatus: getElement("online-room-status"),
      opponentName: getElement("online-opponent-name"),
      leaveRoom: getElement("leave-room-btn"),

      offerDraw: getElement("online-offer-draw-btn"),
      resign: getElement("online-resign-btn"),
      acceptDraw: getElement("online-accept-draw-btn"),
      rejectDraw: getElement("online-reject-draw-btn")
    };

    return state.elements;
  }

  /* ---------------------------------------------------------
     CONNECTION STATUS
  --------------------------------------------------------- */

  function updateConnectionStatus(status, message) {
    const element = state.elements.connectionStatus;
    const indicator = state.elements.connectionIndicator;

    state.currentStatus = status || "disconnected";

    const labels = {
      connected: "Connected",
      connecting: "Connecting...",
      disconnected: "Disconnected",
      error: "Connection error"
    };

    const label = message || labels[state.currentStatus]
      || "Unknown status";

    setText(element, label);

    if (indicator) {
      indicator.classList.remove(
        "connected",
        "connecting",
        "disconnected",
        "error"
      );

      indicator.classList.add(state.currentStatus);
    }

    if (element) {
      element.dataset.status = state.currentStatus;
    }
  }

  /* ---------------------------------------------------------
     PLAYER NAME
  --------------------------------------------------------- */

  function getPlayerName() {
    const input = state.elements.joinPlayerName;
    const headerName = state.elements.playerName;

    let name = "";

    if (input && input.value.trim()) {
      name = input.value.trim();
    } else if (headerName && headerName.textContent.trim()) {
      name = headerName.textContent.trim();
    } else if (window.APPARA_PROFILE) {
      const profile = safeCall(
        window.APPARA_PROFILE,
        "getProfile"
      );

      name = profile && profile.name
        ? profile.name
        : "";
    }

    if (!name) {
      name = "Guest Player";
    }

    return name.slice(0, 24);
  }

  /* ---------------------------------------------------------
     ROOM CODE DISPLAY
  --------------------------------------------------------- */

  function showRoomCode(code) {
    const roomCode = String(code || "").trim();

    if (!roomCode) {
      notify("Room code is not available", "error");
      return false;
    }

    setText(state.elements.createdRoomCode, roomCode);

    setVisible(
      state.elements.createdRoomContainer,
      true
    );

    return true;
  }

  function hideRoomCode() {
    setVisible(
      state.elements.createdRoomContainer,
      false
    );

    setText(state.elements.createdRoomCode, "");
  }

  /* ---------------------------------------------------------
     ROOM STATUS DISPLAY
  --------------------------------------------------------- */

  function updateRoomStatus(status, opponentName) {
    const labels = {
      waiting: "Waiting for opponent",
      playing: "Game in progress",
      finished: "Game finished",
      disconnected: "Not in a room"
    };

    setText(
      state.elements.roomStatus,
      labels[status] || status || "Unknown"
    );

    if (opponentName) {
      setText(state.elements.opponentName, opponentName);
    }

    const inRoom = status === "waiting" || status === "playing";

    setVisible(state.elements.leaveRoom, inRoom);
    setVisible(state.elements.offerDraw, status === "playing");
    setVisible(state.elements.resign, status === "playing");
  }

/* =========================================================
   APPARA CHESS — ONLINE UI CONTROLLER
   PART 21Q — PART 1/3 END
   NEXT: PART 21Q — PART 2/3
========================================================= */
/* =========================================================
   APPARA CHESS — ONLINE UI CONTROLLER
   PART 21Q — PART 2/3
========================================================= */

/* ---------------------------------------------------------
   CREATE ROOM
--------------------------------------------------------- */

async function handleCreateRoom() {
  if (state.busy) return;

  const online = getOnlineModule();

  if (!online || typeof online.createRoom !== "function") {
    notify("Online service is unavailable", "error");
    return;
  }

  setBusy(true);
  updateConnectionStatus("connecting", "Creating room...");

  try {
    const result = await online.createRoom(getPlayerName());

    if (!result) {
      throw new Error("Room creation failed");
    }

    const roomCode = result.roomCode || result.code
      || safeCall(online, "getRoomCode");

    if (roomCode) {
      showRoomCode(roomCode);
    }

    updateRoomStatus("waiting");
    updateConnectionStatus("connected");

    notify("Room created. Share the code with your opponent.", "success");

  } catch (error) {
    console.error("[APPARA ONLINE UI] Create room:", error);

    updateConnectionStatus("error");
    notify(error.message || "Could not create room", "error");

  } finally {
    setBusy(false);
  }
}

/* ---------------------------------------------------------
   JOIN ROOM
--------------------------------------------------------- */

async function handleJoinRoom() {
  if (state.busy) return;

  const online = getOnlineModule();
  const input = state.elements.roomCodeInput;

  if (!online || typeof online.joinRoom !== "function") {
    notify("Online service is unavailable", "error");
    return;
  }

  const roomCode = input
    ? input.value.trim().toUpperCase()
    : "";

  if (!roomCode) {
    notify("Enter a room code first", "warning");
    if (input) input.focus();
    return;
  }

  if (!/^[A-Z0-9-]{4,16}$/.test(roomCode)) {
    notify("Please enter a valid room code", "warning");
    return;
  }

  setBusy(true);
  updateConnectionStatus("connecting", "Joining room...");

  try {
    const result = await online.joinRoom(
      roomCode,
      getPlayerName()
    );

    if (!result) {
      throw new Error("Could not join this room");
    }

    hideRoomCode();
    updateRoomStatus("playing");
    updateConnectionStatus("connected");

    notify("You joined the room", "success");

    if (input) input.value = "";

    if (window.APPARA_APP) {
      safeCall(window.APPARA_APP, "showPage", "game");
    }

  } catch (error) {
    console.error("[APPARA ONLINE UI] Join room:", error);

    updateConnectionStatus("error");
    notify(error.message || "Could not join room", "error");

  } finally {
    setBusy(false);
  }
}

/* ---------------------------------------------------------
   COPY ROOM CODE
--------------------------------------------------------- */

async function handleCopyRoomCode() {
  const codeElement = state.elements.createdRoomCode;
  const code = codeElement
    ? codeElement.textContent.trim()
    : "";

  if (!code) {
    notify("No room code to copy", "warning");
    return false;
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      const temporaryInput = document.createElement("textarea");

      temporaryInput.value = code;
      temporaryInput.style.position = "fixed";
      temporaryInput.style.opacity = "0";

      document.body.appendChild(temporaryInput);
      temporaryInput.select();

      const copied = document.execCommand("copy");

      temporaryInput.remove();

      if (!copied) {
        throw new Error("Copy command was unsuccessful");
      }
    }

    notify("Room code copied", "success");
    return true;

  } catch (error) {
    console.error("[APPARA ONLINE UI] Copy code:", error);
    notify("Could not copy room code", "error");
    return false;
  }
}

/* ---------------------------------------------------------
   LEAVE ROOM
--------------------------------------------------------- */

async function handleLeaveRoom() {
  const online = getOnlineModule();

  if (!online || typeof online.leaveRoom !== "function") {
    notify("Online service is unavailable", "error");
    return false;
  }

  try {
    await online.leaveRoom();

    state.roomData = null;

    hideRoomCode();
    updateRoomStatus("disconnected");
    updateConnectionStatus("disconnected");

    notify("You left the room", "info");

    if (window.APPARA_APP) {
      safeCall(window.APPARA_APP, "showPage", "online");
    }

    return true;

  } catch (error) {
    console.error("[APPARA ONLINE UI] Leave room:", error);
    notify(error.message || "Could not leave room", "error");
    return false;
  }
}

/* ---------------------------------------------------------
   DRAW OFFER
--------------------------------------------------------- */

async function handleOfferDraw() {
  const online = getOnlineModule();

  if (!online || typeof online.offerDraw !== "function") {
    notify("Draw offer is unavailable", "error");
    return false;
  }

  try {
    const result = await online.offerDraw();

    if (result === false) {
      throw new Error("Draw offer could not be sent");
    }

    notify("Draw offer sent", "success");
    return true;

  } catch (error) {
    notify(error.message || "Could not offer a draw", "error");
    return false;
  }
}

/* ---------------------------------------------------------
   DRAW RESPONSE
--------------------------------------------------------- */

async function handleDrawResponse(accepted) {
  const online = getOnlineModule();

  if (!online || typeof online.respondToDraw !== "function") {
    notify("Draw response is unavailable", "error");
    return false;
  }

  try {
    const result = await online.respondToDraw(Boolean(accepted));

    if (result === false) {
      throw new Error("Could not submit draw response");
    }

    setVisible(state.elements.acceptDraw, false);
    setVisible(state.elements.rejectDraw, false);

    notify(
      accepted ? "Draw accepted" : "Draw declined",
      "success"
    );

    return true;

  } catch (error) {
    notify(error.message || "Could not respond to draw", "error");
    return false;
  }
}

/* ---------------------------------------------------------
   RESIGN
--------------------------------------------------------- */

async function handleResign() {
  const online = getOnlineModule();

  if (!online || typeof online.resign !== "function") {
    notify("Resign is unavailable", "error");
    return false;
  }

  const confirmed = window.confirm(
    "Are you sure you want to resign this game?"
  );

  if (!confirmed) return false;

  try {
    const result = await online.resign();

    if (result === false) {
      throw new Error("Resignation could not be submitted");
    }

    notify("You resigned the game", "info");
    return true;

  } catch (error) {
    notify(error.message || "Could not resign", "error");
    return false;
  }
}

/* =========================================================
   APPARA CHESS — ONLINE UI CONTROLLER
   PART 21Q — PART 2/3 END
   NEXT: PART 21Q — PART 3/3
========================================================= */
 /* =========================================================
   APPARA CHESS — ONLINE UI CONTROLLER
   PART 21Q — PART 3/3
========================================================= */

/* ---------------------------------------------------------
   ROOM UPDATE CALLBACK
--------------------------------------------------------- */

function handleRoomUpdate(roomData) {
  if (!roomData || typeof roomData !== "object") {
    return;
  }

  state.roomData = roomData;

  const status = roomData.status || "waiting";

  const opponent =
    roomData.players && roomData.players.black
      ? roomData.players.black.name
      : "";

  updateRoomStatus(status, opponent);

  if (status === "playing") {
    updateConnectionStatus("connected");
    hideRoomCode();

    if (window.APPARA_APP &&
        window.APPARA_APP.getState().currentPage !== "game") {
      safeCall(window.APPARA_APP, "showPage", "game");
    }
  }

  if (status === "finished") {
    updateRoomStatus("finished", opponent);
    setVisible(state.elements.offerDraw, false);
    setVisible(state.elements.resign, false);
  }

  const drawOffer = roomData.drawOfferBy;

  if (drawOffer) {
    const online = getOnlineModule();
    const myColor = safeCall(online, "getPlayerColor");

    const opponentOffered =
      (drawOffer === "white" && myColor === "black") ||
      (drawOffer === "black" && myColor === "white");

    setVisible(state.elements.acceptDraw, opponentOffered);
    setVisible(state.elements.rejectDraw, opponentOffered);
  } else {
    setVisible(state.elements.acceptDraw, false);
    setVisible(state.elements.rejectDraw, false);
  }
}

/* ---------------------------------------------------------
   EVENT HELPERS
--------------------------------------------------------- */

function addEvent(element, eventName, handler) {
  if (!element) return;

  element.addEventListener(eventName, handler);

  state.handlers.push({
    element: element,
    eventName: eventName,
    handler: handler
  });
}

function removeEvents() {
  state.handlers.forEach(function (item) {
    item.element.removeEventListener(
      item.eventName,
      item.handler
    );
  });

  state.handlers = [];
}

/* ---------------------------------------------------------
   BIND ONLINE UI EVENTS
--------------------------------------------------------- */

function bindEvents() {
  const elements = state.elements;

  addEvent(
    elements.createRoom,
    "click",
    handleCreateRoom
  );

  addEvent(
    elements.joinRoom,
    "click",
    handleJoinRoom
  );

  addEvent(
    elements.copyRoomCode,
    "click",
    handleCopyRoomCode
  );

  addEvent(
    elements.leaveRoom,
    "click",
    handleLeaveRoom
  );

  addEvent(
    elements.offerDraw,
    "click",
    handleOfferDraw
  );

  addEvent(
    elements.acceptDraw,
    "click",
    function () {
      handleDrawResponse(true);
    }
  );

  addEvent(
    elements.rejectDraw,
    "click",
    function () {
      handleDrawResponse(false);
    }
  );

  addEvent(
    elements.resign,
    "click",
    handleResign
  );
}

/* ---------------------------------------------------------
   INITIALIZE
--------------------------------------------------------- */

function init() {
  if (state.initialized) {
    return true;
  }

  cacheElements();
  bindEvents();

  const online = getOnlineModule();

  if (online && typeof online.setRoomUpdateHandler === "function") {
    online.setRoomUpdateHandler(handleRoomUpdate);
  }

  updateConnectionStatus(
    online && safeCall(online, "isConnected")
      ? "connected"
      : "disconnected"
  );

  updateRoomStatus("disconnected");

  state.initialized = true;

  console.log("[APPARA CHESS] Online UI initialized");

  return true;
}

/* ---------------------------------------------------------
   REFRESH UI
--------------------------------------------------------- */

function refresh() {
  cacheElements();

  const online = getOnlineModule();

  if (online && typeof online.setRoomUpdateHandler === "function") {
    online.setRoomUpdateHandler(handleRoomUpdate);
  }

  const room = online
    ? safeCall(online, "getRoom")
    : null;

  if (room) {
    handleRoomUpdate(room);
  } else {
    updateRoomStatus("disconnected");
  }

  updateConnectionStatus(
    online && safeCall(online, "isConnected")
      ? "connected"
      : "disconnected"
  );

  return true;
}

/* ---------------------------------------------------------
   PUBLIC API
--------------------------------------------------------- */

function getState() {
  return {
    initialized: state.initialized,
    busy: state.busy,
    currentStatus: state.currentStatus,
    roomData: state.roomData
      ? JSON.parse(JSON.stringify(state.roomData))
      : null
  };
}

function destroy() {
  removeEvents();

  state.initialized = false;
  state.elements = {};
  state.roomData = null;
  state.busy = false;

  return true;
}

return Object.freeze({
  init: init,
  refresh: refresh,

  updateConnectionStatus: updateConnectionStatus,
  updateRoomStatus: updateRoomStatus,
  showRoomCode: showRoomCode,
  hideRoomCode: hideRoomCode,

  handleRoomUpdate: handleRoomUpdate,
  handleCreateRoom: handleCreateRoom,
  handleJoinRoom: handleJoinRoom,
  handleLeaveRoom: handleLeaveRoom,
  handleCopyRoomCode: handleCopyRoomCode,

  handleOfferDraw: handleOfferDraw,
  handleDrawResponse: handleDrawResponse,
  handleResign: handleResign,

  getState: getState,
  destroy: destroy
});

})();

/* =========================================================
   APPARA CHESS — ONLINE UI CONTROLLER
   PART 21Q — PART 3/3 END
   FILE COMPLETE
========================================================= */                          
