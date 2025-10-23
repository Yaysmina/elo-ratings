// js/config.js

export const STORAGE_KEY = 'elo_tracker_game_data_v3';

// New: Define multiple starting ELO levels
export const STARTING_ELO = {
    BEGINNER: 600,
    INTERMEDIATE: 800,
    ADVANCED: 1000,
};

// Use the intermediate value as the default/fallback for old data
export const INITIAL_RATING = STARTING_ELO.INTERMEDIATE; 

export const RANKING_MIN_MATCHES = 4; // Min matches to appear in rankings