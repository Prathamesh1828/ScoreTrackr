import { MatchState } from './types';
import { calculateInningsScore } from './engine';

/**
 * Cricket Analytics Utilities
 * Provides real-time match intelligence calculations
 */

export interface MatchAnalytics {
    requiredRunRate: number | null;
    currentRunRate: number;
    winProbability: number | null;
    runsNeeded: number | null;
    ballsRemaining: number | null;
    oversRemaining: string | null;
    wicketsRemaining: number | null;
    target: number | null;
}

/**
 * Calculate Required Run Rate (RRR)
 * Only applicable during second innings when chasing
 */
export function calculateRequiredRunRate(
    runsNeeded: number,
    ballsRemaining: number
): number | null {
    if (ballsRemaining <= 0) return null;
    if (runsNeeded <= 0) return 0;

    const oversRemaining = ballsRemaining / 6;
    return runsNeeded / oversRemaining;
}

/**
 * Calculate Current Run Rate (CRR)
 */
export function calculateCurrentRunRate(
    runs: number,
    ballsBowled: number
): number {
    if (ballsBowled === 0) return 0;

    const oversBowled = ballsBowled / 6;
    return runs / oversBowled;
}

/**
 * Convert balls to overs format (e.g., 27 balls = "4.3")
 */
export function ballsToOvers(balls: number): string {
    const completedOvers = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${completedOvers}.${remainingBalls}`;
}

/**
 * Calculate Win Probability using deterministic rule-based logic
 * Returns a percentage between 5 and 95 (or 0/100 for definite outcomes)
 */
export function calculateWinProbability(
    currentRuns: number,
    currentWickets: number,
    ballsBowled: number,
    target: number,
    totalBalls: number,
    totalWickets: number
): number | null {
    // Not applicable in first innings
    if (target === null || target === 0) return null;

    const runsNeeded = target - currentRuns;
    const ballsRemaining = totalBalls - ballsBowled;
    const wicketsRemaining = totalWickets - currentWickets;

    // Definite outcomes
    if (runsNeeded <= 0) return 100; // Target achieved
    if (wicketsRemaining === 0) return 0; // All out
    if (ballsRemaining === 0) return 0; // Balls exhausted

    // Calculate factors
    const currentRunRate = calculateCurrentRunRate(currentRuns, ballsBowled);
    const requiredRunRate = calculateRequiredRunRate(runsNeeded, ballsRemaining);

    if (requiredRunRate === null) return null;

    // Run rate factor: How well is the batting team scoring relative to requirement?
    // If CRR > RRR, this favors batting team
    const runRateFactor = Math.min(currentRunRate / requiredRunRate, 2); // Cap at 2x

    // Wicket factor: More wickets remaining = better chance
    const wicketFactor = wicketsRemaining / totalWickets;

    // Ball factor: More balls remaining = better chance
    const ballFactor = ballsRemaining / totalBalls;

    // Weighted combination
    // Run rate is most important (50%), wickets (30%), balls (20%)
    const rawProbability = (
        runRateFactor * 0.5 +
        wicketFactor * 0.3 +
        ballFactor * 0.2
    ) * 100;

    // Clamp between 5% and 95% for realistic uncertainty
    return Math.max(5, Math.min(95, rawProbability));
}

/**
 * Get comprehensive match analytics
 * Returns all analytics data needed for display
 */
export function getMatchAnalytics(match: MatchState): MatchAnalytics {
    const currentInning = match.innings[match.currentInningIndex];
    const currentScore = calculateInningsScore(currentInning.events);

    const totalBalls = match.oversPerInnings * 6;
    const ballsBowled = currentScore.legalBalls;
    const ballsRemaining = totalBalls - ballsBowled;

    // Calculate target (only in second innings)
    let target: number | null = null;
    if (match.currentInningIndex === 1) {
        const firstInningsScore = calculateInningsScore(match.innings[0].events);
        target = firstInningsScore.totalRuns + 1;
    }

    const runsNeeded = target ? target - currentScore.totalRuns : null;
    const wicketsRemaining = match.playersPerTeam - 1 - currentScore.totalWickets;

    // Calculate RRR (only in second innings)
    const requiredRunRate = target && ballsRemaining > 0 && runsNeeded && runsNeeded > 0
        ? calculateRequiredRunRate(runsNeeded, ballsRemaining)
        : null;

    // Calculate CRR
    const currentRunRate = calculateCurrentRunRate(currentScore.totalRuns, ballsBowled);

    // Calculate Win Probability (only in second innings)
    const winProbability = target
        ? calculateWinProbability(
            currentScore.totalRuns,
            currentScore.totalWickets,
            ballsBowled,
            target,
            totalBalls,
            match.playersPerTeam - 1
        )
        : null;

    // Format overs remaining
    const oversRemaining = ballsRemaining > 0 ? ballsToOvers(ballsRemaining) : null;

    return {
        requiredRunRate,
        currentRunRate,
        winProbability,
        runsNeeded,
        ballsRemaining,
        oversRemaining,
        wicketsRemaining,
        target
    };
}

/**
 * Get color for win probability display
 */
export function getWinProbabilityColor(probability: number | null): string {
    if (probability === null) return 'text-gray-500';

    if (probability >= 70) return 'text-green-500'; // Batting team favored
    if (probability >= 40) return 'text-yellow-500'; // Balanced
    return 'text-red-500'; // Bowling team favored
}

/**
 * Get color for required run rate display
 */
export function getRequiredRunRateColor(
    rrr: number | null,
    crr: number
): string {
    if (rrr === null) return 'text-gray-500';

    if (crr >= rrr) return 'text-green-500'; // On track or ahead
    if (crr >= rrr * 0.8) return 'text-yellow-500'; // Slightly behind
    return 'text-red-500'; // Significantly behind
}
