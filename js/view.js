// js/view.js

import { RANKING_MIN_MATCHES } from './config.js';

// Store all DOM element references in one place
const dom = {};

// State for the view
let currentPlayerView = 'rankings';

/**
 * Finds and stores all necessary DOM elements.
 */
/**
 * Finds and stores all necessary DOM elements.
 */
export function init() {
    const selectors = {
        playerListBody: '#player-list-body',
        allPlayersListBody: '#all-players-list-body',
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
        tabIndicator: '.tab-indicator',
        viewToggleButtons: '.toggle-btn',
        viewToggleIndicator: '.view-toggle-indicator',
        viewTrack: '.view-track',
        viewPanes: '.view-pane',
        resetButton: '#reset-all-btn',
        exportButton: '#export-btn',
        importButton: '#import-btn',
        importFileInput: '#import-file-input',
        simulationToggle: '#simulation-toggle', // NEW
        simulationBanner: '#simulation-banner'  // NEW
    };
    for (const key in selectors) {
        dom[key] = document.querySelectorAll(selectors[key]).length > 1
            ? document.querySelectorAll(selectors[key])
            : document.querySelector(selectors[key]);
    }

    // Place the sliding highlight bar under the initially active tab (no animation on first paint)
    updateTabIndicator(getActiveTab(), false);
    updateViewToggleIndicator(getActiveViewToggle(), false);
    updateViewSlide(false);

    // Keep the indicators aligned when the layout changes (resize, font loading, etc.)
    window.addEventListener('resize', () => {
        updateTabIndicator(getActiveTab(), false);
        updateViewToggleIndicator(getActiveViewToggle(), false);
    });
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            updateTabIndicator(getActiveTab(), false);
            updateViewToggleIndicator(getActiveViewToggle(), false);
        });
    }
}

/**
 * Returns the currently active tab button.
 * @returns {HTMLElement|null}
 */
function getActiveTab() {
    const tabs = dom.tabs instanceof NodeList ? Array.from(dom.tabs) : [dom.tabs];
    return tabs.find(tab => tab && tab.classList.contains('active')) || null;
}

/**
 * Moves the sliding highlight bar to the given tab.
 * @param {HTMLElement|null} tab - The tab button to highlight.
 * @param {boolean} animate - Whether the bar should slide smoothly (false for instant repositioning).
 */
function updateTabIndicator(tab, animate = true) {
    if (!dom.tabIndicator || !tab) return;

    if (!animate) {
        dom.tabIndicator.style.transition = 'none';
    }
    dom.tabIndicator.style.width = `${tab.offsetWidth}px`;
    dom.tabIndicator.style.transform = `translateX(${tab.offsetLeft}px)`;
    if (!animate) {
        // Force a reflow so the position is applied instantly, then restore the transition
        void dom.tabIndicator.offsetWidth;
        dom.tabIndicator.style.transition = '';
    }
}

/**
 * Returns the currently active view toggle button.
 * @returns {HTMLElement|null}
 */
function getActiveViewToggle() {
    const buttons = dom.viewToggleButtons instanceof NodeList ? Array.from(dom.viewToggleButtons) : [dom.viewToggleButtons];
    return buttons.find(button => button && button.classList.contains('active')) || null;
}

/**
 * Moves the sliding highlight pill to the given view toggle button.
 * @param {HTMLElement|null} button - The toggle button to highlight.
 * @param {boolean} animate - Whether the pill should slide smoothly (false for instant repositioning).
 */
function updateViewToggleIndicator(button, animate = true) {
    if (!dom.viewToggleIndicator || !button) return;

    if (!animate) {
        dom.viewToggleIndicator.style.transition = 'none';
    }
    dom.viewToggleIndicator.style.width = `${button.offsetWidth}px`;
    dom.viewToggleIndicator.style.transform = `translateX(${button.offsetLeft}px)`;
    if (!animate) {
        // Force a reflow so the position is applied instantly, then restore the transition
        void dom.viewToggleIndicator.offsetWidth;
        dom.viewToggleIndicator.style.transition = '';
    }
}

/**
 * Slides the Rankings / All Players panes to match the current view.
 * @param {boolean} animate - Whether the panes should slide smoothly (false for instant repositioning).
 */
