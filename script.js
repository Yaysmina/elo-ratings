document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    const STORAGE_KEYS = {
        PLAYERS: 'elo_tracker_players_v2',
        MATCHES: 'elo_tracker_matches_v2'
    };
    let players = [];
    let matches = [];
    let rankedPlayers = [];
    let otherPlayers = [];
    let currentPlayerView = 'rankings'; // 'rankings' or 'alphabetical'

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
    const historyPlayerFilter = document.getElementById('history-player-filter');
    const h2hPlayerFilter = document.getElementById('h2h-player-filter');
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const viewToggleButtons = document.querySelectorAll('.toggle-btn');
    const resetButton = document.getElementById('reset-all-btn');
    const exportButton = document.getElementById('export-btn');
    const importButton = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');

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
        updateAllDropdowns();
    }
    
    function updateAllDropdowns() {
        // Sort ALL players by matches played (desc) first, then split them.
        const sortedByMatches = [...players].sort((a, b) => b.matchesPlayed - a.matchesPlayed);
        rankedPlayers = sortedByMatches.filter(p => p.matchesPlayed >= 4);
        otherPlayers = sortedByMatches.filter(p => p.matchesPlayed < 4);

        updatePlayerDropdowns();
        updateFilterDropdowns();
    }

    function renderPlayerList() {
        playerListBody.innerHTML = '';
        let playersToRender = [];

        if (currentPlayerView === 'rankings') {
            // Filter for players with at least 4 matches, then sort by rating
            playersToRender = players
                .filter(p => p.matchesPlayed >= 4)
                .sort((a, b) => b.rating - a.rating);
        } else { // 'all-players' view
            // Sort all players by matches played
            playersToRender = [...players].sort((a, b) => b.matchesPlayed - a.matchesPlayed);
        }

        if (playersToRender.length === 0) {
            let message = 'No players yet. Add one in the "Enter Data" tab!';
            if (players.length > 0 && currentPlayerView === 'rankings') {
                message = 'No players have played 4 or more matches to be ranked.';
            }
            playerListBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">${message}</td></tr>`;
            return;
        }

        playersToRender.forEach((player, index) => {
            const row = document.createElement('tr');
            // The rank depends on the view
            const rank = (currentPlayerView === 'rankings') ? index + 1 : '-';

            row.innerHTML = `
                <td class="rankings-col-rank">${rank}</td>
                <td class="rankings-col-player">${player.name}</td>
                <td class="rankings-col-rating">${Math.round(player.rating)}</td>
                <td class="rankings-col-matches">${player.matchesPlayed}</td>
            `;
            playerListBody.appendChild(row);
        });
    }

    function renderMatchHistory() {
        matchHistoryList.innerHTML = '';
        const selectedPlayer = historyPlayerFilter.value;
        
        let filteredMatches = matches;
        if (selectedPlayer) {
            filteredMatches = matches.filter(match => 
                match.player1.name === selectedPlayer || match.player2.name === selectedPlayer
            );
        }

        if (filteredMatches.length === 0) {
            const message = selectedPlayer ? `No matches found for ${selectedPlayer}.` : 'No matches played yet.';
            matchHistoryList.innerHTML = `<li class="card" style="text-align:center;">${message}</li>`;
            return;
        }

        [...filteredMatches].reverse().forEach(match => {
            let p1 = match.player1;
            let p2 = match.player2;

            // NEW: If a player is selected, ensure they are p1 (on the left)
            if (selectedPlayer && p2.name === selectedPlayer) {
                [p1, p2] = [p2, p1]; // Swap players
            }

            let p1Status = 'draw', p2Status = 'draw';
            if (match.winner !== 'draw') {
                if (match.winner === p1.name) {
                    p1Status = 'winner';
                    p2Status = 'loser';
                } else {
                    p1Status = 'loser';
                    p2Status = 'winner';
                }
            }
            
            const p1Color = p1.change > 0 ? 'gain' : p1.change < 0 ? 'loss' : 'draw';
            const p2Color = p2.change > 0 ? 'gain' : p2.change < 0 ? 'loss' : 'draw';
            const p1Sign = p1.change > 0 ? '+' : '';
            const p2Sign = p2.change > 0 ? '+' : '';

            const listItem = document.createElement('li');
            listItem.className = 'match-item';
            
            listItem.innerHTML = `
                <div class="match-body">
                    <div class="player-container ${p1Status}">
                        <h3 class="player-name">${p1.name}</h3>
                        <div class="elo-change elo-${p1Color}">${p1Sign}${Math.round(p1.change)}</div>
                        <div class="elo-breakdown">${Math.round(p1.oldRating)} &rarr; ${Math.round(p1.newRating)}</div>
                    </div>
                    <div class="match-separator">VS</div>
                    <div class="player-container ${p2Status}">
                        <h3 class="player-name">${p2.name}</h3>
                        <div class="elo-change elo-${p2Color}">${p2Sign}${Math.round(p2.change)}</div>
                        <div class="elo-breakdown">${Math.round(p2.oldRating)} &rarr; ${Math.round(p2.newRating)}</div>
                    </div>
                </div>
                ${match.h2hRecord ? `
                    <div class="match-h2h-summary">
                        H2H: ${match.h2hRecord[p1.name]} - ${match.h2hRecord[p2.name]}
                        ${match.h2hRecord.draws > 0 ? `(${match.h2hRecord.draws} Draws)` : ''}
                    </div>
                ` : ''}
            `;
            matchHistoryList.appendChild(listItem);
        });
    }

    function renderH2HStats() {
        h2hStatsBody.innerHTML = '';
        const stats = {};

        matches.forEach(match => {
            if (match.winner === 'draw') return;

            const p1Name = match.player1.name;
            const p2Name = match.player2.name;

            const sortedNames = [p1Name, p2Name].sort();
            const key = `${sortedNames[0]}-vs-${sortedNames[1]}`;

            if (!stats[key]) {
                stats[key] = {
                    player1: { name: sortedNames[0], wins: 0 },
                    player2: { name: sortedNames[1], wins: 0 },
                    totalGames: 0
                };
            }
            
            stats[key].totalGames++;
            if (match.winner === stats[key].player1.name) {
                stats[key].player1.wins++;
            } else if (match.winner === stats[key].player2.name) {
                stats[key].player2.wins++;
            }
        });

        let allStats = Object.values(stats);
        const selectedPlayer = h2hPlayerFilter.value;

        if (selectedPlayer) {
            allStats = allStats.filter(stat => 
                stat.player1.name === selectedPlayer || stat.player2.name === selectedPlayer
            );
            // NEW: Sort by most played opponent first when filtered
            allStats.sort((a, b) => b.totalGames - a.totalGames);
        } else {
            // Default sort alphabetically
            allStats.sort((a, b) => (a.player1.name + a.player2.name).localeCompare(b.player1.name + b.player2.name));
        }

        if (allStats.length === 0) {
            const message = selectedPlayer ? `No H2H stats found for ${selectedPlayer}.` : 'No head-to-head matches with a winner yet.';
            h2hStatsBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${message}</td></tr>`;
            return;
        }
        
        allStats.forEach(stat => {
            let displayP1 = stat.player1;
            let displayP2 = stat.player2;

            // NEW: If a player is selected, ensure they are on the left
            if (selectedPlayer && displayP1.name !== selectedPlayer) {
                [displayP1, displayP2] = [displayP2, displayP1];
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="Player 1">${displayP1.name}</td>
                <td data-label="Score" class="score-cell">${displayP1.wins} - ${displayP2.wins}</td>
                <td data-label="Player 2" class="player2-name-cell">${displayP2.name}</td>
            `;
            h2hStatsBody.appendChild(row);
        });
    }

    // --- FORM & UI LOGIC ---
    function populateSelectWithOptions(select, playerList, viewType, defaultOptionText, hasOthers) {
        select.innerHTML = ''; // Clear existing options

        // Add the primary default/placeholder option
        select.innerHTML += `<option value="">${defaultOptionText}</option>`;
        
        // Add players
        playerList.forEach(p => {
            select.innerHTML += `<option value="${p.name}">${p.name}</option>`;
        });

        // Add the appropriate navigation option at the end
        if (viewType === 'ranked' && hasOthers) {
            select.innerHTML += `<option value="other">-- Other Players --</option>`;
        } else if (viewType === 'unranked') {
            select.innerHTML += `<option value="back_to_ranked">-- Back to Ranked Players --</option>`;
        }
        
        // Store info for the event handler
        select.dataset.view = viewType;
        select.dataset.defaultOption = defaultOptionText;
    }

    function updatePlayerDropdowns() {
        populateSelectWithOptions(player1Select, rankedPlayers, 'ranked', '-- Select Player 1 --', otherPlayers.length > 0);
        populateSelectWithOptions(player2Select, rankedPlayers, 'ranked', '-- Select Player 2 --', otherPlayers.length > 0);
        handlePlayerSelectionChange();
    }

    function updateFilterDropdowns() {
        populateSelectWithOptions(historyPlayerFilter, rankedPlayers, 'ranked', '-- All Players --', otherPlayers.length > 0);
        populateSelectWithOptions(h2hPlayerFilter, rankedPlayers, 'ranked', '-- All Players --', otherPlayers.length > 0);
    }

    /**
     * A unified event handler for all player selection dropdowns.
     * Handles view switching (ranked/unranked) and triggers appropriate UI updates.
     */
    function onSelectChange(event) {
        const select = event.target;
        const value = select.value;

        // First, handle view switching logic
        if (value === 'other') {
            populateSelectWithOptions(select, otherPlayers, 'unranked', select.dataset.defaultOption, true);
            select.value = ''; // Set to the new placeholder
            return; // Stop further processing as this was a navigation action
        } else if (value === 'back_to_ranked') {
            populateSelectWithOptions(select, rankedPlayers, 'ranked', select.dataset.defaultOption, otherPlayers.length > 0);
            select.value = ''; // Reset to default placeholder
            return; // Stop further processing
        }

        // If it wasn't a view switch, run the appropriate update logic based on which dropdown was changed
        if (select === player1Select || select === player2Select) {
            handlePlayerSelectionChange();
        } else if (select === historyPlayerFilter) {
            renderMatchHistory();
        } else if (select === h2hPlayerFilter) {
            renderH2HStats();
        }
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

    function handleOtherPlayerSelection(event) {
        const selectElement = event.target;
        // Clean up any previously added temporary option
        selectElement.querySelector('[data-temp="true"]')?.remove();

        if (selectElement.value !== 'other') {
            return;
        }

        const otherPlayerNames = otherPlayers.map(p => p.name).join(', ');
        const promptMessage = `The following players are not on the rankings. Please type one name exactly as shown:\n\n${otherPlayerNames}`;
        
        const chosenName = prompt(promptMessage);

        if (!chosenName) {
            selectElement.value = ''; // Reset if user cancels
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        const matchedPlayer = otherPlayers.find(p => p.name.toLowerCase() === chosenName.trim().toLowerCase());

        if (matchedPlayer) {
            // Create a new temporary option for the chosen player
            const newOption = new Option(matchedPlayer.name, matchedPlayer.name);
            newOption.dataset.temp = 'true'; // Mark it as temporary
            selectElement.appendChild(newOption);
            selectElement.value = matchedPlayer.name;
        } else {
            alert(`'${chosenName}' is not a valid player from the 'Other Players' list.`);
            selectElement.value = ''; // Reset on invalid input
        }
        // Manually trigger a change event to update dependant UI (like the other dropdowns or filters)
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
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

        let currentP1Wins = 0;
        let currentP2Wins = 0;
        let currentDraws = 0;

        for (const historicalMatch of matches) {
            const hP1 = historicalMatch.player1.name;
            const hP2 = historicalMatch.player2.name;
            
            if ((hP1 === p1Name && hP2 === p2Name) || (hP1 === p2Name && hP2 === p1Name)) {
                if (historicalMatch.winner === p1Name) {
                    currentP1Wins++;
                } else if (historicalMatch.winner === p2Name) {
                    currentP2Wins++;
                } else if (historicalMatch.winner === 'draw') {
                    currentDraws++;
                }
            }
        }

        if (winner === p1Name) {
            currentP1Wins++;
        } else if (winner === p2Name) {
            currentP2Wins++;
        } else if (winner === 'draw') {
            currentDraws++;
        }

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

    function handleExport() {
        if (matches.length === 0) {
            alert("No match data to export.");
            return;
        }

        const leanMatchHistory = matches.map(match => ({
            player1Name: match.player1.name,
            player2Name: match.player2.name,
            winner: match.winner,
            timestamp: match.timestamp
        }));

        const dataStr = JSON.stringify(leanMatchHistory, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `elo-tracker-data-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert("Minimal match data has been exported! You can now safely edit this file.");
    }

    function rebuildStateFromMatches(importedMatches) {
        players = [];
        matches = [];

        const playerNames = new Set();
        importedMatches.forEach(match => {
            playerNames.add(match.player1Name || match.player1.name);
            playerNames.add(match.player2Name || match.player2.name);
        });

        playerNames.forEach(name => {
            addPlayer(name);
        });

        const sortedMatches = [...importedMatches].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        sortedMatches.forEach(matchData => {
            const p1Name = matchData.player1Name || matchData.player1.name;
            const p2Name = matchData.player2Name || matchData.player2.name;
            const winner = matchData.winner;
            
            logMatch(p1Name, p2Name, winner);
        });

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
        saveData();
        renderAll(); // Will reset dropdowns to default ranked view
    });

    // Attach the new unified change handler to all relevant dropdowns
    [player1Select, player2Select, historyPlayerFilter, h2hPlayerFilter].forEach(el => {
        el.addEventListener('change', onSelectChange);
    });

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

    viewToggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentPlayerView = button.dataset.view;
            viewToggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            renderPlayerList();
        });
    });

    exportButton.addEventListener('click', handleExport);
    importButton.addEventListener('click', () => importFileInput.click());

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedMatches = JSON.parse(event.target.result);
                if (!Array.isArray(importedMatches)) throw new Error("Imported file is not a valid match array.");
                if (confirm('ARE YOU SURE? This will overwrite all current data. This action cannot be undone.')) {
                    rebuildStateFromMatches(importedMatches);
                    alert('Data has been successfully imported and all ratings recalculated!');
                }
            } catch (error) {
                alert(`Error reading or parsing file: ${error.message}`);
            } finally {
                e.target.value = null;
            }
        };
        reader.readAsText(file);
    });

    // --- INITIALIZATION ---
    function initialize() {
        loadData();
        renderAll();
    }

    initialize();
});