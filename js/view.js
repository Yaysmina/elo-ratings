// js/view.js

import { RANKING_MIN_MATCHES } from './config.js';

// Store all DOM element references in one place
const dom = {};

// State for the view
let currentPlayerView = 'rankings';

/**
 * Finds and stores all necessary DOM elements.
 */
export function init() {
    const selectors = {
        playerListBody: '#player-list-body',
        matchHistoryList: '#match-history-list',
        h2hStatsBody: '#h2h-stats-body',
        player1Select: '#player1-select',
        player2Select: '#player2-select',
        winnerSelect: '#winner-select',
        historyPlayerFilter: '#history-player-filter',
        h2hPlayerFilter: '#h2h-player-filter',
        addPlayerForm: '#add-player-form',
        logMatchForm: '#log-match-form',
        newPlayerNameInput: '#new-player-name',
        tabs: '.tab-link',
        tabContents: '.tab-content',
        viewToggleButtons: '.toggle-btn',
        resetButton: '#reset-all-btn',
        exportButton: '#export-btn',
        importButton: '#import-btn',
        importFileInput: '#import-file-input',
    };
    for (const key in selectors) {
        dom[key] = document.querySelectorAll(selectors[key]).length > 1 
            ? document.querySelectorAll(selectors[key]) 
            : document.querySelector(selectors[key]);
    }
}

/**
 * Attaches event listeners to DOM elements.
 * @param {object} handlers - An object containing handler functions for events.
 */
export function bindEvents(handlers) {
    dom.addPlayerForm.addEventListener('submit', handlers.onAddPlayer);
    dom.logMatchForm.addEventListener('submit', handlers.onLogMatch);
    dom.resetButton.addEventListener('click', handlers.onReset);
    dom.exportButton.addEventListener('click', handlers.onExport);
    dom.importButton.addEventListener('click', () => dom.importFileInput.click());
    dom.importFileInput.addEventListener('change', handlers.onImport);
    
    dom.player1Select.addEventListener('change', updateWinnerAndOpponentDropdowns);
    dom.player2Select.addEventListener('change', updateWinnerAndOpponentDropdowns);

    dom.historyPlayerFilter.addEventListener('change', handlers.onFilterChange);
    dom.h2hPlayerFilter.addEventListener('change', handlers.onFilterChange);

    dom.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            dom.tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.tab);
            dom.tabContents.forEach(content => content.classList.remove('active'));
            target.classList.add('active');
        });
    });

    dom.viewToggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentPlayerView = button.dataset.view;
            dom.viewToggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            handlers.onFilterChange(); // Re-render the player list with the new view
        });
    });
}

/**
 * Renders the main player rankings/list table.
 * @param {Array} rankedPlayersSortedByRating - Players sorted by rating for the 'Rankings' view.
 * @param {Array} allPlayersSortedByMatches - All players sorted by matches for the 'All Players' view.
 */
export function renderPlayerTable(rankedPlayersSortedByRating, allPlayersSortedByMatches) {
    dom.playerListBody.innerHTML = '';
    
    // Logic is now simpler: just pick the correct pre-sorted list.
    const playersToRender = currentPlayerView === 'rankings' 
        ? rankedPlayersSortedByRating 
        : allPlayersSortedByMatches;

    if (playersToRender.length === 0) {
        let message = 'No players yet. Add one in the "Enter Data" tab!';
        // Check the source of truth to provide a more specific message
        if (allPlayersSortedByMatches.length > 0 && currentPlayerView === 'rankings') {
            message = `No players have played ${RANKING_MIN_MATCHES} or more matches to be ranked.`;
        }
        dom.playerListBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">${message}</td></tr>`;
        return;
    }

    playersToRender.forEach((player, index) => {
        const row = document.createElement('tr');
        const rank = (currentPlayerView === 'rankings' && player.matchesPlayed >= RANKING_MIN_MATCHES) ? index + 1 : '-';
        const winstreakDisplay = (player.winstreak >= 2) ? ` <span class="winstreak">🔥${player.winstreak}</span>` : '';

        row.innerHTML = `
            <td class="rankings-col-rank">${rank}</td>
            <td class="rankings-col-player">${player.name}</td>
            <td class="rankings-col-rating">${Math.round(player.rating)}${winstreakDisplay}</td>
            <td class="rankings-col-matches">${player.matchesPlayed}</td>
        `;
        dom.playerListBody.appendChild(row);
    });
}

/**
 * Renders the match history list.
 * @param {Array} matches - The list of all processed matches.
 */
