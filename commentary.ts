/**
 * Auto Commentary System
 * Provides broadcast-grade, rule-based commentary for spectators
 */

export type CommentaryType =
    | 'SIX'
    | 'FOUR'
    | 'DOT'
    | 'WICKET'
    | 'PRESSURE'
    | 'OVER_END'
    | 'TIMEOUT'
    | 'INNINGS_BREAK'
    | 'MATCH_END';

// Commentary pools
const COMMENTARY_POOLS: Record<CommentaryType, string[]> = {
    SIX: [
        "That's a massive six!",
        "Cleared the ropes with ease!",
        "Out of the park!",
        "One swing, six runs!",
        "That flew into the stands!",
        "Maximum! What a hit!",
        "That's gone all the way!",
        "Huge strike, six runs added!",
        "No doubt about that one!",
        "The crowd erupts as it sails over!"
    ],

    FOUR: [
        "Cracking shot for four!",
        "Beautifully timed boundary.",
        "Placed perfectly, that's four.",
        "Finds the gap with precision.",
        "Four runs, no stopping that.",
        "Excellent timing from the batter.",
        "Races away to the boundary.",
        "That's a classy four.",
        "Controlled shot, easy boundary.",
        "Runs coming freely now."
    ],

    DOT: [
        "Dot ball, pressure building.",
        "Good bowling, no run.",
        "Tight line and length.",
        "No scoring opportunity there.",
        "Batters forced to defend.",
        "Another dot, pressure mounts.",
        "Bowler keeps it tight.",
        "Nothing off that delivery.",
        "Runs hard to come by.",
        "Dot ball at an important moment."
    ],

    WICKET: [
        "Wicket! Big breakthrough!",
        "Gone! That's a huge moment.",
        "The batter has to walk back.",
        "That wicket changes the game.",
        "Bowling side strikes at the right time.",
        "A massive wicket falls.",
        "Breakthrough for the bowling team!",
        "That could be a turning point.",
        "The crowd senses a shift here.",
        "Wicket at a crucial stage!"
    ],

    PRESSURE: [
        "Dot balls piling up.",
        "Pressure mounting on the batting side.",
        "Bowler applying serious pressure.",
        "Runs drying up quickly.",
        "The batter is feeling the squeeze.",
        "Momentum slowing down.",
        "This spell is tightening things up.",
        "Bowling side gaining control.",
        "Batting side under pressure now.",
        "Every run is being earned."
    ],

    OVER_END: [
        "That's the end of the over.",
        "Over completed.",
        "Bowler finishes the over.",
        "Another over in the books.",
        "End of a disciplined over.",
        "The over comes to a close.",
        "Time to reset for the next over.",
        "Bowler completes the set.",
        "Over done, pressure maintained.",
        "That wraps up the over."
    ],

    TIMEOUT: [
        "Match paused for a timeout.",
        "A short break in play.",
        "Timeout taken as teams regroup.",
        "Play halted momentarily.",
        "Timeout called on the field.",
        "A brief pause in the action.",
        "Teams take a moment to reset."
    ],

    INNINGS_BREAK: [
        "That's the end of the innings.",
        "Innings complete.",
        "A solid innings comes to an end.",
        "Teams head into the innings break.",
        "Time for a break before the next innings.",
        "The first innings is wrapped up.",
        "That concludes the innings.",
        "All set for the chase after the break."
    ],

    MATCH_END: [
        "That's the end of the match!",
        "What a contest it's been!",
        "Match completed.",
        "The final result is in.",
        "A thrilling finish to the game.",
        "The game comes to a close.",
        "That wraps up a fantastic match.",
        "Full time on a great contest."
    ]
};

// Track last used commentary to avoid immediate repeats
let lastCommentary: Record<CommentaryType, string | null> = {
    SIX: null,
    FOUR: null,
    DOT: null,
    WICKET: null,
    PRESSURE: null,
    OVER_END: null,
    TIMEOUT: null,
    INNINGS_BREAK: null,
    MATCH_END: null
};

/**
 * Get a random commentary from the pool, avoiding immediate repeats
 */
export function getRandomCommentary(type: CommentaryType): string {
    const pool = COMMENTARY_POOLS[type];

    // If pool has only one item, return it
    if (pool.length === 1) return pool[0];

    // Filter out the last used commentary
    const availableComments = pool.filter(comment => comment !== lastCommentary[type]);

    // Pick random from available
    const selected = availableComments[Math.floor(Math.random() * availableComments.length)];

    // Track it
    lastCommentary[type] = selected;

    return selected;
}

/**
 * Reset commentary tracking (useful for new matches)
 */
export function resetCommentaryTracking(): void {
    Object.keys(lastCommentary).forEach(key => {
        lastCommentary[key as CommentaryType] = null;
    });
}

/**
 * Commentary item for display
 */
export interface CommentaryItem {
    id: string;
    text: string;
    type: CommentaryType;
    timestamp: number;
}

/**
 * Generate a commentary item
 */
export function generateCommentary(type: CommentaryType): CommentaryItem {
    return {
        id: `${Date.now()}-${Math.random()}`,
        text: getRandomCommentary(type),
        type,
        timestamp: Date.now()
    };
}
