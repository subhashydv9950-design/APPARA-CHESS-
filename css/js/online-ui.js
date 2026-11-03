
/* =========================================
   APPARA CHESS
   PART 20 — ONLINE MULTIPLAYER UI
========================================= */

class ApparaChessOnlineUI {
  constructor() {
    this.multiplayer = window.apparaMultiplayer;
    this.online = window.apparaOnline;
    this.createButton = document.getElementById("create-room-btn");
    this.joinButton = document.getElementById("join-room-btn");

    this.init();
  }

  init() {
    if (!this.createButton || !this.joinButton) {
      console.warn("Online UI elements not found.");
      return;
    }

    this.createButton.addEventListener("click", () => {
      this.createRoom();
    });

    this.joinButton.addEventListener("click", () => {
      this.joinRoom();
    });

    this.setStatus("Ready to connect");
  }

  async createRoom() {
    if (!this.multiplayer) {
      this.setStatus("Multiplayer system unavailable");
      return;
    }

    this.setLoading(true);
    this.setStatus("Connecting to Firebase...");

    try {
      const result = await this.multiplayer.createOnlineMatch();

      if (!result) {
        this.setStatus("Room creation failed");
        return;
      }

      const code =
        result.code ||
        result.roomCode ||
        result.room?.code ||
        this.online?.roomCode ||
        "";

      if (code) {
        this.showRoomCode(code);
        this.setStatus("Room created. Share the code with your friend.");
      } else {
        this.setStatus("Room created. Check your online connection.");
      }

    } catch (error) {
      console.error("Create room error:", error);
      this.setStatus(error.message || "Unable to create room");
    } finally {
      this.setLoading(false);
    }
  }

  async joinRoom() {
    if (!this.multiplayer) {
      this.setStatus("Multiplayer system unavailable");
      return;
    }

    const input = document.getElementById("room-code-input");
    const code = input?.value.trim().toUpperCase();

    if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
      this.setStatus("Enter a valid 6-character room code");
      return;
    }

    this.setLoading(true);
    this.setStatus("Joining room...");

    try {
      const result = await this.multiplayer.joinOnlineMatch(code);

      if (result) {
        this.setStatus("Successfully joined the room");
        window.apparaGame?.showPage("game-page");
      } else {
        this.setStatus("Unable to join this room");
      }

    } catch (error) {
      console.error("Join room error:", error);
      this.setStatus(error.message || "Room joining failed");
    } finally {
      this.setLoading(false);
    }
  }

  showRoomCode(code) {
    const output = document.getElementById("created-room-code");
    if (!output) return;

    output.textContent = `ROOM CODE: ${code}`;

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Copy Code";

    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code);
        this.setStatus("Room code copied");
      } catch (error) {
        this.setStatus("Copy unavailable. Select and copy the code.");
      }
    });

    output.appendChild(document.createTextNode(" "));
    output.appendChild(copyButton);
  }

  setStatus(message) {
    const element = document.getElementById(
      "online-connection-status"
    );

    if (element) element.textContent = message;
  }

  setLoading(loading) {
    if (this.createButton) {
      this.createButton.disabled = loading;
      this.createButton.textContent =
        loading ? "Please wait..." : "Create Room";
    }

    if (this.joinButton) {
      this.joinButton.disabled = loading;
      this.joinButton.textContent =
        loading ? "Please wait..." : "Join Room";
    }
  }
}

/* GLOBAL INSTANCE */

window.apparaOnlineUI = new ApparaChessOnlineUI();

/* PART 20 END */
