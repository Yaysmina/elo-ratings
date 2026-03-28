// js/main.js

import * as state from './state.js';
import * as view from './view.js';
import { INITIAL_RATING } from './config.js';

/**
 * Main function to update the entire UI based on the current state.
 */
function updateUI() {
    const currentState = state.calculateStateFromHistory();
    const {
        allPlayers,
        rankedPlayersByRating,
        rankedPlayersByMatches,
        otherPlayersByMatches,
        matches,
        archivedNames
    } = currentState;

    // Pass archivedNames as the third argument
    view.renderPlayerTable(rankedPlayersByRating, allPlayers, archivedNames); 
    view.renderMatchHistory(matches);
    view.renderH2HStats(matches);
    view.updateAllDropdowns(rankedPlayersByMatches, otherPlayersByMatches);
}

// --- Event Handlers ---
const handlers = {
    onAddPlayer: (e) => {
        e.preventDefault();
        const form = e.target;
        const nameInput = form.querySelector('#new-player-name');
        const name = nameInput.value.trim();
        const selectedEloRadio = form.querySelector('input[name="starting-elo"]:checked');
        const elo = selectedEloRadio ? parseInt(selectedEloRadio.value, 10) : INITIAL_RATING;

        const { playerNames } = state.calculateStateFromHistory();
        if (!name) {
            alert('Player name cannot be empty.');
            return;
        }
        if (playerNames.some(p => p.toLowerCase() === name.toLowerCase())) {
            alert('A player with this name already exists.');
            return;
        }
        
        state.addEvent(state.eventTypes.ADD_PLAYER, { name, elo });
        view.resetForm('addPlayerForm');
        updateUI();
    },

    onLogMatch: (e) => {
        e.preventDefault();
        const form = e.target;
        const player1Name = form.querySelector('#player1-select').value;
        const player2Name = form.querySelector('#player2-select').value;
        const winner = form.querySelector('#winner-select').value;

        if (!player1Name || !player2Name || !winner) {
            alert('Please complete all fields for the match.');
            return;
        }

        state.addEvent(state.eventTypes.LOG_MATCH, { player1Name, player2Name, winner });
        view.resetForm('logMatchForm');
        updateUI();
    },

    onFilterChange: () => {
        // 1. Destructure archivedNames here as well
        const { rankedPlayersByRating, allPlayers, matches, archivedNames } = state.calculateStateFromHistory();
        
        // 2. Pass it as the 3rd argument
        view.renderPlayerTable(rankedPlayersByRating, allPlayers, archivedNames);
        
        view.renderMatchHistory(matches);
        view.renderH2HStats(matches);
    },

    onReset: () => {
        if (confirm('ARE YOU SURE? This will delete all data permanently.')) {
            state.resetData();
            updateUI();
            alert('All data has been reset.');
        }
    },

    onExport: () => {
        const data = state.getRawData();
        if (data.length === 0) {
            alert("No data to export.");
            return;
        }
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `elo-tracker-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    onImport: (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (confirm('ARE YOU SURE? This will overwrite all current data.')) {
                    state.setData(importedData);
                    updateUI();
                    alert('Data successfully imported!');
                }
            } catch (error) {
                alert(`Error reading or parsing file: ${error.message}`);
            } finally {
                e.target.value = null; // Reset file input
            }
        };
        reader.readAsText(file);
    },
    onRenamePlayer: (oldName) => {
        const newName = prompt(`Enter new name for ${oldName}:`, oldName);
        if (!newName || newName.trim() === "" || newName === oldName) return;
        
        const trimmedNewName = newName.trim();
        const { playerNames } = state.calculateStateFromHistory();
        
        if (playerNames.some(p => p.toLowerCase() === trimmedNewName.toLowerCase())) {
            alert('A player with this name already exists.');
            return;
        }

        state.renamePlayer(oldName, trimmedNewName);
        updateUI();
    },
    onToggleArchive: (name) => {
        state.toggleArchivePlayer(name);
        updateUI();
    },
};

/**
 * Initializes the application.
 */
function initialize() {
    document.addEventListener('DOMContentLoaded', () => {
        view.init();
        view.bindEvents(handlers);
        state.loadData();
        updateUI();
    });
}

// Start the application
initialize();