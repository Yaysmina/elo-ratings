document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const STORAGE_KEYS = {
        PLAYERS: 'elo_tracker_players_v2',
        MATCHES: 'elo_tracker_matches_v2'
    };
    let players = [];
    let matches = [];

    // --- DOM ELEMENTS ---
    const addPlayerForm = document.getElementById('add-player-form');
    const newPlayerNameInput = document.getElementById('new-player-name');
    const logMatchForm = document.getElementById('log-match-form');
    const player1Select = document.getElementById('player1-select');
    const player2Select = document.getElementById('player2-select');
    const winnerSelect = document.getElementById('winner-select');
    const playerListBody = document.getElementById('player-list-body');
    const matchHistoryList = document.getElementById('match-history-list');
    const h2hStatsBody = document.getElementById('h2h-stats-body');
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const resetButton = document.getElementById('reset-all-btn');
    const recalculateButton = document.getElementById('recalculate-all-btn');

    // --- DATA PERSISTENCE ---
    function saveData() {
        localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
        localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
    }

    function loadData() {
        const storedPlayers = localStorage.getItem(STORAGE_KEYS.PLAYERS);
        const storedMatches = localStorage.getItem(STORAGE_KEYS.MATCHES);
        players = storedPlayers ? JSON.parse(storedPlayers) : [];
        matches = storedMatches ? JSON.parse(storedMatches) : [];
    }

    // --- RENDERING FUNCTIONS ---
    function renderAll() {
        renderPlayerList();
        renderMatchHistory();
        renderH2HStats();
        updatePlayerDropdowns();
    }

    function renderPlayerList() {
        playerListBody.innerHTML = '';
        if (players.length === 0) {
            playerListBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No players yet. Add one!</td></tr>';
            return;
        }
        
        const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);

        sortedPlayers.forEach((player, index) => {
            const row = document.createElement('tr');
            // Add classes to each cell for mobile styling
            row.innerHTML = `
                <td class="rankings-col-rank">${index + 1}</td>
                <td class="rankings-col-player">${player.name}</td>
                <td class="rankings-col-rating">${Math.round(player.rating)}</td>
                <td class="rankings-col-matches">${player.matchesPlayed}</td>
            `;
            playerListBody.appendChild(row);
        });
    }

    function renderMatchHistory() {
        matchHistoryList.innerHTML = '';
        if (matches.length === 0) {
            matchHistoryList.innerHTML = '<li class="card" style="text-align:center;">No matches played yet.</li>';
            return;
        }

        [...matches].reverse().forEach(match => {
            const p1 = match.player1;
            const p2 = match.player2;

            const p1Color = p1.change > 0 ? 'gain' : p1.change < 0 ? 'loss' : 'draw';
            const p2Color = p2.change > 0 ? 'gain' : p2.change < 0 ? 'loss' : 'draw';
            const p1Sign = p1.change > 0 ? '+' : '';
            const p2Sign = p2.change > 0 ? '+' : '';

            const listItem = document.createElement('li');
            listItem.className = 'match-item';
            listItem.innerHTML = `
                <div class="match-player">
                    <div class="player-info">
                        <div class="player-name">${p1.name}</div>
                        <div class="elo-details">
                            <div>${Math.round(p1.oldRating)} -> <span class="elo-change elo-${p1Color}">${p1Sign}${Math.round(p1.change)}</span></div>
                            <div>${Math.round(p1.newRating)}</div>
                        </div>
                    </div>
                </div>
                <div class="match-vs">VS</div>
                <div class="match-player" style="justify-content: flex-end;">
                    <div class="player-info" style="text-align: right;">
                        <div class="player-name">${p2.name}</div>
                        <div class="elo-details">
                            <div><span class="elo-change elo-${p2Color}">${p2Sign}${Math.round(p2.change)}</span> <- ${Math.round(p2.oldRating)}</div>
                            <div>${Math.round(p2.newRating)}</div>
                        </div>
                    </div>
                </div>
                ${match.h2hRecord ? `
                    <div class="match-h2h-summary">
                        H2H: ${match.h2hRecord[p1.name]} - ${match.h2hRecord[p2.name]}
                        ${match.h2hRecord.draws > 0 ? ` (${match.h2hRecord.draws} Draws)` : ''}
                    </div>
                ` : ''}
            `;
            matchHistoryList.appendChild(listItem);
        });
    }

    function renderH2HStats() {
        h2hStatsBody.innerHTML = '';
        const stats = {}; // e.g., { "Alice-vs-Bob": { Alice: 1, Bob: 3 } }

        matches.forEach(match => {
            if (match.winner === 'draw') return; // Skip draws for win/loss stats

            const p1Name = match.player1.name;
            const p2Name = match.player2.name;

            // Create a consistent key by sorting names alphabetically
            const sortedNames = [p1Name, p2Name].sort();
            const key = `${sortedNames[0]}-vs-${sortedNames[1]}`;

            if (!stats[key]) {
                stats[key] = {
                    player1: { name: sortedNames[0], wins: 0 },
                    player2: { name: sortedNames[1], wins: 0 }
                };
            }

            if (match.winner === stats[key].player1.name) {
                stats[key].player1.wins++;
            } else if (match.winner === stats[key].player2.name) {
                stats[key].player2.wins++;
            }
        });

        const allStats = Object.values(stats);
        if (allStats.length === 0) {
            h2hStatsBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No head-to-head matches with a winner yet.</td></tr>';
            return;
        }
        
        // Sort alphabetically by the pairing
        allStats.sort((a, b) => (a.player1.name + a.player2.name).localeCompare(b.player1.name + b.player2.name));

        allStats.forEach(stat => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Player 1">${stat.player1.name}</td>
                <td data-label="Score" class="score-cell">${stat.player1.wins} - ${stat.player2.wins}</td>
                <td data-label="Player 2" class="player2-name-cell">${stat.player2.name}</td>
            `;
            h2hStatsBody.appendChild(row);
        });
    }
    
    // --- FORM & UI LOGIC ---
    function updatePlayerDropdowns() {
        const p1Val = player1Select.value;
        const p2Val = player2Select.value;

        player1Select.innerHTML = '<option value="">-- Select Player 1 --</option>';
        player2Select.innerHTML = '<option value="">-- Select Player 2 --</option>';
        
        players.forEach(p => {
            player1Select.innerHTML += `<option value="${p.name}">${p.name}</option>`;
            player2Select.innerHTML += `<option value="${p.name}">${p.name}</option>`;
        });

        player1Select.value = p1Val;
        player2Select.value = p2Val;
        
        handlePlayerSelectionChange();
    }
    
    function handlePlayerSelectionChange() {
        const p1Name = player1Select.value;
        const p2Name = player2Select.value;
        
        Array.from(player2Select.options).forEach(opt => opt.disabled = (opt.value === p1Name && p1Name !== ''));
        Array.from(player1Select.options).forEach(opt => opt.disabled = (opt.value === p2Name && p2Name !== ''));
        
        updateWinnerDropdown(p1Name, p2Name);
    }
    
    function updateWinnerDropdown(p1Name, p2Name) {
        if (p1Name && p2Name) {
            winnerSelect.innerHTML = `
                <option value="">-- Select Winner --</option>
                <option value="${p1Name}">${p1Name} Wins</option>
                <option value="${p2Name}">${p2Name} Wins</option>
                <option value="draw">Draw</option>
            `;
        } else {
            winnerSelect.innerHTML = '<option value="">-- Select Players First --</option>';
        }
    }
    
    // --- CORE LOGIC ---
    function addPlayer(name) {
        if (!name || name.trim() === '') {
            alert('Player name cannot be empty.');
            return false;
        }
        if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            alert('A player with this name already exists.');
            return false;
        }

        players.push({ name: name.trim(), rating: 800, matchesPlayed: 0 });
        return true;
    }

    function calculateElo(rating1, rating2, matches1, matches2, score1) {
        const k1 = Math.max(20, 100 / Math.sqrt(matches1 + 1));
        const k2 = Math.max(20, 100 / Math.sqrt(matches2 + 1));

        const expected1 = 1 / (1 + 10 ** ((rating2 - rating1) / 400));
        
        const performanceDelta1 = score1 - expected1;
        
        const change1 = k1 * performanceDelta1;
        const change2 = k2 * -performanceDelta1;
        
        return { change1: change1, change2: change2 };
    }

function logMatch(p1Name, p2Name, winner) {
    const player1 = players.find(p => p.name === p1Name);
    const player2 = players.find(p => p.name === p2Name);

    // --- Elo calculation (unchanged) ---
    let score1;
    if (winner === p1Name) score1 = 1.0;
    else if (winner === p2Name) score1 = 0.0;
    else score1 = 0.5;

    const oldRating1 = player1.rating;
    const oldRating2 = player2.rating;

    const { change1, change2 } = calculateElo(oldRating1, oldRating2, player1.matchesPlayed, player2.matchesPlayed, score1);
    
    player1.rating += change1;
    player2.rating += change2;
    player1.matchesPlayed++;
    player2.matchesPlayed++;

    // --- H2H record calculation ---
    let currentP1Wins = 0;
    let currentP2Wins = 0;
    let currentDraws = 0;

    // Iterate through all matches logged so far to get the historical H2H count
    for (const historicalMatch of matches) {
        const hP1 = historicalMatch.player1.name;
        const hP2 = historicalMatch.player2.name;

        // Check if the historical match involves the two current players
        if ((hP1 === p1Name && hP2 === p2Name) || (hP1 === p2Name && hP2 === p1Name)) {
            // Who won that historical match?
            if (historicalMatch.winner === p1Name) {
                currentP1Wins++;
            } else if (historicalMatch.winner === p2Name) {
                currentP2Wins++;
            } else if (historicalMatch.winner === 'draw') {
                currentDraws++;
            }
        }
    }

    // Now, account for the *current* match result to get the new total
    if (winner === p1Name) {
        currentP1Wins++;
    } else if (winner === p2Name) {
        currentP2Wins++;
    } else if (winner === 'draw') {
        currentDraws++;
    }

    // --- Push new match object with H2H record ---
    matches.push({
        player1: { name: p1Name, oldRating: oldRating1, newRating: player1.rating, change: change1 },
        player2: { name: p2Name, oldRating: oldRating2, newRating: player2.rating, change: change2 },
        winner: winner,
        timestamp: new Date().toISOString(),
        h2hRecord: {
            [p1Name]: currentP1Wins,
            [p2Name]: currentP2Wins,
            draws: currentDraws
        }
    });
}

    function recalculateAll() {
        if (!confirm("This will recalculate all ratings from the very first match. This is useful for fixing data errors but cannot be undone. Proceed?")) {
            return;
        }
        
        const originalMatches = JSON.parse(JSON.stringify(matches)); // Deep copy
        
        // Reset players to initial state
        players.forEach(p => {
            p.rating = 800;
            p.matchesPlayed = 0;
        });
        
        // Clear current detailed match history
        matches = [];

        // Re-log every match in chronological order
        originalMatches.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        originalMatches.forEach(match => {
            logMatch(match.player1.name, match.player2.name, match.winner);
        });

        alert("All ratings have been recalculated!");
        saveData();
        renderAll();
    }


    // --- EVENT LISTENERS ---
    addPlayerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (addPlayer(newPlayerNameInput.value)) {
            newPlayerNameInput.value = '';
            saveData();
            renderAll();
        }
    });
    
    logMatchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const p1Name = player1Select.value;
        const p2Name = player2Select.value;
        const winner = winnerSelect.value;
        
        if (!p1Name || !p2Name || !winner) {
            alert('Please complete all fields for the match.');
            return;
        }

        logMatch(p1Name, p2Name, winner);
        
        logMatchForm.reset();
        handlePlayerSelectionChange(); // Update dropdowns after reset
        saveData();
        renderAll();
    });

    player1Select.addEventListener('change', handlePlayerSelectionChange);
    player2Select.addEventListener('change', handlePlayerSelectionChange);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');

            const target = document.getElementById(tab.dataset.tab);
            tabContents.forEach(content => content.classList.remove('active'));
            target.classList.add('active');
        });
    });

    resetButton.addEventListener('click', () => {
        if (confirm('ARE YOU SURE? This will delete all players and matches permanently. This action cannot be undone.')) {
            players = [];
            matches = [];
            saveData();
            renderAll();
            alert('All data has been reset.');
        }
    });
    
    recalculateButton.addEventListener('click', recalculateAll);

    // --- INITIALIZATION ---
    function initialize() {
        loadData();
        renderAll();
    }

    initialize();
});