
/* =========================================================
   APPARA CHESS
   PART 21D — TOURNAMENT SYSTEM
   PART 1/3
   File: js/tournament.js
   ========================================================= */

window.APPARA_TOURNAMENT = (function () {
    "use strict";

    const STORAGE_KEY = "appara_chess_tournaments_v1";

    let tournaments = [];
    let activeTournamentId = null;
    let initialized = false;

    function createId() {
        return "APT-" +
            Date.now().toString(36).toUpperCase() +
            "-" +
            Math.random().toString(36).slice(2, 7).toUpperCase();
    }

    function getProfile() {
        if (
            window.APPARA_PROFILE &&
            typeof APPARA_PROFILE.getProfile === "function"
        ) {
            return APPARA_PROFILE.getProfile();
        }

        return {
            id: "LOCAL-PLAYER",
            name: "Guest Player",
            rating: 1000
        };
    }

    function getPlayerId() {
        const profile = getProfile();

        return String(
            profile.id ||
            profile.playerId ||
            "LOCAL-PLAYER"
        );
    }

    function getPlayerName() {
        return String(
            getProfile().name || "Guest Player"
        );
    }

    function notify(message, type) {
        if (
            window.APPARA_APP &&
            typeof APPARA_APP.notify === "function"
        ) {
            APPARA_APP.notify(message, type || "info");
        }
    }

    function save() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(tournaments)
            );

            return true;
        } catch (error) {
            console.error(
                "[APPARA TOURNAMENT] Save failed:",
                error
            );

            return false;
        }
    }

    function load() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            tournaments = Array.isArray(saved)
                ? saved
                : [];
        } catch (error) {
            tournaments = [];
        }

        return tournaments;
    }

    function init() {
        load();
        bindEvents();
        render();

        initialized = true;
        return true;
    }

    function bindEvents() {
        const button = document.getElementById(
            "create-tournament-btn"
        );

        if (!button || button.dataset.tournamentBound) {
            return;
        }

        button.dataset.tournamentBound = "true";

        button.addEventListener("click", function () {
            const name = document.getElementById(
                "tournament-name"
            );

            const format = document.getElementById(
                "tournament-format"
            );

            const capacity = document.getElementById(
                "tournament-capacity"
            );

            createTournament({
                name: name ? name.value : "",
                format: format ? format.value : "knockout",
                capacity: capacity
                    ? Number(capacity.value)
                    : 8
            });
        });
    }

    function normalizeFormat(format) {
        const allowed = [
            "knockout",
            "roundrobin",
            "swiss"
        ];

        return allowed.includes(format)
            ? format
            : "knockout";
    }

    function createTournament(options) {
        options = options || {};

        const name = String(
            options.name || ""
        ).trim();

        if (!name) {
            notify("Tournament का नाम लिखें।", "warning");
            return null;
        }

        const capacity = Math.max(
            2,
            Math.min(
                64,
                Math.floor(Number(options.capacity) || 8)
            )
        );

        const format = normalizeFormat(options.format);
        const profile = getProfile();

        const player = {
            id: getPlayerId(),
            name: getPlayerName(),
            rating: Number(profile.rating) || 1000,
            score: 0,
            wins: 0,
            draws: 0,
            losses: 0
        };

        const tournament = {
            id: createId(),
            name: name,
            format: format,
            capacity: capacity,
            status: "registration",
            players: [player],
            rounds: [],
            currentRound: 0,
            champion: null,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        tournaments.unshift(tournament);
        activeTournamentId = tournament.id;

        save();
        render();

        notify("Tournament बनाया गया।", "success");

        return tournament;
    }

    function getTournament(id) {
        return tournaments.find(function (item) {
            return item.id === id;
        }) || null;
    }

    function getActiveTournament() {
        return getTournament(activeTournamentId);
    }

    function joinTournament(id) {
        const tournament = getTournament(id);

        if (!tournament) {
            notify("Tournament नहीं मिला।", "error");
            return false;
        }

        if (tournament.status !== "registration") {
            notify("Registration बंद हो चुका है।", "warning");
            return false;
        }

        if (
            tournament.players.length >=
            tournament.capacity
        ) {
            notify("Tournament भर चुका है।", "warning");
            return false;
        }

        const playerId = getPlayerId();

        if (tournament.players.some(function (player) {
            return player.id === playerId;
        })) {
            notify("आप पहले से शामिल हैं।", "info");
            return false;
        }

        const profile = getProfile();

        tournament.players.push({
            id: playerId,
            name: getPlayerName(),
            rating: Number(profile.rating) || 1000,
            score: 0,
            wins: 0,
            draws: 0,
            losses: 0
        });

        tournament.updatedAt = Date.now();

        save();
        render();

        notify(
            "आप Tournament में शामिल हो गए।",
            "success"
        );

        return true;
    }

    function startTournament(id) {
        const tournament = getTournament(
            id || activeTournamentId
        );

        if (!tournament) return false;

        if (tournament.status !== "registration") {
            notify(
                "Tournament पहले ही शुरू हो चुका है।",
                "warning"
            );
            return false;
        }

        if (tournament.players.length < 2) {
            notify(
                "कम से कम 2 खिलाड़ी जरूरी हैं।",
                "warning"
            );
            return false;
        }

        tournament.status = "active";
        tournament.currentRound = 1;

        if (tournament.format === "knockout") {
            generateKnockoutRound(tournament);
        } else if (tournament.format === "roundrobin") {
            tournament.rounds =
                generateRoundRobinRounds(
                    tournament.players
                );

            tournament.currentRound = 1;
        } else {
            generateSwissRound(tournament);
        }

        tournament.updatedAt = Date.now();

        save();
        render();

        notify(
            "Tournament शुरू हो गया।",
            "success"
        );

        return true;
    }

    function createMatch(
        playerA,
        playerB,
        roundNumber,
        index
    ) {
        return {
            id: createId(),
            round: roundNumber,
            index: index,
            white: playerA ? playerA.id : null,
            black: playerB ? playerB.id : null,
            whiteName: playerA ? playerA.name : "BYE",
            blackName: playerB ? playerB.name : "BYE",
            result: playerA && !playerB ? "1-0" : null,
            winner: playerA && !playerB
                ? playerA.id
                : null,
            completed: Boolean(playerA && !playerB),
            bye: Boolean(playerA && !playerB)
        };
    }

    /* =====================================================
       PART 21D — PART 1/3 END
       CONTINUE IN SAME FILE WITH PART 2/3
       ===================================================== */
           
/* =========================================================
   APPARA CHESS
   PART 21D — TOURNAMENT SYSTEM
   PART 2/3
   ========================================================= */

    function generateKnockoutRound(tournament) {
        const previousRound =
            tournament.rounds[
                tournament.rounds.length - 1
            ];

        let players;

        if (!previousRound) {
            players = tournament.players.slice();
        } else {
            players = previousRound.matches
                .filter(function (match) {
                    return match.completed && match.winner;
                })
                .map(function (match) {
                    return tournament.players.find(
                        function (player) {
                            return player.id === match.winner;
                        }
                    );
                })
                .filter(Boolean);
        }

        if (players.length <= 1) {
            tournament.status = "completed";
            tournament.champion = players[0]
                ? players[0].id
                : null;
            return;
        }

        shuffle(players);

        const matches = [];

        for (let i = 0; i < players.length; i += 2) {
            matches.push(
                createMatch(
                    players[i],
                    players[i + 1] || null,
                    tournament.rounds.length + 1,
                    matches.length + 1
                )
            );
        }

        const round = {
            number: tournament.rounds.length + 1,
            matches: matches,
            completed: matches.every(function (match) {
                return match.completed;
            })
        };

        tournament.rounds.push(round);
        tournament.currentRound = round.number;

        if (round.completed) {
            advanceKnockout(tournament);
        }
    }

    function advanceKnockout(tournament) {
        const round =
            tournament.rounds[
                tournament.rounds.length - 1
            ];

        if (
            !round ||
            !round.matches.every(function (match) {
                return match.completed;
            })
        ) {
            return false;
        }

        const winners = round.matches
            .map(function (match) {
                return tournament.players.find(
                    function (player) {
                        return player.id === match.winner;
                    }
                );
            })
            .filter(Boolean);

        if (winners.length === 1) {
            tournament.status = "completed";
            tournament.champion = winners[0].id;
            return true;
        }

        if (winners.length > 1) {
            generateKnockoutRound(tournament);
        }

        return true;
    }

    function generateRoundRobinRounds(players) {
        const list = players.slice();

        if (list.length % 2 !== 0) {
            list.push(null);
        }

        const count = list.length;
        const totalRounds = count - 1;
        const half = count / 2;
        const rotation = list.slice();
        const rounds = [];

        for (
            let roundIndex = 0;
            roundIndex < totalRounds;
            roundIndex++
        ) {
            const matches = [];

            for (let i = 0; i < half; i++) {
                const first = rotation[i];
                const second = rotation[count - 1 - i];

                if (first && second) {
                    const white = roundIndex % 2 === 0
                        ? first
                        : second;

                    const black = roundIndex % 2 === 0
                        ? second
                        : first;

                    matches.push(
                        createMatch(
                            white,
                            black,
                            roundIndex + 1,
                            matches.length + 1
                        )
                    );
                } else if (first || second) {
                    matches.push(
                        createMatch(
                            first || second,
                            null,
                            roundIndex + 1,
                            matches.length + 1
                        )
                    );
                }
            }

            rounds.push({
                number: roundIndex + 1,
                matches: matches,
                completed: matches.every(function (match) {
                    return match.completed;
                })
            });

            /* First player fixed, remaining players rotate. */
            const fixed = rotation[0];
            const remaining = rotation.slice(1);

            remaining.unshift(remaining.pop());

            rotation.splice(
                0,
                rotation.length,
                fixed
            );

            rotation.push.apply(rotation, remaining);
        }

        return rounds;
    }

    function hasPlayed(
        tournament,
        playerA,
        playerB
    ) {
        return tournament.rounds.some(function (round) {
            return round.matches.some(function (match) {
                return (
                    (
                        match.white === playerA &&
                        match.black === playerB
                    ) ||
                    (
                        match.white === playerB &&
                        match.black === playerA
                    )
                );
            });
        });
    }

    function generateSwissRound(tournament) {
        const players = tournament.players.slice().sort(
            function (a, b) {
                return (
                    b.score - a.score ||
                    b.rating - a.rating
                );
            }
        );

        const matches = [];
        const paired = new Set();

        for (let i = 0; i < players.length; i++) {
            const player = players[i];

            if (paired.has(player.id)) continue;

            let opponent = null;

            /* First preference: opponent not played before. */
            for (
                let j = i + 1;
                j < players.length;
                j++
            ) {
                const candidate = players[j];

                if (
                    paired.has(candidate.id) ||
                    hasPlayed(
                        tournament,
                        player.id,
                        candidate.id
                    )
                ) {
                    continue;
                }

                opponent = candidate;
                break;
            }

            /* Fallback if no fresh opponent exists. */
            if (!opponent) {
                for (
                    let j = i + 1;
                    j < players.length;
                    j++
                ) {
                    if (!paired.has(players[j].id)) {
                        opponent = players[j];
                        break;
                    }
                }
            }

            if (opponent) {
                paired.add(player.id);
                paired.add(opponent.id);

                matches.push(
                    createMatch(
                        player,
                        opponent,
                        tournament.currentRound,
                        matches.length + 1
                    )
                );
            } else {
                paired.add(player.id);

                matches.push(
                    createMatch(
                        player,
                        null,
                        tournament.currentRound,
                        matches.length + 1
                    )
                );

                player.score += 1;
            }
        }

        tournament.rounds.push({
            number: tournament.currentRound,
            matches: matches,
            completed: matches.every(function (match) {
                return match.completed;
            })
        });
    }

    function recordMatchResult(
        tournamentId,
        matchId,
        result
    ) {
        const tournament = getTournament(tournamentId);

        if (
            !tournament ||
            tournament.status !== "active"
        ) {
            return false;
        }

        const normalizedResult = String(
            result || ""
        ).trim();

        if (
            !["1-0", "0-1", "1/2-1/2"].includes(
                normalizedResult
            )
        ) {
            notify("Invalid match result.", "error");
            return false;
        }

        let foundMatch = null;
        let foundRound = null;

        tournament.rounds.forEach(function (round) {
            round.matches.forEach(function (match) {
                if (match.id === matchId) {
                    foundMatch = match;
                    foundRound = round;
                }
            });
        });

        if (!foundMatch || !foundRound) {
            notify("Match नहीं मिला।", "error");
            return false;
        }

        if (foundMatch.completed) {
            notify(
                "इस Match का result पहले दर्ज हो चुका है।",
                "warning"
            );
            return false;
        }

        foundMatch.result = normalizedResult;
        foundMatch.completed = true;

        const whitePlayer = tournament.players.find(
            function (player) {
                return player.id === foundMatch.white;
            }
        );

        const blackPlayer = tournament.players.find(
            function (player) {
                return player.id === foundMatch.black;
            }
        );

        if (normalizedResult === "1-0") {
            foundMatch.winner = foundMatch.white;

            if (whitePlayer) {
                whitePlayer.score += 1;
                whitePlayer.wins++;
            }

            if (blackPlayer) {
                blackPlayer.losses++;
            }
        } else if (normalizedResult === "0-1") {
            foundMatch.winner = foundMatch.black;

            if (blackPlayer) {
                blackPlayer.score += 1;
                blackPlayer.wins++;
            }

            if (whitePlayer) {
                whitePlayer.losses++;
            }
        } else {
            foundMatch.winner = null;

            if (whitePlayer) {
                whitePlayer.score += 0.5;
                whitePlayer.draws++;
            }

            if (blackPlayer) {
                blackPlayer.score += 0.5;
                blackPlayer.draws++;
            }
        }

        foundRound.completed =
            foundRound.matches.every(function (match) {
                return match.completed;
            });

        if (foundRound.completed) {
            advanceTournament(tournament);
        }

        tournament.updatedAt = Date.now();

        save();
        render();

        return true;
    }

    function advanceTournament(tournament) {
        if (tournament.status !== "active") {
            return false;
        }

        if (tournament.format === "knockout") {
            return advanceKnockout(tournament);
        }

        const currentRound =
            tournament.rounds[
                tournament.rounds.length - 1
            ];

        if (
            !currentRound ||
            !currentRound.completed
        ) {
            return false;
        }

        if (tournament.format === "roundrobin") {
            const allComplete =
                tournament.rounds.every(
                    function (round) {
                        return round.completed;
                    }
                );

            if (allComplete) {
                tournament.status = "completed";
                return true;
            }

            return false;
        }

        if (tournament.format === "swiss") {
            const maxRounds = Math.ceil(
                Math.log2(tournament.players.length)
            ) + 1;

            if (
                tournament.currentRound >= maxRounds
            ) {
                tournament.status = "completed";
                return true;
            }

            tournament.currentRound++;

            generateSwissRound(tournament);
            return true;
        }

        return false;
    }

/* =========================================================
   PART 21D — PART 2/3 END
   CONTINUE IN SAME FILE WITH PART 3/3
   ========================================================= */
         
/* =========================================================
   APPARA CHESS
   PART 21D — TOURNAMENT SYSTEM
   PART 3/3
   ========================================================= */

    function getStandings(tournamentId) {
        const tournament = getTournament(tournamentId);

        if (!tournament) return [];

        return tournament.players
            .slice()
            .sort(function (a, b) {
                return (
                    b.score - a.score ||
                    b.wins - a.wins ||
                    b.rating - a.rating ||
                    a.name.localeCompare(b.name)
                );
            })
            .map(function (player, index) {
                return {
                    rank: index + 1,
                    id: player.id,
                    name: player.name,
                    avatar: player.avatar || "♟",
                    rating: player.rating,
                    score: player.score,
                    wins: player.wins,
                    draws: player.draws,
                    losses: player.losses
                };
            });
    }

    function getTournamentMatches(tournamentId) {
        const tournament = getTournament(tournamentId);

        if (!tournament) return [];

        return tournament.rounds.reduce(
            function (allMatches, round) {
                round.matches.forEach(function (match) {
                    allMatches.push({
                        id: match.id,
                        round: round.number,
                        white: match.white,
                        black: match.black,
                        result: match.result || null,
                        winner: match.winner || null,
                        completed: Boolean(match.completed)
                    });
                });

                return allMatches;
            },
            []
        );
    }

    function getPlayerById(tournament, playerId) {
        if (!tournament) return null;

        return tournament.players.find(
            function (player) {
                return player.id === playerId;
            }
        ) || null;
    }

    function getMatchPlayerName(tournament, playerId) {
        const player = getPlayerById(
            tournament,
            playerId
        );

        return player ? player.name : "BYE";
    }

    function getStatusLabel(status) {
        const labels = {
            upcoming: "Upcoming",
            waiting: "Waiting",
            active: "Live",
            completed: "Completed",
            cancelled: "Cancelled"
        };

        return labels[status] || "Unknown";
    }

    function getFormatLabel(format) {
        const labels = {
            knockout: "Knockout",
            roundrobin: "Round Robin",
            swiss: "Swiss System"
        };

        return labels[format] || format;
    }

    function escapeHTML(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function render() {
        renderTournamentList();

        if (activeTournamentId) {
            renderTournamentDetails(activeTournamentId);
        }
    }

    function renderTournamentList() {
        const container = document.getElementById(
            "tournament-list"
        );

        if (!container) return;

        if (!tournaments.length) {
            container.innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-state-icon">🏆</div>' +
                    '<h3>No tournaments yet</h3>' +
                    '<p>Create a tournament to get started.</p>' +
                '</div>';

            return;
        }

        container.innerHTML = tournaments
            .slice()
            .sort(function (a, b) {
                return (b.updatedAt || b.createdAt || 0) -
                    (a.updatedAt || a.createdAt || 0);
            })
            .map(function (tournament) {
                const isActive =
                    tournament.id === activeTournamentId;

                return (
                    '<button type="button" ' +
                        'class="tournament-card' +
                        (isActive ? ' active' : '') + '" ' +
                        'data-tournament-open="' +
                            escapeHTML(tournament.id) + '">' +

                        '<div class="tournament-card-top">' +
                            '<span class="tournament-card-icon">🏆</span>' +
                            '<span class="tournament-status ' +
                                escapeHTML(tournament.status) + '">' +
                                escapeHTML(
                                    getStatusLabel(tournament.status)
                                ) +
                            '</span>' +
                        '</div>' +

                        '<h3>' +
                            escapeHTML(tournament.name) +
                        '</h3>' +

                        '<div class="tournament-card-meta">' +
                            '<span>' +
                                escapeHTML(
                                    getFormatLabel(tournament.format)
                                ) +
                            '</span>' +
                            '<span>' +
                                tournament.players.length +
                                ' Players' +
                            '</span>' +
                        '</div>' +

                        '<div class="tournament-card-footer">' +
                            '<span>Round ' +
                                (tournament.currentRound || 0) +
                            '</span>' +
                            '<span>View details →</span>' +
                        '</div>' +

                    '</button>'
                );
            })
            .join("");

        container
            .querySelectorAll("[data-tournament-open]")
            .forEach(function (button) {
                button.addEventListener("click", function () {
                    const id = button.getAttribute(
                        "data-tournament-open"
                    );

                    activeTournamentId = id;
                    render();
                });
            });
    }

    function renderTournamentDetails(tournamentId) {
        const container = document.getElementById(
            "tournament-details"
        );

        if (!container) return;

        const tournament = getTournament(tournamentId);

        if (!tournament) {
            container.innerHTML = "";
            return;
        }

        const standings = getStandings(tournamentId);

        const roundsHTML = tournament.rounds
            .map(function (round) {
                const matchesHTML = round.matches
                    .map(function (match) {
                        const whiteName = getMatchPlayerName(
                            tournament,
                            match.white
                        );

                        const blackName = getMatchPlayerName(
                            tournament,
                            match.black
                        );

                        return (
                            '<div class="tournament-match">' +

                                '<div class="tournament-match-players">' +
                                    '<span>' +
                                        escapeHTML(whiteName) +
                                    '</span>' +
                                    '<strong>' +
                                        escapeHTML(
                                            match.result || "VS"
                                        ) +
                                    '</strong>' +
                                    '<span>' +
                                        escapeHTML(blackName) +
                                    '</span>' +
                                '</div>' +

                                '<div class="tournament-match-status">' +
                                    (
                                        match.completed
                                            ? '<span class="match-completed">Completed</span>'
                                            : '<span class="match-pending">Pending</span>'
                                    ) +
                                '</div>' +

                                (
                                    tournament.status === "active" &&
                                    !match.completed &&
                                    match.black
                                        ? (
                                            '<div class="match-result-actions">' +
                                                '<button type="button" ' +
                                                    'data-match-result="1-0" ' +
                                                    'data-match-id="' +
                                                        escapeHTML(match.id) + '">' +
                                                    '1-0' +
                                                '</button>' +

                                                '<button type="button" ' +
                                                    'data-match-result="1/2-1/2" ' +
                                                    'data-match-id="' +
                                                        escapeHTML(match.id) + '">' +
                                                    'Draw' +
                                                '</button>' +

                                                '<button type="button" ' +
                                                    'data-match-result="0-1" ' +
                                                    'data-match-id="' +
                                                        escapeHTML(match.id) + '">' +
                                                    '0-1' +
                                                '</button>' +
                                            '</div>'
                                        )
                                        : ""
                                ) +

                            '</div>'
                        );
                    })
                    .join("");

                return (
                    '<section class="tournament-round">' +
                        '<h4>Round ' + round.number + '</h4>' +
                        matchesHTML +
                    '</section>'
                );
            })
            .join("");

        const standingsHTML = standings
            .map(function (player) {
                return (
                    '<tr>' +
                        '<td>' + player.rank + '</td>' +
                        '<td>' +
                            escapeHTML(player.avatar) + ' ' +
                            escapeHTML(player.name) +
                        '</td>' +
                        '<td>' + player.rating + '</td>' +
                        '<td>' + player.score + '</td>' +
                        '<td>' + player.wins + '</td>' +
                        '<td>' + player.draws + '</td>' +
                        '<td>' + player.losses + '</td>' +
                    '</tr>'
                );
            })
            .join("");

        const champion = tournament.champion
            ? getPlayerById(
                tournament,
                tournament.champion
            )
            : null;

        container.innerHTML =
            '<div class="tournament-details-header">' +
                '<div>' +
                    '<span class="tournament-status ' +
                        escapeHTML(tournament.status) + '">' +
                        escapeHTML(
                            getStatusLabel(tournament.status)
                        ) +
                    '</span>' +
                    '<h3>' +
                        escapeHTML(tournament.name) +
                    '</h3>' +
                    '<p>' +
                        escapeHTML(
                            getFormatLabel(tournament.format)
                        ) +
                        ' · ' +
                        tournament.players.length +
                        ' Players' +
                    '</p>' +
                '</div>' +
            '</div>' +

            (
                champion
                    ? (
                        '<div class="tournament-champion">' +
                            '<span>🏆 Champion</span>' +
                            '<strong>' +
                                escapeHTML(champion.name) +
                            '</strong>' +
                        '</div>'
                    )
                    : ""
            ) +

            '<div class="tournament-standings">' +
                '<h4>Leaderboard</h4>' +
                '<div class="tournament-table-wrap">' +
                    '<table class="tournament-table">' +
                        '<thead>' +
                            '<tr>' +
                                '<th>#</th>' +
                                '<th>Player</th>' +
                                '<th>Rating</th>' +
                                '<th>Pts</th>' +
                                '<th>W</th>' +
                                '<th>D</th>' +
                                '<th>L</th>' +
                            '</tr>' +
                        '</thead>' +
                        '<tbody>' +
                            standingsHTML +
                        '</tbody>' +
                    '</table>' +
                '</div>' +
            '</div>' +

            '<div class="tournament-rounds">' +
                '<h4>Matches</h4>' +
                (
                    roundsHTML ||
                    '<p>No matches generated yet.</p>'
                ) +
            '</div>';

        container
            .querySelectorAll("[data-match-result]")
            .forEach(function (button) {
                button.addEventListener("click", function () {
                    const matchId = button.getAttribute(
                        "data-match-id"
                    );

                    const result = button.getAttribute(
                        "data-match-result"
                    );

                    recordMatchResult(
                        tournamentId,
                        matchId,
                        result
                    );
                });
            });
    }

    function shuffle(items) {
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(
                Math.random() * (i + 1)
            );

            const temp = items[i];
            items[i] = items[j];
            items[j] = temp;
        }

        return items;
    }

    function cancelTournament(tournamentId) {
        const tournament = getTournament(tournamentId);

        if (
            !tournament ||
            tournament.status === "completed"
        ) {
            return false;
        }

        tournament.status = "cancelled";
        tournament.updatedAt = Date.now();

        save();
        render();

        notify("Tournament cancelled.", "warning");

        return true;
    }

    function getTournamentList() {
        return tournaments.map(function (tournament) {
            return {
                id: tournament.id,
                name: tournament.name,
                format: tournament.format,
                status: tournament.status,
                currentRound: tournament.currentRound,
                playerCount: tournament.players.length,
                createdAt: tournament.createdAt,
                updatedAt: tournament.updatedAt
            };
        });
    }

    function getState() {
        return {
            initialized: initialized,
            activeTournamentId: activeTournamentId,
            tournamentCount: tournaments.length,
            tournaments: getTournamentList()
        };
    }

    function destroy() {
        tournaments = [];
        activeTournamentId = null;
        initialized = false;
    }

    /* Public tournament API */
    return {
        init: init,
        createTournament: createTournament,
        getTournament: getTournament,
        getActiveTournament: getActiveTournament,
        joinTournament: joinTournament,
        startTournament: startTournament,

        recordMatchResult: recordMatchResult,
        getStandings: getStandings,
        getTournamentMatches: getTournamentMatches,
        getTournamentList: getTournamentList,

        cancelTournament: cancelTournament,
        render: render,
        getState: getState,
        destroy: destroy
    };

})();

/* =========================================================
   APPARA CHESS — PART 21D COMPLETE
   TOURNAMENT SYSTEM FILE END
   ========================================================= */
                         