export function renderMatchHistory(matches) {
    dom.matchHistoryList.innerHTML = '';
    const selectedPlayer = dom.historyPlayerFilter.value;
    
    let filteredMatches = selectedPlayer 
        ? matches.filter(m => m.player1.name === selectedPlayer || m.player2.name === selectedPlayer) 
        : matches;
    
    if (filteredMatches.length === 0) {
        const message = selectedPlayer ? `No matches found for ${selectedPlayer}.` : 'No matches played yet.';
        dom.matchHistoryList.innerHTML = `<li class="card" style="text-align:center;">${message}</li>`;
        return;
    }

    [...filteredMatches].reverse().forEach(match => {
        let p1 = match.player1, p2 = match.player2;
        if (selectedPlayer && p2.name === selectedPlayer) [p1, p2] = [p2, p1]; // Swap for consistency

        const p1Status = match.winner === 'draw' ? 'draw' : match.winner === p1.name ? 'winner' : 'loser';
        const p2Status = match.winner === 'draw' ? 'draw' : match.winner === p2.name ? 'winner' : 'loser';
        const p1Color = p1.change > 0 ? 'gain' : 'loss';
        const p2Color = p2.change > 0 ? 'gain' : 'loss';

        const listItem = document.createElement('li');
        listItem.className = 'match-item';
        listItem.innerHTML = `
            <div class="match-body">
                <div class="player-container ${p1Status}">
                    <h3 class="player-name">${p1.name}</h3>
                    <div class="elo-change elo-${p1Color}">${p1.change > 0 ? '+' : ''}${Math.round(p1.change)}</div>
                    <div class="elo-breakdown">${Math.round(p1.oldRating)} &rarr; ${Math.round(p1.newRating)}</div>
                </div>
                <div class="match-separator">VS</div>
                <div class="player-container ${p2Status}">
                    <h3 class="player-name">${p2.name}</h3>
                    <div class="elo-change elo-${p2Color}">${p2.change > 0 ? '+' : ''}${Math.round(p2.change)}</div>
                    <div class="elo-breakdown">${Math.round(p2.oldRating)} &rarr; ${Math.round(p2.newRating)}</div>
                </div>
            </div>`;
        dom.matchHistoryList.appendChild(listItem);
    });
}

/**
 * Renders the Head-to-Head statistics table.
 * @param {Array} matches - The list of all processed matches.
 */
export function renderH2HStats(matches) {
    dom.h2hStatsBody.innerHTML = '';
    const stats = {};
    matches.forEach(match => {
        if (match.winner === 'draw') return;
        const key = [match.player1.name, match.player2.name].sort().join('-');
        if (!stats[key]) stats[key] = { [match.player1.name]: 0, [match.player2.name]: 0, total: 0 };
        stats[key][match.winner]++;
        stats[key].total++;
    });

    const selectedPlayer = dom.h2hPlayerFilter.value;
    let allStats = Object.entries(stats).map(([key, value]) => ({ players: key.split('-'), scores: value }));
    if (selectedPlayer) {
        allStats = allStats.filter(s => s.players.includes(selectedPlayer)).sort((a, b) => b.scores.total - a.scores.total);
    }
    
    if (allStats.length === 0) {
        const message = selectedPlayer ? `No H2H stats for ${selectedPlayer}.` : 'No head-to-head matches yet.';
        dom.h2hStatsBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${message}</td></tr>`;
        return;
    }

    allStats.forEach(({ players, scores }) => {
        let [p1Name, p2Name] = players;
        if (selectedPlayer && p2Name === selectedPlayer) [p1Name, p2Name] = [p2Name, p1Name];
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p1Name}</td>
            <td class="score-cell">${scores[p1Name]} - ${scores[p2Name]}</td>
            <td class="player2-name-cell">${p2Name}</td>
        `;
        dom.h2hStatsBody.appendChild(row);
    });
}

/**
 * Populates all dropdown menus with player data.
 * The incoming lists are already sorted by matches played.
 * @param {Array} rankedPlayers - Ranked players sorted by matches.
 * @param {Array} otherPlayers - Unranked players sorted by matches.
 */
export function updateAllDropdowns(rankedPlayers, otherPlayers) {
    const populateSelect = (select, includeAllOption) => {
        const currentValue = select.value;
        select.innerHTML = ''; // Clear
        if (includeAllOption) {
            select.add(new Option('-- All Players --', ''));
        } else {
            select.add(new Option(`-- Select Player --`, ''));
        }

        const createOptGroup = (label, players) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = label;
            players.forEach(p => optgroup.appendChild(new Option(p.name, p.name)));
            return optgroup;
        };
        
        // The lists are now pre-sorted correctly by matches played.
        if (rankedPlayers.length > 0) {
            select.appendChild(createOptGroup('Ranked Players', rankedPlayers));
        }
        if (otherPlayers.length > 0) {
            select.appendChild(createOptGroup('Other Players', otherPlayers));
        }
        select.value = currentValue;
    };
    
    populateSelect(dom.player1Select, false);
    populateSelect(dom.player2Select, false);
    populateSelect(dom.historyPlayerFilter, true);
    populateSelect(dom.h2hPlayerFilter, true);
    updateWinnerAndOpponentDropdowns();
}

/**
 * Updates the winner dropdown based on selected players and disables opponent in other select.
 */
function updateWinnerAndOpponentDropdowns() {
    const p1Name = dom.player1Select.value;
    const p2Name = dom.player2Select.value;

    Array.from(dom.player2Select.options).forEach(opt => opt.disabled = (opt.value === p1Name && p1Name !== ''));
    Array.from(dom.player1Select.options).forEach(opt => opt.disabled = (opt.value === p2Name && p2Name !== ''));

    if (p1Name && p2Name) {
        dom.winnerSelect.innerHTML = `
            <option value="">-- Select Winner --</option>
            <option value="${p1Name}">${p1Name} Wins</option>
            <option value="${p2Name}">${p2Name} Wins</option>
            <option value="draw">Draw</option>
        `;
    } else {
        dom.winnerSelect.innerHTML = '<option value="">-- Select Players First --</option>';
    }
}

/**
 * Resets a form element.
 * @param {string} formId - The ID of the form to reset ('addPlayerForm' or 'logMatchForm').
 */
export function resetForm(formId) {
    if (dom[formId]) {
        dom[formId].reset();
        if (formId === 'logMatchForm') {
            updateWinnerAndOpponentDropdowns();
        }
    }
}