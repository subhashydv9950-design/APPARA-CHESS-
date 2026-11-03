
/* =========================================================
   APPARA CHESS — TOURNAMENT MANAGER
   PART 17 — js/tournament.js
   ========================================================= */

window.APPARA_TOURNAMENT = (function () {
  "use strict";

  const STORAGE_KEY = "appara_chess_tournaments_v1";

  let tournaments = [];
  let activeTournamentId = null;
  let initialized = false;

  const FORMATS = {
    knockout: "Single Elimination",
    roundrobin: "Round Robin",
    swiss: "Swiss System"
  };

  /* ---------- STORAGE ---------- */

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const data = saved ? JSON.parse(saved) : [];

      tournaments = Array.isArray(data) ? data : [];
    } catch (error) {
      tournaments = [];
      console.warn("Tournament data could not be loaded.", error);
    }

    return tournaments;
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tournaments)
      );
      return true;
    } catch (error) {
      console.warn("Tournament data could not be saved.", error);
      return false;
    }
  }

  /* ---------- HELPERS ---------- */

  function createId() {
    return "APT-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.floor(Math.random() * 900 + 100);
  }

  function notify(message, type) {
    if (
      window.APPARA_APP &&
      typeof window.APPARA_APP.notify === "function"
    ) {
      window.APPARA_APP.notify(message, type || "info");
    } else {
      console.info("[APPARA TOURNAMENT]", message);
    }
  }

  function getPlayer() {
    if (
      window.APPARA_PROFILE &&
      typeof window.APPARA_PROFILE.getProfile === "function"
    ) {
      return window.APPARA_PROFILE.getProfile();
    }

    return {
      id: "LOCAL-PLAYER",
      name: "Guest Player"
    };
  }

  function findTournament(id) {
    return tournaments.find(function (item) {
      return item.id === id;
    }) || null;
  }

  function getTournament(id) {
    const tournament = findTournament(id);

    return tournament
      ? JSON.parse(JSON.stringify(tournament))
      : null;
  }

  /* ---------- VALIDATION ---------- */

  function validateTournament(data) {
    if (!data || typeof data !== "object") {
      return "Invalid tournament details.";
    }

    const name = String(data.name || "").trim();

    if (!name) {
      return "Enter a tournament name.";
    }

    if (name.length > 40) {
      return "Tournament name must be 40 characters or less.";
    }

    if (!FORMATS[data.format]) {
      return "Select a valid tournament format.";
    }

    const capacity = Number(data.capacity);

    if (
      !Number.isInteger(capacity) ||
      capacity < 2 ||
      capacity > 32
    ) {
      return "Players must be between 2 and 32.";
    }

    return null;
  }

  /* ---------- CREATE TOURNAMENT ---------- */

  function createTournament(data) {
    const error = validateTournament(data);

    if (error) {
      notify(error, "error");
      return false;
    }

    const player = getPlayer();

    const tournament = {
      id: createId(),
      name: String(data.name).trim(),
      format: data.format,
      formatName: FORMATS[data.format],
      capacity: Number(data.capacity),
      status: "registration",
      createdAt: new Date().toISOString(),
      createdBy: player.id,
      players: [
        {
          id: player.id,
          name: player.name,
          rating: player.rating || 1000,
          score: 0,
          wins: 0,
          losses: 0,
          draws: 0
        }
      ],
      rounds: [],
      currentRound: 0,
      winner: null,
      isLocal: true
    };

    tournaments.unshift(tournament);
    activeTournamentId = tournament.id;

    save();
    render();

    notify("Tournament created successfully.", "success");

    return getTournament(tournament.id);
  }

  /* ---------- JOIN TOURNAMENT ---------- */

  function joinTournament(id) {
    const tournament = findTournament(id);

    if (!tournament) {
      notify("Tournament not found.", "error");
      return false;
    }

    if (tournament.status !== "registration") {
      notify("Registration is closed.", "error");
      return false;
    }

    const player = getPlayer();

    const alreadyJoined = tournament.players.some(function (item) {
      return item.id === player.id;
    });

    if (alreadyJoined) {
      notify("You have already joined this tournament.", "info");
      return false;
    }

    if (tournament.players.length >= tournament.capacity) {
      notify("Tournament is full.", "error");
      return false;
    }

    tournament.players.push({
      id: player.id,
      name: player.name,
      rating: player.rating || 1000,
      score: 0,
      wins: 0,
      losses: 0,
      draws: 0
    });

    save();
    render();

    notify("You joined the local tournament.", "success");

    return true;
  }

  /* ---------- START TOURNAMENT ---------- */

  function startTournament(id) {
    const tournament = findTournament(id);

    if (!tournament) return false;

    if (tournament.status !== "registration") {
      notify("Tournament has already started.", "error");
      return false;
    }

    if (tournament.players.length < 2) {
      notify("At least 2 players are required.", "error");
      return false;
    }

    tournament.status = "active";
    tournament.startedAt = new Date().toISOString();
    tournament.currentRound = 1;

    generateRound(tournament);

    save();
    render();

    notify("Tournament started.", "success");

    return true;
  }

  /* ---------- ROUND GENERATION ---------- */

  function generateRound(tournament) {
    const players = tournament.players.slice();

    if (tournament.format === "roundrobin") {
      generateRoundRobinRound(tournament, players);
    } else if (tournament.format === "swiss") {
      generateSwissRound(tournament, players);
    } else {
      generateKnockoutRound(tournament, players);
    }
  }

  function shufflePlayers(players) {
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = players[i];
      players[i] = players[j];
      players[j] = temp;
    }

    return players;
  }

  function generateKnockoutRound(tournament, players) {
    const round = {
      number: tournament.currentRound,
      matches: [],
      completed: false
    };

    shufflePlayers(players);

    for (let i = 0; i < players.length; i += 2) {
      if (i + 1 >= players.length) {
        players[i].score += 1;

        round.matches.push({
          white: players[i].id,
          black: null,
          result: "bye",
          completed: true
        });
      } else {
        round.matches.push({
          white: players[i].id,
          black: players[i + 1].id,
          result: null,
          completed: false
        });
      }
    }

    tournament.rounds.push(round);
  }

  function generateRoundRobinRound(tournament, players) {
    const round = {
      number: tournament.currentRound,
      matches: [],
      completed: false
    };

    const previousMatches = tournament.rounds.reduce(
      function (all, item) {
        return all.concat(item.matches || []);
      },
      []
    );

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i].id;
        const b = players[j].id;

        const alreadyPlayed = previousMatches.some(function (match) {
          return (
            (match.white === a && match.black === b) ||
            (match.white === b && match.black === a)
          );
        });

        if (!alreadyPlayed) {
          round.matches.push({
            white: a,
            black: b,
            result: null,
            completed: false
          });
        }
      }
    }

    if (round.matches.length === 0) {
      tournament.status = "completed";
      finishTournament(tournament);
      return;
    }

    tournament.rounds.push(round);
  }

  function generateSwissRound(tournament, players) {
    players.sort(function (a, b) {
      return b.score - a.score || b.rating - a.rating;
    });

    const round = {
      number: tournament.currentRound,
      matches: [],
      completed: false
    };

    for (let i = 0; i < players.length; i += 2) {
      if (i + 1 >= players.length) {
        players[i].score += 1;

        round.matches.push({
          white: players[i].id,
          black: null,
          result: "bye",
          completed: true
        });
      } else {
        round.matches.push({
          white: players[i].id,
          black: players[i + 1].id,
          result: null,
          completed: false
        });
      }
    }

    tournament.rounds.push(round);
  }

  /* ---------- MATCH RESULTS ---------- */

  function recordMatchResult(id, roundNumber, matchIndex, result) {
    const tournament = findTournament(id);

    if (!tournament || tournament.status !== "active") {
      return false;
    }

    const round = tournament.rounds.find(function (item) {
      return item.number === Number(roundNumber);
    });

    if (!round || !round.matches[matchIndex]) {
      return false;
    }

    const match = round.matches[matchIndex];

    if (match.completed || !match.black) {
      return false;
    }

    if (!["white", "black", "draw"].includes(result)) {
      return false;
    }

    match.result = result;
    match.completed = true;

    const white = tournament.players.find(function (player) {
      return player.id === match.white;
    });

    const black = tournament.players.find(function (player) {
      return player.id === match.black;
    });

    if (!white || !black) return false;

    if (result === "white") {
      white.score += 1;
      white.wins += 1;
      black.losses += 1;
    } else if (result === "black") {
      black.score += 1;
      black.wins += 1;
      white.losses += 1;
    } else {
      white.score += 0.5;
      black.score += 0.5;
      white.draws += 1;
      black.draws += 1;
    }

    round.completed = round.matches.every(function (item) {
      return item.completed;
    });

    if (round.completed) {
      advanceTournament(tournament);
    }

    save();
    render();

    return true;
  }

  /* ---------- ADVANCE TO NEXT ROUND ---------- */

  function advanceTournament(tournament) {
    if (tournament.format === "knockout") {
      const lastRound = tournament.rounds[
        tournament.rounds.length - 1
      ];

      const winners = [];

      lastRound.matches.forEach(function (match) {
        if (match.result === "bye") {
          winners.push(match.white);
        } else if (match.result === "white") {
          winners.push(match.white);
        } else if (match.result === "black") {
          winners.push(match.black);
        }
      });

      if (winners.length <= 1) {
        finishTournament(
          tournament,
          winners.length ? winners[0] : null
        );
        return;
      }

      const winnerPlayers = winners.map(function (id) {
        return tournament.players.find(function (player) {
          return player.id === id;
        });
      }).filter(Boolean);

      tournament.currentRound += 1;
      generateKnockoutRound(tournament, winnerPlayers);

    } else if (tournament.format === "roundrobin") {
      generateRoundRobinRound(tournament, tournament.players.slice());
      if (tournament.status !== "completed") {
        tournament.currentRound += 1;
        const last = tournament.rounds[tournament.rounds.length - 1];
        if (last) last.number = tournament.currentRound;
      }

    } else if (tournament.format === "swiss") {
      const maxRounds = Math.ceil(Math.log2(tournament.capacity)) + 1;

      if (tournament.currentRound >= maxRounds) {
        finishTournament(tournament);
      } else {
        tournament.currentRound += 1;
        generateSwissRound(tournament, tournament.players.slice());
      }
    }
  }

  /* ---------- FINISH ---------- */

  function finishTournament(tournament, winnerId) {
    if (!tournament) return;

    if (!winnerId && tournament.players.length) {
      const ranked = tournament.players.slice().sort(function (a, b) {
        return b.score - a.score || b.rating - a.rating;
      });

      winnerId = ranked[0].id;
    }

    const winner = tournament.players.find(function (player) {
      return player.id === winnerId;
    });

    tournament.winner = winner
      ? {
          id: winner.id,
          name: winner.name
        }
      : null;

    tournament.status = "completed";
    tournament.finishedAt = new Date().toISOString();
  }

  /* ---------- LEADERBOARD ---------- */

  function getStandings(id) {
    const tournament = findTournament(id);
    if (!tournament) return [];

    return tournament.players.slice().sort(function (a, b) {
      return b.score - a.score ||
        b.wins - a.wins ||
        b.rating - a.rating;
    });
  }

  /* ---------- UI RENDERING ---------- */

  function renderList() {
    const container = document.getElementById("tournament-list");
    if (!container) return;

    container.innerHTML = "";

    if (!tournaments.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No tournaments created yet.";
      container.appendChild(empty);
      return;
    }

    tournaments.forEach(function (tournament) {
      const card = document.createElement("div");
      card.className = "tournament-card";

      const title = document.createElement("h3");
      title.textContent = tournament.name;

      const info = document.createElement("p");
      info.textContent =
        tournament.formatName +
        " • " +
        tournament.players.length +
        "/" +
        tournament.capacity +
        " players";

      const status = document.createElement("span");
      status.textContent = tournament.status.toUpperCase();

      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.textContent = "View Details";

      openButton.addEventListener("click", function () {
        activeTournamentId = tournament.id;
        renderDetails(tournament.id);
      });

      card.appendChild(title);
      card.appendChild(info);
      card.appendChild(status);
      card.appendChild(openButton);

      container.appendChild(card);
    });
  }

  function renderDetails(id) {
    const container = document.getElementById("tournament-details");
    if (!container) return;

    const tournament = findTournament(id);

    container.innerHTML = "";

    if (!tournament) {
      container.textContent = "Tournament not found.";
      return;
    }

    const title = document.createElement("h3");
    title.textContent = tournament.name;

    const info = document.createElement("p");
    info.textContent =
      tournament.formatName +
      " • " +
      tournament.status +
      " • " +
      tournament.players.length +
      " players";

    container.appendChild(title);
    container.appendChild(info);

    if (tournament.status === "registration") {
      const joinButton = document.createElement("button");
      joinButton.type = "button";
      joinButton.textContent = "Join Tournament";

      joinButton.addEventListener("click", function () {
        joinTournament(id);
        renderDetails(id);
      });

      container.appendChild(joinButton);

      const startButton = document.createElement("button");
      startButton.type = "button";
      startButton.textContent = "Start Tournament";

      startButton.addEventListener("click", function () {
        if (tournament.createdBy !== getPlayer().id) {
          notify("Only the creator can start this tournament.", "error");
          return;
        }

        startTournament(id);
        renderDetails(id);
      });

      container.appendChild(startButton);
    }

    if (tournament.rounds.length) {
      const roundsHeading = document.createElement("h4");
      roundsHeading.textContent = "Rounds";
      container.appendChild(roundsHeading);

      tournament.rounds.forEach(function (round) {
        const roundTitle = document.createElement("p");
        roundTitle.textContent = "Round " + round.number;
        container.appendChild(roundTitle);

        round.matches.forEach(function (match, index) {
          const matchRow = document.createElement("div");
          matchRow.className = "tournament-match";

          const white = tournament.players.find(function (player) {
            return player.id === match.white;
          });

          const black = tournament.players.find(function (player) {
            return player.id === match.black;
          });

          const matchText = document.createElement("span");
          matchText.textContent =
            (white ? white.name : "Player") +
            " vs " +
            (black ? black.name : "BYE") +
            " — " +
            (match.result || "Pending");

          matchRow.appendChild(matchText);

          if (
            !match.completed &&
            tournament.createdBy === getPlayer().id &&
            match.black
          ) {
            const resultSelect = document.createElement("select");

            [
              { value: "", label: "Set Result" },
              { value: "white", label: "White wins" },
              { value: "black", label: "Black wins" },
              { value: "draw", label: "Draw" }
            ].forEach(function (optionData) {
              const option = document.createElement("option");
              option.value = optionData.value;
              option.textContent = optionData.label;
              resultSelect.appendChild(option);
            });

            resultSelect.addEventListener("change", function () {
              if (!resultSelect.value) return;

              recordMatchResult(
                id,
                round.number,
                index,
                resultSelect.value
              );

              renderDetails(id);
            });

            matchRow.appendChild(resultSelect);
          }

          container.appendChild(matchRow);
        });
      });
    }

    const standings = getStandings(id);

    if (standings.length) {
      const heading = document.createElement("h4");
      heading.textContent = "Standings";
      container.appendChild(heading);

      standings.forEach(function (player, index) {
        const row = document.createElement("p");
        row.textContent =
          (index + 1) +
          ". " +
          player.name +
          " — " +
          player.score +
          " points";

        container.appendChild(row);
      });
    }

    if (tournament.winner) {
      const winnerText = document.createElement("h3");
      winnerText.textContent =
        "🏆 Winner: " + tournament.winner.name;

      container.appendChild(winnerText);
    }
  }

  function render() {
    renderList();

    if (activeTournamentId) {
      renderDetails(activeTournamentId);
    }
  }

  /* ---------- FORM EVENTS ---------- */

  function bindEvents() {
    const button = document.getElementById("create-tournament-btn");

    if (!button || button.dataset.tournamentBound) return;

    button.dataset.tournamentBound = "true";

    button.addEventListener("click", function () {
      const name = document.getElementById("tournament-name");
      const format = document.getElementById("tournament-format");
      const capacity = document.getElementById("tournament-capacity");

      createTournament({
        name: name ? name.value : "",
        format: format ? format.value : "",
        capacity: capacity ? capacity.value : 8
      });
    });
  }

  /* ---------- INITIALIZE ---------- */

  function init() {
    if (initialized) {
      render();
      return true;
    }

    load();
    bindEvents();
    render();

    initialized = true;
    return true;
  }

  function deleteTournament(id) {
    const index = tournaments.findIndex(function (item) {
      return item.id === id;
    });

    if (index === -1) return false;

    tournaments.splice(index, 1);

    if (activeTournamentId === id) {
      activeTournamentId = null;
    }

    save();
    render();

    return true;
  }

  function getAll() {
    return JSON.parse(JSON.stringify(tournaments));
  }

  function destroy() {
    initialized = false;
  }

  return {
    init: init,
    load: load,
    save: save,
    createTournament: createTournament,
    joinTournament: joinTournament,
    startTournament: startTournament,
    recordMatchResult: recordMatchResult,
    getTournament: getTournament,
    getStandings: getStandings,
    getAll: getAll,
    deleteTournament: deleteTournament,
    render: render,
    destroy: destroy
  };
})();

/* =========================================================
   APPARA CHESS — TOURNAMENT MANAGER
   PART 17 END
   ========================================================= */
