
/* =========================================
   APPARA CHESS
   PART 16 — TOURNAMENT SYSTEM
========================================= */

class ApparaChessTournament {
  constructor() {
    this.storageKey = "appara_chess_tournaments";

    this.tournaments = this.load();
    this.activeTournament = null;

    this.formats = {
      knockout: "Knockout",
      roundrobin: "Round Robin",
      swiss: "Swiss System"
    };

    this.render();
    this.connectEvents();
  }

  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Tournament loading error:", error);
      return [];
    }
  }

  save() {
    localStorage.setItem(
      this.storageKey,
      JSON.stringify(this.tournaments)
    );
    this.render();
  }

  createTournament(options = {}) {
    const name = String(options.name || "").trim();
    const format = options.format || "knockout";
    const capacity = Number(options.capacity) || 8;

    if (!name || name.length > 40) {
      this.notify("Enter a tournament name (maximum 40 characters).");
      return null;
    }

    if (!this.formats[format]) {
      this.notify("Invalid tournament format.");
      return null;
    }

    if (![4, 8, 16, 32].includes(capacity)) {
      this.notify("Choose 4, 8, 16 or 32 players.");
      return null;
    }

    const tournament = {
      id: this.createId(),
      name,
      format,
      capacity,
      status: "registration",
      players: [],
      rounds: [],
      winner: null,
      createdAt: new Date().toISOString()
    };

    const profile = window.apparaProfile?.getProfile();

    if (profile) {
      tournament.players.push({
        id: profile.id,
        name: profile.username,
        rating: profile.rating,
        score: 0
      });
    }

    this.tournaments.unshift(tournament);
    this.activeTournament = tournament.id;
    this.save();

    this.notify("Tournament created");
    return tournament;
  }

  createId() {
    return "T-" + Math.random().toString(36)
      .substring(2, 9).toUpperCase();
  }

  getTournament(id) {
    return this.tournaments.find(item => item.id === id) || null;
  }

  joinTournament(id, player = {}) {
    const tournament = this.getTournament(id);
    if (!tournament) return false;

    if (tournament.status !== "registration") {
      this.notify("Registration is closed.");
      return false;
    }

    const playerId = player.id || this.createId();

    if (tournament.players.some(p => p.id === playerId)) {
      this.notify("Player already registered.");
      return false;
    }

    if (tournament.players.length >= tournament.capacity) {
      this.notify("Tournament is full.");
      return false;
    }

    tournament.players.push({
      id: playerId,
      name: String(player.name || "Player").slice(0, 20),
      rating: Number(player.rating) || 1200,
      score: 0
    });

    this.save();
    return true;
  }

  removePlayer(tournamentId, playerId) {
    const tournament = this.getTournament(tournamentId);
    if (!tournament || tournament.status !== "registration") {
      return false;
    }

    tournament.players = tournament.players.filter(
      player => player.id !== playerId
    );

    this.save();
    return true;
  }

  startTournament(id) {
    const tournament = this.getTournament(id);
    if (!tournament) return false;

    if (tournament.status !== "registration") {
      this.notify("Tournament has already started.");
      return false;
    }

    if (tournament.players.length < 2) {
      this.notify("At least 2 players are required.");
      return false;
    }

    if (tournament.format === "knockout") {
      this.createKnockoutRound(tournament);
    } else if (tournament.format === "roundrobin") {
      this.createRoundRobin(tournament);
    } else {
      this.createSwissRound(tournament, 1);
    }

    tournament.status = "active";
    this.activeTournament = id;

    this.save();
    this.notify("Tournament started");
    return true;
  }

  shufflePlayers(players) {
    const list = [...players];

    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    return list;
  }

  createKnockoutRound(tournament) {
    const players = this.shufflePlayers(tournament.players);
    const matches = [];

    for (let i = 0; i < players.length; i += 2) {
      const first = players[i];
      const second = players[i + 1] || null;

      matches.push({
        id: this.createId(),
        white: first,
        black: second,
        result: second ? null : "white",
        winner: second ? null : first.id,
        completed: !second
      });
    }

    tournament.rounds.push({
      number: tournament.rounds.length + 1,
      matches
    });

    this.advanceKnockoutByes(tournament);
  }

  advanceKnockoutByes(tournament) {
    const round = tournament.rounds[tournament.rounds.length - 1];
    if (!round) return;

    const allCompleted = round.matches.every(match => match.completed);
    if (!allCompleted) return;

    const winners = round.matches
      .map(match => tournament.players.find(p => p.id === match.winner))
      .filter(Boolean);

    if (winners.length === 1) {
      tournament.winner = winners[0].id;
      tournament.status = "completed";
      return;
    }

    if (winners.length > 1) {
      this.createKnockoutRound({
        ...tournament,
        players: winners
      });

      const newRound = tournament.rounds[tournament.rounds.length - 1];
      tournament.rounds.push(newRound);
    }
  }

  createRoundRobin(tournament) {
    const players = [...tournament.players];

    if (players.length % 2 !== 0) {
      players.push(null);
    }

    const total = players.length;
    const rounds = [];

    for (let roundIndex = 0; roundIndex < total - 1; roundIndex++) {
      const matches = [];

      for (let i = 0; i < total / 2; i++) {
        const white = players[i];
        const black = players[total - 1 - i];

        if (white && black) {
          matches.push({
            id: this.createId(),
            white,
            black,
            result: null,
            winner: null,
            completed: false
          });
        }
      }

      rounds.push({
        number: roundIndex + 1,
        matches
      });

      const fixed = players[0];
      const rotating = players.slice(1);
      rotating.unshift(rotating.pop());

      players.splice(0, players.length, fixed, ...rotating);
    }

    tournament.rounds = rounds;
  }

  createSwissRound(tournament, roundNumber) {
    const sorted = [...tournament.players].sort(
      (a, b) => b.score - a.score || b.rating - a.rating
    );

    const matches = [];

    for (let i = 0; i < sorted.length; i += 2) {
      const white = sorted[i];
      const black = sorted[i + 1] || null;

      matches.push({
        id: this.createId(),
        white,
        black,
        result: black ? null : "white",
        winner: black ? null : white.id,
        completed: !black
      });
    }

    tournament.rounds.push({
      number: roundNumber,
      matches
    });
  }

  recordResult(tournamentId, matchId, result) {
    const tournament = this.getTournament(tournamentId);
    if (!tournament || tournament.status !== "active") return false;

    const match = tournament.rounds
      .flatMap(round => round.matches)
      .find(item => item.id === matchId);

    if (!match || match.completed || !match.black) return false;

    if (!["white", "black", "draw"].includes(result)) {
      return false;
    }

    match.result = result;
    match.completed = true;

    if (result === "white") {
      match.winner = match.white.id;
      this.addScore(tournament, match.white.id, 1);
    } else if (result === "black") {
      match.winner = match.black.id;
      this.addScore(tournament, match.black.id, 1);
    } else {
      this.addScore(tournament, match.white.id, 0.5);
      this.addScore(tournament, match.black.id, 0.5);
    }

    this.checkTournamentProgress(tournament);
    this.save();

    return true;
  }

  addScore(tournament, playerId, points) {
    const player = tournament.players.find(
      item => item.id === playerId
    );

    if (player) player.score += points;
  }

  checkTournamentProgress(tournament) {
    const currentRound = tournament.rounds[
      tournament.rounds.length - 1
    ];

    if (!currentRound) return;

    if (!currentRound.matches.every(match => match.completed)) {
      return;
    }

    if (tournament.format === "knockout") {
      const winners = currentRound.matches
        .map(match => tournament.players.find(
          player => player.id === match.winner
        ))
        .filter(Boolean);

      if (winners.length === 1) {
        tournament.winner = winners[0].id;
        tournament.status = "completed";
      } else {
        this.createKnockoutRound(tournament);
      }

      return;
    }

    if (tournament.format === "swiss") {
      const maxRounds = Math.ceil(Math.log2(tournament.capacity)) + 1;

      if (currentRound.number < maxRounds) {
        this.createSwissRound(tournament, currentRound.number + 1);
      } else {
        this.finishByScore(tournament);
      }

      return;
    }

    const allMatches = tournament.rounds.flatMap(
      round => round.matches
    );

    if (allMatches.every(match => match.completed)) {
      this.finishByScore(tournament);
    }
  }

  finishByScore(tournament) {
    const ranking = [...tournament.players].sort(
      (a, b) => b.score - a.score || b.rating - a.rating
    );

    tournament.winner = ranking[0]?.id || null;
    tournament.status = "completed";
  }

  getLeaderboard(id) {
    const tournament = this.getTournament(id);
    if (!tournament) return [];

    return [...tournament.players].sort(
      (a, b) => b.score - a.score || b.rating - a.rating
    );
  }

  render() {
    const container = document.getElementById("tournament-list");
    if (!container) return;

    container.innerHTML = "";

    if (!this.tournaments.length) {
      container.textContent = "No tournaments created yet.";
      return;
    }

    this.tournaments.forEach(tournament => {
      const card = document.createElement("div");
      card.className = "tournament-card";

      const title = document.createElement("h3");
      title.textContent = tournament.name;

      const details = document.createElement("p");
      details.textContent =
        `${this.formats[tournament.format]} • ` +
        `${tournament.players.length}/${tournament.capacity} players`;

      const status = document.createElement("span");
      status.className = "tournament-status";
      status.textContent = tournament.status.toUpperCase();

      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.textContent = "View Tournament";

      openButton.addEventListener("click", () => {
        this.activeTournament = tournament.id;
        this.showDetails(tournament.id);
      });

      card.append(title, details, status, openButton);
      container.appendChild(card);
    });
  }

  showDetails(id) {
    const tournament = this.getTournament(id);
    if (!tournament) return;

    const container = document.getElementById("tournament-details");
    if (!container) return;

    container.innerHTML = "";

    const heading = document.createElement("h3");
    heading.textContent = tournament.name;
    container.appendChild(heading);

    const ranking = this.getLeaderboard(id);

    ranking.forEach((player, index) => {
      const row = document.createElement("p");
      row.textContent =
        `${index + 1}. ${player.name} — ${player.score} points`;
      container.appendChild(row);
    });

    if (tournament.status === "registration") {
      const startButton = document.createElement("button");
      startButton.type = "button";
      startButton.textContent = "Start Tournament";

      startButton.addEventListener("click", () => {
        this.startTournament(id);
        this.showDetails(id);
      });

      container.appendChild(startButton);
    }
  }

  connectEvents() {
    const createButton = document.getElementById(
      "create-tournament-btn"
    );

    if (createButton) {
      createButton.addEventListener("click", () => {
        const name = document.getElementById(
          "tournament-name"
        )?.value;

        const format = document.getElementById(
          "tournament-format"
        )?.value || "knockout";

        const capacity = document.getElementById(
          "tournament-capacity"
        )?.value || 8;

        this.createTournament({
          name,
          format,
          capacity
        });
      });
    }
  }

  notify(message) {
    if (window.apparaApp?.showNotification) {
      window.apparaApp.showNotification(message);
    } else {
      console.log("[APPARA TOURNAMENT]", message);
    }
  }
}

/* GLOBAL INSTANCE */

window.apparaTournament = new ApparaChessTournament();

/* PART 16 END */
    
