import React, { useState } from 'react';
import { MatchState } from '../types';
import { calculateInningsScore } from '../engine';
import { getMatchAnalytics, getRequiredRunRateColor } from '../analytics';

interface MatchTimeoutProps {
    match: MatchState;
    onResumeMatch: () => void;
    isScorer: boolean;
}

const MatchTimeout: React.FC<MatchTimeoutProps> = ({
    match,
    onResumeMatch,
    isScorer
}) => {
    const [timeElapsed, setTimeElapsed] = useState<number>(0);

    // Calculate elapsed time
    React.useEffect(() => {
        if (!match.timeoutStartedAt) return;

        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - match.timeoutStartedAt!) / 1000);
            setTimeElapsed(elapsed);
        }, 1000);

        return () => clearInterval(interval);
    }, [match.timeoutStartedAt]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0B0F14] to-[#1a1f2e] animate-in fade-in duration-500">
            {/* Header Banner */}
            <div className="sticky top-0 z-50 glass border-b border-white/10 px-4 py-6 shadow-2xl">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-8 py-3 rounded-full mb-4 animate-pulse">
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider">Match Timeout</h1>
                    </div>

                    <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-2">
                        Match Paused
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow max-w-4xl mx-auto w-full p-4 md:p-6 space-y-6 flex flex-col items-center justify-center">

                {/* Timeout Info Card */}
                <div className="glass rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-500 w-full max-w-2xl">
                    <div className="text-center space-y-6">
                        {/* Pause Icon */}
                        <div className="flex justify-center">
                            <div className="w-24 h-24 rounded-full bg-yellow-500/20 border-4 border-yellow-500/40 flex items-center justify-center">
                                <svg className="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                </svg>
                            </div>
                        </div>



                        {/* Timer */}
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                            <div className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">
                                Timeout Duration
                            </div>
                            <div className="text-5xl font-black text-yellow-500 tabular-nums">
                                {formatTime(timeElapsed)}
                            </div>
                        </div>


                        {/* Current Score - Detailed */}
                        <div className="bg-gradient-to-br from-[#1DB954]/10 to-transparent rounded-2xl p-6 border border-[#1DB954]/30">
                            <div className="text-[#1DB954] text-xs font-black uppercase tracking-widest mb-4">
                                Current Match Score
                            </div>

                            {/* Current Innings Score */}
                            <div className="mb-4">
                                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">
                                    {match.innings[match.currentInningIndex].teamName} - {match.currentInningIndex === 0 ? '1st' : '2nd'} Innings
                                </div>
                                <div className="flex items-baseline justify-center gap-3">
                                    <span className="text-5xl md:text-6xl font-black tabular-nums text-white">
                                        {calculateInningsScore(match.innings[match.currentInningIndex].events).totalRuns}
                                    </span>
                                    <span className="text-3xl md:text-4xl font-black text-[#A3FF12]/50">-</span>
                                    <span className="text-5xl md:text-6xl font-black tabular-nums text-white">
                                        {calculateInningsScore(match.innings[match.currentInningIndex].events).totalWickets}
                                    </span>
                                </div>
                                <div className="text-gray-500 text-lg font-bold mt-2">
                                    ({calculateInningsScore(match.innings[match.currentInningIndex].events).overs} overs)
                                </div>
                            </div>

                            {/* First Innings Score (if in 2nd innings) */}
                            {match.currentInningIndex === 1 && (
                                <div className="pt-4 border-t border-white/10">
                                    <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">
                                        {match.innings[0].teamName} - 1st Innings
                                    </div>
                                    <div className="text-gray-400 text-xl font-bold">
                                        {calculateInningsScore(match.innings[0].events).totalRuns}/{calculateInningsScore(match.innings[0].events).totalWickets}
                                        <span className="text-sm ml-2">({calculateInningsScore(match.innings[0].events).overs} ov)</span>
                                    </div>
                                    {match.currentInningIndex === 1 && (
                                        <div className="text-[#A3FF12] text-sm font-bold mt-1">
                                            Target: {calculateInningsScore(match.innings[0].events).totalRuns + 1}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Analytics - RRR & Win Probability (Second Innings Only) */}
                        {match.currentInningIndex === 1 && (() => {
                            const analytics = getMatchAnalytics(match);
                            const rrrColor = getRequiredRunRateColor(analytics.requiredRunRate, analytics.currentRunRate);

                            return analytics.requiredRunRate !== null || analytics.winProbability !== null ? (
                                <div className="bg-gradient-to-br from-[#1DB954]/10 to-transparent rounded-2xl p-4 border border-[#1DB954]/30">
                                    <div className="text-[#1DB954] text-xs font-black uppercase tracking-widest mb-3">
                                        Match Analytics
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Required Run Rate */}
                                        {analytics.requiredRunRate !== null && analytics.runsNeeded && analytics.runsNeeded > 0 && (
                                            <div>
                                                <div className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-1">
                                                    Required Rate
                                                </div>
                                                <div className={`text-3xl font-black tabular-nums ${rrrColor}`}>
                                                    {analytics.requiredRunRate.toFixed(2)}
                                                </div>
                                                <div className="text-gray-600 text-[8px] font-bold mt-1">
                                                    {analytics.runsNeeded} in {analytics.oversRemaining} ov
                                                </div>
                                            </div>
                                        )}

                                        {/* Win Probability */}
                                        {analytics.winProbability !== null && (
                                            <div>
                                                <div className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-1">
                                                    Win Probability
                                                </div>
                                                <div className="text-3xl font-black tabular-nums text-[#A3FF12]">
                                                    {Math.round(analytics.winProbability)}%
                                                </div>
                                                <div className="text-gray-600 text-[8px] font-bold mt-1">
                                                    {analytics.wicketsRemaining} wkts left
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : null;
                        })()}
                    </div>
                </div>

                {/* Scorer Controls */}
                {isScorer && (
                    <div className="glass rounded-3xl p-6 border border-white/10 shadow-2xl animate-in slide-in-from-bottom-6 duration-700 w-full max-w-2xl">
                        <button
                            onClick={onResumeMatch}
                            className="w-full bg-[#1DB954] text-black font-black text-xl py-5 rounded-2xl shadow-[0_10px_30px_rgba(29,185,84,0.3)] hover:scale-[1.02] active:scale-95 transition-all uppercase italic tracking-tighter group overflow-hidden relative"
                        >
                            <span className="relative z-10">Resume Match</span>
                            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 skew-x-12"></div>
                        </button>
                    </div>
                )}

                {/* Spectator Message */}
                {!isScorer && (
                    <div className="text-center space-y-2 animate-pulse">
                        <div className="text-gray-500 text-sm font-bold uppercase tracking-widest">
                            ⏳ Waiting for scorer to resume match...
                        </div>
                        <div className="text-gray-600 text-xs">
                            Play will resume shortly
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchTimeout;
