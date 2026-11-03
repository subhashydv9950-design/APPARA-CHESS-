
/* =========================================
   APPARA CHESS
   PART 15 — PLAYER PROFILE SYSTEM
========================================= */

class ApparaChessProfile {
  constructor() {
    this.storageKey = "appara_chess_profile";

    this.defaultProfile = {
      id: this.createPlayerId(),
      username: "Player",
      avatar: "♟",
      country: "India",
      rating: 1200,
      highestRating: 1200,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      puzzlesSolved: 0,
      onlineGames: 0,
      totalPlayTime: 0,
      joinedAt: new Date().toISOString(),
      history: []
    };

    this.profile = this.load();
    this.render();
    this.connectEvents();
  }

  createPlayerId() {
    return "AP-" + Math.random().toString(36)
      .substring(2, 8).toUpperCase();
  }

  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);

      if (saved) {
        return {
          ...this.defaultProfile,
          ...JSON.parse(saved)
        };
      }
    } catch (error) {
      console.error("Profile loading error:", error);
    }

    return { ...this.defaultProfile };
  }

  save() {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify(this.profile)
      );
    } catch (error) {
      console.error("Profile saving error:", error);
    }

    this.render();
  }

  getProfile() {
    return { ...this.profile };
  }

  updateProfile(data = {}) {
    const allowedFields = [
      "username",
      "avatar",
      "country"
    ];

    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        this.profile[field] = String(data[field]).trim();
      }
    });

    this.save();
  }

  setUsername(username) {
    const name = String(username || "").trim();

    if (name.length < 2 || name.length > 20) {
      return false;
    }

    this.profile.username = name;
    this.save();
    return true;
  }

  setAvatar(avatar) {
    this.profile.avatar = avatar || "♟";
    this.save();
  }

  recordGame(result, details = {}) {
    const validResults = ["win", "loss", "draw"];

    if (!validResults.includes(result)) return;

    this.profile.gamesPlayed++;

    if (result === "win") this.profile.wins++;
    if (result === "loss") this.profile.losses++;
    if (result === "draw") this.profile.draws++;

    if (details.online) {
      this.profile.onlineGames++;
    }

    const entry = {
      result,
      opponent: details.opponent || "Opponent",
      mode: details.mode || "offline",
      date: new Date().toISOString(),
      moves: Number(details.moves) || 0
    };

    this.profile.history.unshift(entry);

    if (this.profile.history.length > 50) {
      this.profile.history.length = 50;
    }

    this.updateRating(result);
    this.save();
  }

  updateRating(result) {
    const changes = {
      win: 15,
      loss: -10,
      draw: 3
    };

    this.profile.rating = Math.max(
      100,
      this.profile.rating + changes[result]
    );

    this.profile.highestRating = Math.max(
      this.profile.highestRating,
      this.profile.rating
    );
  }

  addPuzzleSolved() {
    this.profile.puzzlesSolved++;
    this.save();
  }

  addPlayTime(minutes = 0) {
    const value = Math.max(0, Number(minutes) || 0);
    this.profile.totalPlayTime += value;
    this.save();
  }

  getWinRate() {
    if (!this.profile.gamesPlayed) return 0;

    return Math.round(
      (this.profile.wins / this.profile.gamesPlayed) * 100
    );
  }

  getStatistics() {
    return {
      gamesPlayed: this.profile.gamesPlayed,
      wins: this.profile.wins,
      losses: this.profile.losses,
      draws: this.profile.draws,
      rating: this.profile.rating,
      highestRating: this.profile.highestRating,
      winRate: this.getWinRate(),
      puzzlesSolved: this.profile.puzzlesSolved
    };
  }

  render() {
    const p = this.profile;

    this.setText("profile-name", p.username);
    this.setText("profile-id", p.id);
    this.setText("profile-rating", p.rating);
    this.setText("profile-highest-rating", p.highestRating);
    this.setText("profile-games", p.gamesPlayed);
    this.setText("profile-wins", p.wins);
    this.setText("profile-losses", p.losses);
    this.setText("profile-draws", p.draws);
    this.setText("profile-win-rate", this.getWinRate() + "%");
    this.setText("profile-puzzles", p.puzzlesSolved);

    const avatar = document.getElementById("profile-avatar");
    if (avatar) avatar.textContent = p.avatar;

    const history = document.getElementById("profile-history");

    if (history) {
      history.innerHTML = "";

      if (!p.history.length) {
        history.textContent = "No games played yet.";
      } else {
        p.history.slice(0, 10).forEach((game) => {
          const item = document.createElement("div");
          item.className = "profile-history-item";

          const result = document.createElement("strong");
          result.textContent = game.result.toUpperCase();

          const opponent = document.createElement("span");
          opponent.textContent = " vs " + game.opponent;

          const mode = document.createElement("small");
          mode.textContent =
            `${game.mode} • ${game.moves} moves • ` +
            new Date(game.date).toLocaleDateString();

          item.append(result, opponent, mode);
          history.appendChild(item);
        });
      }
    }
  }

  setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  }

  connectEvents() {
    const nameInput = document.getElementById("profile-name-input");
    const saveButton = document.getElementById("save-profile-btn");

    if (saveButton) {
      saveButton.addEventListener("click", () => {
        if (!nameInput) return;

        const success = this.setUsername(nameInput.value);

        if (success) {
          this.notify("Profile updated successfully");
        } else {
          this.notify("Name must contain 2–20 characters");
        }
      });
    }

    document.querySelectorAll("[data-avatar]").forEach((button) => {
      button.addEventListener("click", () => {
        this.setAvatar(button.dataset.avatar);
      });
    });
  }

  exportProfile() {
    const data = JSON.stringify(this.profile, null, 2);
    const blob = new Blob([data], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "appara-chess-profile.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  resetProfile() {
    const confirmed = window.confirm(
      "Reset your local player profile and statistics?"
    );

    if (!confirmed) return false;

    this.profile = { ...this.defaultProfile };
    this.save();

    this.notify("Profile has been reset");
    return true;
  }

  notify(message) {
    if (window.apparaApp?.showNotification) {
      window.apparaApp.showNotification(message);
    } else {
      console.log("[APPARA PROFILE]", message);
    }
  }
}

/* GLOBAL INSTANCE */

window.apparaProfile = new ApparaChessProfile();

/* PART 15 END */
