/* =========================================================
   APPARA CHESS — PART 21N
   TOURNAMENT CONTROLLER
   FILE: js/tournament.js
   PART 1/3 — STATE & TOURNAMENT CREATION
========================================================= */

window.APPARA_TOURNAMENT = (function () {
  "use strict";

  const STORAGE_KEY = "appara_chess_tournaments_v1";

  const state = {
    initialized: false,
    tournaments: [],
    activeTournamentId: null,
    selectedTournament: null,
    elements: {}
  };

  const FORMATS = {
    knockout: "Knockout",
    roundrobin: "Round Robin",
    swiss: "Swiss System"
  };

  const STATUS = {
    upcoming: "Upcoming",
    ongoing: "Ongoing",
    completed: "Completed"
  };

  function notify(message, type) {
    if (
      window.APPARA_APP &&
      typeof window.APPARA_APP.showNotification === "function"
    ) {
      window.APPARA_APP.showNotification(message, type || "info");
    }
  }

  function createId() {
    return "APT-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.floor(Math.random() * 10000).toString(36).toUpperCase();
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
      name: "Guest Player",
      rating: 1000,
      avatar: "♟"
    };
  }

  function normalizeTournament(item) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const capacity = Math.max(
      2,
      Math.min(64, Number(item.capacity) || 8)
    );

    return {
      id: String(item.id || createId()),
      name: String(item.name || "Chess Tournament").slice(0, 40),
      format: Object.prototype.hasOwnProperty.call(
        FORMATS,
        item.format
      ) ? item.format : "knockout",

      capacity,
      status: Object.prototype.hasOwnProperty.call(
        STATUS,
        item.status
      ) ? item.status : "upcoming",

      createdAt: Number(item.createdAt) || Date.now(),
      startAt: Number(item.startAt) || null,
      players: Array.isArray(item.players)
        ? item.players.slice(0, capacity)
        : [],

      rounds: Array.isArray(item.rounds)
        ? item.rounds
        : [],

      winnerId: item.winnerId || null,
      winnerName: item.winnerName || null,
      creatorId: item.creatorId || null
    };
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state.tournaments)
      );

      return true;
    } catch (error) {
      console.error("APPARA TOURNAMENT SAVE ERROR:", error);
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      state.tournaments = Array.isArray(parsed)
        ? parsed.map(normalizeTournament).filter(Boolean)
        : [];

      return true;
    } catch (error) {
      console.error("APPARA TOURNAMENT LOAD ERROR:", error);
      state.tournaments = [];
      return false;
    }
  }

  function getTournament(id) {
    const tournament = state.tournaments.find(function (item) {
      return item.id === id;
    });

    return tournament ? { ...tournament } : null;
  }

  function getAllTournaments() {
    return state.tournaments.map(function (item) {
      return { ...item };
    });
  }

  function validateTournamentData(data) {
    if (!data || typeof data !== "object") {
      return "Invalid tournament details.";
    }

    const name = String(data.name || "").trim();

    if (name.length < 3) {
      return "Tournament name must have at least 3 characters.";
    }

    if (name.length > 40) {
      return "Tournament name is too long.";
    }

    if (!Object.prototype.hasOwnProperty.call(FORMATS, data.format)) {
      return "Please select a valid tournament format.";
    }

    const capacity = Number(data.capacity);

    if (
      !Number.isInteger(capacity) ||
      capacity < 2 ||
      capacity > 64
    ) {
      return "Tournament capacity must be between 2 and 64.";
    }

    return null;
  }

  function createTournament(data) {
    const error = validateTournamentData(data);

    if (error) {
      notify(error, "error");
      return null;
    }

    const player = getPlayer();

    const tournament = normalizeTournament({
      id: createId(),
      name: String(data.name).trim(),
      format: data.format,
      capacity: Number(data.capacity),
      status: "upcoming",
      createdAt: Date.now(),
      startAt: null,

      creatorId: player.id,

      players: [{
        id: player.id,
        name: player.name,
        rating: player.rating,
        avatar: player.avatar,
        joinedAt: Date.now()
      }],

      rounds: [],
      winnerId: null,
      winnerName: null
    });

    state.tournaments.unshift(tournament);
    state.activeTournamentId = tournament.id;

    save();
    render();

    notify("Tournament created successfully!", "success");

    return { ...tournament };
  }

  function deleteTournament(id) {
    const index = state.tournaments.findIndex(function (item) {
      return item.id === id;
    });

    if (index === -1) return false;

    const player = getPlayer();
    const tournament = state.tournaments[index];

    if (tournament.creatorId !== player.id) {
      notify("Only the tournament creator can delete it.", "error");
      return false;
    }

    if (tournament.status === "ongoing") {
      notify("An ongoing tournament cannot be deleted.", "warning");
      return false;
    }

    state.tournaments.splice(index, 1);

    if (state.activeTournamentId === id) {
      state.activeTournamentId = null;
    }

    save();
    render();

    notify("Tournament deleted.", "success");

    return true;
  }

  /* =======================================================
     PART 1/3 END
     CONTINUE DIRECTLY WITH PART 2/3 BELOW
  ======================================================= */

            /* =========================================================
   APPARA CHESS — PART 21N
   PART 2/3 — REGISTRATION, START & MATCH GENERATION
========================================================= */

  function joinTournament(id) {
    const tournament = state.tournaments.find(function (item) {
      return item.id === id;
    });

    if (!tournament) {
      notify("Tournament not found.", "error");
      return false;
    }

    if (tournament.status !== "upcoming") {
      notify("Registration is closed.", "warning");
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
      notify("Tournament is full.", "warning");
      return false;
    }

    tournament.players.push({
      id: player.id,
      name: player.name,
      rating: player.rating,
      avatar: player.avatar,
      joinedAt: Date.now()
    });

    save();
    render();

    notify("You joined the tournament.", "success");

    return true;
  }

  function leaveTournament(id) {
    const tournament = state.tournaments.find(function (item) {
      return item.id === id;
    });

    if (!tournament || tournament.status !== "upcoming") {
      return false;
    }

    const player = getPlayer();

    if (tournament.creatorId === player.id) {
      notify("The creator cannot leave their own tournament.", "warning");
      return false;
    }

    const index = tournament.players.findIndex(function (item) {
      return item.id === player.id;
    });

    if (index === -1) return false;

    tournament.players.splice(index, 1);

    save();
    render();

    notify("You left the tournament.", "info");

    return true;
  }

  function shufflePlayers(players) {
    const result = players.slice();

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function createMatch(playerA, playerB, roundNumber, matchNumber) {
    return {
      id: "MATCH-" + roundNumber + "-" + matchNumber,
      round: roundNumber,
      player1: playerA ? playerA.id : null,
      player1Name: playerA ? playerA.name : "BYE",
      player2: playerB ? playerB.id : null,
      player2Name: playerB ? playerB.name : "BYE",
      winnerId: null,
      status: playerA && playerB ? "pending" : "completed",
      result: null,
      createdAt: Date.now()
    };
  }

  function generateKnockoutRound(players, roundNumber) {
    const shuffled = shufflePlayers(players);
    const matches = [];

    for (let i = 0; i < shuffled.length; i += 2) {
      const playerA = shuffled[i];
      const playerB = shuffled[i + 1] || null;

      const match = createMatch(
        playerA,
        playerB,
        roundNumber,
        matches.length + 1
      );

      if (!playerB) {
        match.winnerId = playerA.id;
        match.result = "bye";
      }

      matches.push(match);
    }

    return matches;
  }

  function generateRoundRobinRound(players, roundNumber) {
    const list = players.slice();

    if (list.length % 2 !== 0) {
      list.push(null);
    }

    const matches = [];

    for (let i = 0; i < list.length / 2; i++) {
      const playerA = list[i];
      const playerB = list[list.length - 1 - i];

      if (!playerA || !playerB) continue;

      matches.push(
        createMatch(
          playerA,
          playerB,
          roundNumber,
          matches.length + 1
        )
      );
    }

    return matches;
  }

  function generateSwissRound(players, roundNumber) {
    const sorted = players.slice().sort(function (a, b) {
      return (Number(b.rating) || 1000) -
        (Number(a.rating) || 1000);
    });

    return generateRoundRobinRound(sorted, roundNumber);
  }

  function startTournament(id) {
    const tournament = state.tournaments.find(function (item) {
      return item.id === id;
    });

    if (!tournament) {
      notify("Tournament not found.", "error");
      return false;
    }

    const player = getPlayer();

    if (tournament.creatorId !== player.id) {
      notify("Only the creator can start this tournament.", "error");
      return false;
    }

    if (tournament.status !== "upcoming") {
      notify("This tournament has already started.", "warning");
      return false;
    }

    if (tournament.players.length < 2) {
      notify("At least 2 players are required.", "warning");
      return false;
    }

    if (tournament.players.length > tournament.capacity) {
      notify("Tournament capacity exceeded.", "error");
      return false;
    }

    const players = tournament.players.slice();

    let matches;

    if (tournament.format === "knockout") {
      matches = generateKnockoutRound(players, 1);
    } else if (tournament.format === "roundrobin") {
      matches = generateRoundRobinRound(players, 1);
    } else {
      matches = generateSwissRound(players, 1);
    }

    tournament.rounds = [{
      number: 1,
      matches: matches
    }];

    tournament.status = "ongoing";
    tournament.startAt = Date.now();

    save();
    render();

    notify("Tournament started!", "success");

    return true;
  }

  function getCurrentRound(tournament) {
    if (!tournament || !Array.isArray(tournament.rounds)) {
      return null;
    }

    return tournament.rounds.length
      ? tournament.rounds[tournament.rounds.length - 1]
      : null;
  }

  function getMatch(id, matchId) {
    const tournament = state.tournaments.find(function (item) {
      return item.id === id;
    });

    if (!tournament) return null;

    for (const round of tournament.rounds) {
      const match = round.matches.find(function (item) {
        return item.id === matchId;
      });

      if (match) return match;
    }

    return null;
  }

  /* =======================================================
     PART 2/3 END
     CONTINUE DIRECTLY WITH PART 3/3 BELOW
  ======================================================= */

              /* =========================================================
   APPARA CHESS — PART 21N
   PART 3/3 — RESULTS, WINNER, UI & PUBLIC API
========================================================= */

  function reportMatchResult(tournamentId, matchId, winnerId) {
    const tournament = state.tournaments.find(function (item) {
      return item.id === tournamentId;
    });

    if (!tournament || tournament.status !== "ongoing") {
      return false;
    }

    const player = getPlayer();

    if (tournament.creatorId !== player.id) {
      notify("Only the tournament creator can record results.", "error");
      return false;
    }

    const match = getMatch(tournamentId, matchId);

    if (!match || match.status !== "pending") {
      notify("Match is not available.", "warning");
      return false;
    }

    const validWinner =
      winnerId === match.player1 ||
      winnerId === match.player2;

    if (!validWinner) {
      notify("Invalid match winner.", "error");
      return false;
    }

    match.winnerId = winnerId;
    match.result = "completed";
    match.status = "completed";
    match.finishedAt = Date.now();

    save();
    render();

    notify("Match result saved.", "success");

    return true;
  }

  function advanceKnockoutRound(tournamentId) {
    const tournament = state.tournaments.find(function (item) {
      return item.id === tournamentId;
    });

    if (
      !tournament ||
      tournament.status !== "ongoing" ||
      tournament.format !== "knockout"
    ) {
      return false;
    }

    const currentRound = getCurrentRound(tournament);

    if (!currentRound || currentRound.matches.some(function (match) {
      return match.status !== "completed";
    })) {
      notify("Complete all matches in this round first.", "warning");
      return false;
    }

    const winners = currentRound.matches
      .map(function (match) {
        return tournament.players.find(function (player) {
          return player.id === match.winnerId;
        });
      })
      .filter(Boolean);

    if (winners.length === 1) {
      tournament.status = "completed";
      tournament.winnerId = winners[0].id;
      tournament.winnerName = winners[0].name;

      save();
      render();

      notify("Tournament champion: " + winners[0].name, "success");

      return true;
    }

    if (winners.length < 2) {
      return false;
    }

    const nextRoundNumber = currentRound.number + 1;

    tournament.rounds.push({
      number: nextRoundNumber,
      matches: generateKnockoutRound(
        winners,
        nextRoundNumber
      )
    });

    save();
    render();

    notify("Next knockout round generated.", "success");

    return true;
  }

  function finishTournament(tournamentId) {
    const tournament = state.tournaments.find(function (item) {
      return item.id === tournamentId;
    });

    if (!tournament || tournament.status !== "ongoing") {
      return false;
    }

    const player = getPlayer();

    if (tournament.creatorId !== player.id) {
      notify("Only the creator can finish the tournament.", "error");
      return false;
    }

    const round = getCurrentRound(tournament);

    if (!round || round.matches.some(function (match) {
      return match.status !== "completed";
    })) {
      notify("Finish all current round matches first.", "warning");
      return false;
    }

    const winners = round.matches
      .map(function (match) {
        return tournament.players.find(function (item) {
          return item.id === match.winnerId;
        });
      })
      .filter(Boolean);

    if (tournament.format === "knockout") {
      return advanceKnockoutRound(tournamentId);
    }

    if (winners.length === 0) {
      notify("No tournament winner could be determined.", "warning");
      return false;
    }

    const champion = winners[0];

    tournament.status = "completed";
    tournament.winnerId = champion.id;
    tournament.winnerName = champion.name;

    save();
    render();

    notify("Tournament completed.", "success");

    return true;
  }

  function selectTournament(id) {
    const tournament = getTournament(id);

    if (!tournament) return false;

    state.activeTournamentId = id;
    state.selectedTournament = tournament;

    renderDetails(tournament);

    return true;
  }

  function cacheElements() {
    state.elements = {
      name: document.getElementById("tournament-name"),
      format: document.getElementById("tournament-format"),
      capacity: document.getElementById("tournament-capacity"),
      createButton: document.getElementById("create-tournament-btn"),
      list: document.getElementById("tournament-list"),
      details: document.getElementById("tournament-details")
    };
  }

  function renderTournamentItem(tournament) {
    const item = document.createElement("div");
    item.className = "tournament-item";

    const title = document.createElement("h3");
    title.textContent = tournament.name;

    const format = document.createElement("p");
    format.textContent =
      FORMATS[tournament.format] +
      " · " +
      tournament.players.length +
      "/" +
      tournament.capacity +
      " players";

    const status = document.createElement("span");
    status.className = "tournament-status " + tournament.status;
    status.textContent = STATUS[tournament.status];

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "btn btn-secondary";
    openButton.textContent = "View Tournament";

    openButton.addEventListener("click", function () {
      selectTournament(tournament.id);
    });

    item.appendChild(title);
    item.appendChild(format);
    item.appendChild(status);
    item.appendChild(openButton);

    return item;
  }

  function renderDetails(tournament) {
    const container = state.elements.details;

    if (!container || !tournament) return;

    container.replaceChildren();

    const title = document.createElement("h3");
    title.textContent = tournament.name;

    const summary = document.createElement("p");
    summary.textContent =
      "Format: " + FORMATS[tournament.format] +
      " | Status: " + STATUS[tournament.status] +
      " | Players: " + tournament.players.length +
      "/" + tournament.capacity;

    const playersTitle = document.createElement("h4");
    playersTitle.textContent = "Registered Players";

    const playersList = document.createElement("div");
    playersList.className = "tournament-players";

    tournament.players.forEach(function (player) {
      const row = document.createElement("div");
      row.className = "tournament-player";

      const name = document.createElement("span");
      name.textContent =
        (player.avatar || "♟") + " " + player.name;

      const rating = document.createElement("small");
      rating.textContent =
        "Rating: " + (Number(player.rating) || 1000);

      row.appendChild(name);
      row.appendChild(rating);
      playersList.appendChild(row);
    });

    container.appendChild(title);
    container.appendChild(summary);
    container.appendChild(playersTitle);
    container.appendChild(playersList);

    if (tournament.winnerName) {
      const winner = document.createElement("h3");
      winner.textContent =
        "🏆 Champion: " + tournament.winnerName;

      container.appendChild(winner);
    }

    renderRounds(tournament, container);

    const player = getPlayer();
    const isCreator = tournament.creatorId === player.id;
    const isJoined = tournament.players.some(function (item) {
      return item.id === player.id;
    });

    if (tournament.status === "upcoming") {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "btn btn-primary";

      if (isJoined && !isCreator) {
        action.textContent = "Leave Tournament";
        action.addEventListener("click", function () {
          leaveTournament(tournament.id);
        });
      } else if (!isJoined) {
        action.textContent = "Join Tournament";
        action.addEventListener("click", function () {
          joinTournament(tournament.id);
        });
      } else {
        action.textContent = "Start Tournament";
        action.addEventListener("click", function () {
          startTournament(tournament.id);
        });
      }

      container.appendChild(action);
    }

    if (
      tournament.status === "ongoing" &&
      isCreator
    ) {
      const advance = document.createElement("button");
      advance.type = "button";
      advance.className = "btn btn-primary";
      advance.textContent =
        tournament.format === "knockout"
          ? "Advance Round"
          : "Finish Tournament";

      advance.addEventListener("click", function () {
        finishTournament(tournament.id);
      });

      container.appendChild(advance);
    }
  }

  function renderRounds(tournament, container) {
    if (!tournament.rounds.length) return;

    const heading = document.createElement("h4");
    heading.textContent = "Tournament Matches";

    container.appendChild(heading);

    tournament.rounds.forEach(function (round) {
      const roundHeading = document.createElement("h5");
      roundHeading.textContent = "Round " + round.number;
      container.appendChild(roundHeading);

      round.matches.forEach(function (match) {
        const row = document.createElement("div");
        row.className = "tournament-match";

        const names = document.createElement("span");
        names.textContent =
          match.player1Name +
          " vs " +
          match.player2Name;

        const result = document.createElement("span");
        result.textContent = match.status === "completed"
          ? match.winnerId
            ? "Winner: " +
              (match.player1 === match.winnerId
                ? match.player1Name
                : match.player2Name)
            : "Completed"
          : "Pending";

        row.appendChild(names);
        row.appendChild(result);

        if (
          match.status === "pending" &&
          tournament.creatorId === getPlayer().id
        ) {
          const resultButton = document.createElement("button");
          resultButton.type = "button";
          resultButton.textContent = "Record Result";

          resultButton.addEventListener("click", function () {
            const choice = window.prompt(
              "Enter winner player ID:\n" +
              match.player1Name + ": " + match.player1 + "\n" +
              match.player2Name + ": " + match.player2
            );

            if (choice) {
              reportMatchResult(
                tournament.id,
                match.id,
                choice.trim()
              );
            }
          });

          row.appendChild(resultButton);
        }

        container.appendChild(row);
      });
    });
  }

  function render() {
    const list = state.elements.list;

    if (!list) return;

    list.replaceChildren();

    if (state.tournaments.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No tournaments created yet.";

      list.appendChild(empty);
      return;
    }

    state.tournaments.forEach(function (tournament) {
      list.appendChild(renderTournamentItem(tournament));
    });

    if (state.activeTournamentId) {
      const selected = getTournament(state.activeTournamentId);

      if (selected) {
        renderDetails(selected);
      }
    }
  }

  function bindEvents() {
    const button = state.elements.createButton;

    if (!button || button.dataset.tournamentBound === "true") {
      return;
    }

    button.addEventListener("click", function () {
      const data = {
        name: state.elements.name
          ? state.elements.name.value
          : "",

        format: state.elements.format
          ? state.elements.format.value
          : "knockout",

        capacity: state.elements.capacity
          ? state.elements.capacity.value
          : 8
      };

      const created = createTournament(data);

      if (created) {
        if (state.elements.name) {
          state.elements.name.value = "";
        }

        selectTournament(created.id);
      }
    });

    button.dataset.tournamentBound = "true";
  }

  function init() {
    if (state.initialized) {
      render();
      return true;
    }

    cacheElements();
    load();
    bindEvents();
    render();

    state.initialized = true;

    return true;
  }

  function destroy() {
    const button = state.elements.createButton;

    if (button && button.dataset.tournamentBound === "true") {
      button.replaceWith(button.cloneNode(true));
    }

    state.initialized = false;
    state.elements = {};

    return true;
  }

  return {
    init,
    destroy,

    createTournament,
    deleteTournament,
    getTournament,
    getAllTournaments,
    selectTournament,

    joinTournament,
    leaveTournament,
    startTournament,

    getCurrentRound,
    getMatch,
    reportMatchResult,
    advanceKnockoutRound,
    finishTournament,

    render,
    renderDetails,

    getFormats: function () {
      return { ...FORMATS };
    },

    getStatuses: function () {
      return { ...STATUS };
    }
  };

})();

/* =========================================================
   APPARA CHESS — TOURNAMENT CONTROLLER
   PART 21N COMPLETE
   FILE: js/tournament.js
========================================================= */              
