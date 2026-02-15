// js/elo.js

const K_MIN = 20;     // K-Factor for established players (20+ matches)
const K_MAX = 80;    // K-Factor for new players (0 matches)
const TRANSITION_MATCHES = 20; // Matches until K-Factor reaches K_MIN

/**
 * Calculates the Elo rating change for two players based on a match outcome.
 * Uses a dynamic K-factor that decreases as a player plays more matches.
 * @param {number} rating1 - Rating of player 1.
 * @param {number} rating2 - Rating of player 2.
 * @param {number} matches1 - Total matches played by player 1 before this match.
 * @param {number} matches2 - Total matches played by player 2 before this match.
 * @param {number} score1 - Outcome for player 1 (1 for win, 0.5 for draw, 0 for loss).
 * @returns {{change1: number, change2: number}} The rating change for each player.
 */
export function calculateElo(rating1, rating2, matches1, matches2, score1) {
    const k1 = calculateKFactor(matches1);
    const k2 = calculateKFactor(matches2);
    const expected1 = 1 / (1 + 10 ** ((rating2 - rating1) / 400));
    
    const performanceDelta1 = score1 - expected1;
    
    const change1 = Math.round(k1 * performanceDelta1);
    const change2 = Math.round(k2 * -performanceDelta1);
    
    return { change1, change2 };
}


/**
 * Calculates a player's K-Factor, which smoothly decays from K_MAX to K_MIN.
 */
function calculateKFactor(matches) {
    
    // Use the minimum factor for experienced players.
    if (matches >= TRANSITION_MATCHES) {
        return K_MIN;
    }

    // Map matches (0 to 20) onto the range 0 to PI radians.
    const angle = (matches / TRANSITION_MATCHES) * Math.PI;

    // Calculate the scaling factor (starts at 1, smoothly transitions to 0).
    const scalingFactor = (1 + Math.cos(angle)) / 2;
    
    const kFactorDifference = K_MAX - K_MIN; 
    
    // Interpolate K: starting at K_MIN and adding the scaled portion of the difference.
    return K_MIN + (kFactorDifference * scalingFactor);
}