function updateViewSlide(animate = true) {
    if (!dom.viewTrack) return;

    const isAllPlayers = currentPlayerView === 'all-players';

    if (!animate) {
        dom.viewTrack.style.transition = 'none';
        if (dom.viewPanes) {
            dom.viewPanes.forEach(pane => pane.style.transition = 'none');
        }
    }

    dom.viewTrack.classList.toggle('show-all', isAllPlayers);
    if (dom.viewPanes) {
        dom.viewPanes.forEach(pane => {
            pane.classList.toggle('active', pane.dataset.pane === currentPlayerView);
        });
    }

    if (!animate) {
        // Force a reflow so the position is applied instantly, then restore the transitions
        void dom.viewTrack.offsetWidth;
        dom.viewTrack.style.transition = '';
        if (dom.viewPanes) {
            dom.viewPanes.forEach(pane => pane.style.transition = '');
        }
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
    
    // NEW: Bind simulation toggle handler
    dom.simulationToggle.addEventListener('change', handlers.onToggleSimulation);
    
    dom.player1Select.addEventListener('change', updateWinnerAndOpponentDropdowns);
    dom.player2Select.addEventListener('change', updateWinnerAndOpponentDropdowns);

    dom.historyPlayerFilter.addEventListener('change', handlers.onFilterChange);
    dom.h2hPlayerFilter.addEventListener('change', handlers.onFilterChange);

    dom.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            dom.tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            updateTabIndicator(tab);
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
            updateViewToggleIndicator(button);
            updateViewSlide();
            handlers.onFilterChange();
        });
    });

    dom.playerListBody.addEventListener('click', handlePlayerRowClick(handlers));
    dom.allPlayersListBody.addEventListener('click', handlePlayerRowClick(handlers));
}

/**
 * Builds a delegated click handler for player row action buttons.
 */
function handlePlayerRowClick(handlers) {
    return (e) => {
        const renameBtn = e.target.closest('.edit-player-btn');
        if (renameBtn) {
            handlers.onRenamePlayer(renameBtn.dataset.name);
            return;
        }

        const archiveBtn = e.target.closest('.archive-btn');
        if (archiveBtn) {
            handlers.onToggleArchive(archiveBtn.dataset.name);
        }
    };
}

/**
 * NEW: Controls visibility of the Simulation UI components
 */
export function setSimulationUI(isActive) {
    dom.simulationToggle.checked = isActive;
    if (isActive) {
        dom.simulationBanner.classList.remove('hidden');
    } else {
        dom.simulationBanner.classList.add('hidden');
    }
}

export function renderPlayerTable(rankedPlayersSortedByRating, allPlayersSortedByMatches, archivedNames = new Set()) {
    renderPlayerRows(
        dom.playerListBody,
        rankedPlayersSortedByRating,
        { isRankingsView: true, archivedNames }
    );

    renderPlayerRows(
        dom.allPlayersListBody,
        allPlayersSortedByMatches,
        { isRankingsView: false, archivedNames }
    );
}

/**
 * Renders player rows into a table body.
 * @param {HTMLElement} tbody - The table body to render into.
 * @param {Array} players - The players to render.
 * @param {object} options - Rendering options ({ isRankingsView, archivedNames }).
 */
function renderPlayerRows(tbody, players, { isRankingsView, archivedNames }) {
    tbody.innerHTML = '';

    if (players.length === 0) {
        const message = isRankingsView
            ? 'No active players have played enough matches.'
            : 'No players yet.';
        const colspan = isRankingsView ? 3 : 4;
        tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding: 2rem;">${message}</td></tr>`;
        return;
    }

    players.forEach((player, index) => {
        const row = document.createElement('tr');
        const isArchived = archivedNames.has(player.name);

        if (isArchived) row.classList.add('row-archived');

        // Logic for winstreak and edit button
        const winstreakDisplay = (player.winstreak >= 2) ? `<span class="winstreak">🔥${player.winstreak}</span>` : '';
        const editBtn = !isRankingsView ? `<button class="edit-player-btn" data-name="${player.name}">✏️</button>` : '';

        // Inject rank number directly into the display name if in rankings view
        const displayName = isRankingsView ? `${index + 1}. ${player.name}` : player.name;

        // Define Action Cell (only present in the all-players view)
        const actionCell = isRankingsView ? '' : `
            <td class="rankings-col-action">
                <button class="archive-btn ${isArchived ? 'is-archived' : 'is-visible'}" data-name="${player.name}">
                    ${isArchived ? 'Hidden' : 'Shown'}
                </button>
            </td>`;

        row.innerHTML = `
            <td class="rankings-col-player">
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${displayName}${editBtn}
                </div>
            </td>
            <td class="rankings-col-rating">
                <span class="rating-wrapper">
                    ${Math.round(player.rating)}
                    ${winstreakDisplay}
                </span>
            </td>
            <td class="rankings-col-matches">${player.matchesPlayed}</td>
            ${actionCell}
        `;
        tbody.appendChild(row);
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
        allStats = allStats.filter(s => s.players.includes(selectedPlayer));
    }
    allStats.sort((a, b) => b.scores.total - a.scores.total);
    
    if (allStats.length === 0) {
        const message = selectedPlayer ? `No H2H stats for ${selectedPlayer}.` : 'No head-to-head matches yet.';
        dom.h2hStatsBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">${message}</td></tr>`;
        return;
    }

    allStats.forEach(({ players, scores }) => {
        let [p1Name, p2Name] = players;
        if (selectedPlayer) {
            // The filtered player always appears on the left.
            if (p2Name === selectedPlayer) [p1Name, p2Name] = [p2Name, p1Name];
        } else if (scores[p2Name] > scores[p1Name]) {
            // Without a filter, put the player with more wins on the left.
            [p1Name, p2Name] = [p2Name, p1Name];
        }
        
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