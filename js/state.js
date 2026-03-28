// js/state.js

import { calculateElo } from './elo.js';
import * as config from './config.js';

// The single source of truth: an array of game events.
let gameData = [];

export const eventTypes = {
    ADD_PLAYER: 'ADD_PLAYER',
    LOG_MATCH: 'LOG_MATCH',
    TOGGLE_ARCHIVE: 'TOGGLE_ARCHIVE',
};

/**
 * Loads the game data from localStorage.
 */
export function loadData() {
    const storedData = localStorage.getItem(config.STORAGE_KEY);
    gameData = storedData ? JSON.parse(storedData) : [];
}

/**
 * Saves the current game data to localStorage.
 */
function saveData() {
    localStorage.setItem(config.STORAGE_KEY, JSON.stringify(gameData));
}

/**
 * Adds a new event to the game data log and saves it.
 * @param {string} type - The type of event (from eventTypes).
 * @param {object} payload - The data associated with the event.
 */
export function addEvent(type, payload) {
    // Basic validation
    if (!Object.values(eventTypes).includes(type)) {
        throw new Error(`Invalid event type: ${type}`);
    }
    gameData.push({ type, payload });
    saveData();
}

/**
 * Returns the raw game data (for export).
 * @returns {Array} The array of game events.
 */
export function getRawData() {
    return gameData;
}

/**
 * Overwrites the current game data with new data (for import) and saves.
 * @param {Array} newData - The new array of game events.
 */
export function setData(newData) {
    if (!Array.isArray(newData)) {
        throw new Error("Imported data must be an array.");
    }
    gameData = newData;
    saveData();
}

/**
 * Clears all game data.
 */
export function resetData() {
    gameData = [];
    saveData();
}

/**
 * Processes the entire gameData event log to generate the current application state.
 * This is the core function that provides robustness.
 * @returns {object} The complete, calculated application state.
 */
export function calculateStateFromHistory() {
    const playersMap = new Map();
    const detailedMatches = [];

    // --- CORE EVENT PROCESSING LOOP ---
    for (const event of gameData) {
        if (event.type === eventTypes.ADD_PLAYER) {
            const { name, elo } = event.payload; //MODIFIED: Destructure elo
            if (name && !playersMap.has(name)) {
                playersMap.set(name, {
                    name,
                    rating: elo || config.INITIAL_RATING,
                    matchesPlayed: 0,
                    winstreak: 0,
                    history: [],
                    isArchived: false // NEW
                });
            }
        } else if (event.type === eventTypes.LOG_MATCH) {
            const { player1Name, player2Name, winner } = event.payload;
            const p1 = playersMap.get(player1Name);
            const p2 = playersMap.get(player2Name);

            // Skip if a player in the match doesn't exist (handles data corruption)
            if (!p1 || !p2) continue;

            const score1 = winner === p1.name ? 1.0 : winner === p2.name ? 0.0 : 0.5;

            const oldRating1 = p1.rating;
            const oldRating2 = p2.rating;

            const { change1, change2 } = calculateElo(oldRating1, oldRating2, p1.matchesPlayed, p2.matchesPlayed, score1);
            
            const newRating1 = Math.round(oldRating1 + change1);
            const newRating2 = Math.round(oldRating2 + change2);

            // Update player stats
            p1.rating = newRating1;
            p2.rating = newRating2;
            p1.matchesPlayed++;
            p2.matchesPlayed++;
            p1.history.push(newRating1);
            p2.history.push(newRating2);

            // Create a detailed match object for the history view
            detailedMatches.push({
                player1: { name: p1.name, oldRating: oldRating1, newRating: newRating1, change: change1 },
                player2: { name: p2.name, oldRating: oldRating2, newRating: newRating2, change: change2 },
                winner,
            });
        }
    }

    // Post-processing: Calculate winstreaks
    const allPlayersFromMap = Array.from(playersMap.values());
    const reversedMatches = [...detailedMatches].reverse();

    allPlayersFromMap.forEach(player => {
        let currentStreak = 0;
        for (const match of reversedMatches) {
            const isParticipant = match.player1.name === player.name || match.player2.name === player.name;
            if (isParticipant) {
                if (match.winner === player.name) {
                    currentStreak++;
                } else {
                    break; // Streak broken
                }
            }
        }
        player.winstreak = currentStreak;
    });
        
    const archivedSet = getArchivedPlayers();

    // 1. Create the canonical list, sorted by matches played (descending).
    const allPlayersSortedByMatches = [...allPlayersFromMap].sort((a, b) => b.matchesPlayed - a.matchesPlayed);
    
    // 2. Create a special-case list for the "Rankings" table view (Excluding Archived).
    const rankedPlayersSortedByRating = allPlayersSortedByMatches
        .filter(p => p.matchesPlayed >= config.RANKING_MIN_MATCHES && !archivedSet.has(p.name))
        .sort((a, b) => b.rating - a.rating);

    // 3. Create lists for the dropdown optgroups (Excluding Archived).
    const rankedPlayersSortedByMatches = allPlayersSortedByMatches
        .filter(p => p.matchesPlayed >= config.RANKING_MIN_MATCHES && !archivedSet.has(p.name));
    
    const otherPlayersSortedByMatches = allPlayersSortedByMatches
        .filter(p => p.matchesPlayed < config.RANKING_MIN_MATCHES && !archivedSet.has(p.name));

    return {
        allPlayers: allPlayersSortedByMatches, 
        rankedPlayersByRating: rankedPlayersSortedByRating,
        rankedPlayersByMatches: rankedPlayersSortedByMatches,
        otherPlayersByMatches: otherPlayersSortedByMatches,
        matches: detailedMatches,
        playerNames: allPlayersSortedByMatches.map(p => p.name),
        archivedNames: archivedSet
    };
}

/**
 * Renames a player throughout the entire event history.
 * @param {string} oldName - The current name of the player.
 * @param {string} newName - The new name for the player.
 */
export function renamePlayer(oldName, newName) {
    if (!newName || oldName === newName) return;

    gameData.forEach(event => {
        if (event.type === eventTypes.ADD_PLAYER && event.payload.name === oldName) {
            event.payload.name = newName;
        } else if (event.type === eventTypes.LOG_MATCH) {
            if (event.payload.player1Name === oldName) event.payload.player1Name = newName;
            if (event.payload.player2Name === oldName) event.payload.player2Name = newName;
            if (event.payload.winner === oldName) event.payload.winner = newName;
        } else if (event.type === eventTypes.TOGGLE_ARCHIVE) {
            const player = playersMap.get(event.payload.name);
            if (player) {
                player.isArchived = event.payload.archived;
            }
}
    });
    saveData();
}

const ARCHIVE_KEY = 'elo-tracker-archived-players';

/**
 * Gets the set of archived player names from localStorage.
 */
export function getArchivedPlayers() {
    const archived = localStorage.getItem(ARCHIVE_KEY);
    return new Set(archived ? JSON.parse(archived) : []);
}

/**
 * Toggles a player's archived status.
 */
export function toggleArchivePlayer(name) {
    const archived = getArchivedPlayers();
    if (archived.has(name)) {
        archived.delete(name);
    } else {
        archived.add(name);
    }
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(Array.from(archived)));
}