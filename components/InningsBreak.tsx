import React, { useState, useEffect } from 'react';
import { MatchState, InningsSummary } from '../types';

interface InningsBreakProps {
    match: MatchState;
    firstInningsSummary: InningsSummary;
    onStartNextInnings: () => void;
    isScorer: boolean;
    matchId?: string;
}

const InningsBreak: React.FC<InningsBreakProps> = ({
    match,
    firstInningsSummary,
    onStartNextInnings,
    isScorer,
    matchId
}) => {
    const [countdown, setCountdown] = useState<number | null>(null);

    // Calculate target and required run rate
    const target = firstInningsSummary.totalRuns + 1;
    const requiredRunRate = (target / match.oversPerInnings).toFixed(2);

    // Optional countdown timer
    useEffect(() => {
        if (match.nextInningsStartsAt) {
            const interval = setInterval(() => {
                const remaining = Math.max(0, match.nextInningsStartsAt! - Date.now());
                setCountdown(Math.floor(remaining / 1000));

                if (remaining <= 0) {
                    clearInterval(interval);
                }
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [match.nextInningsStartsAt]);

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0B0F14] to-[#1a1f2e] animate-in fade-in duration-500">
            {/* Header Banner */}
            <div className="sticky top-0 z-50 glass border-b border-white/10 px-4 py-6 shadow-2xl">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-block bg-gradient-to-r from-[#A3FF12] to-[#1DB954] text-black px-8 py-3 rounded-full mb-4 animate-pulse">
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider">⏸️ Innings Break</h1>
                    </div>

                    {countdown !== null && countdown > 0 && (
                        <div className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                            Next innings in {countdown}s
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow max-w-4xl mx-auto w-full p-4 md:p-6 space-y-6">

                {/* First Innings Summary Card */}
                <div className="glass rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-8 w-1.5 bg-[#A3FF12] rounded-full shadow-[0_0_10px_rgba(163,255,18,0.5)]"></div>
                        <h2 className="text-[#A3FF12] font-black text-2xl italic tracking-tighter uppercase">
                            First Innings Summary
                        </h2>
                    </div>

                    {/* Score Display */}
                    <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/5">
                        <div className="text-center">
                            <div className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">
                                {firstInningsSummary.teamName}
                            </div>
                            <div className="flex items-baseline justify-center gap-3">
                                <span className="text-6xl md:text-7xl font-black tabular-nums text-white">
                                    {firstInningsSummary.totalRuns}
                                </span>
                                <span className="text-4xl md:text-5xl font-black text-[#A3FF12]/50">-</span>
                                <span className="text-6xl md:text-7xl font-black tabular-nums text-white">
                                    {firstInningsSummary.totalWickets}
                                </span>
                            </div>
                            <div className="text-gray-500 text-lg font-bold mt-2">
                                ({firstInningsSummary.overs} overs)
                            </div>
                            {firstInningsSummary.extras > 0 && (
                                <div className="text-gray-600 text-sm font-bold mt-1">
                                    Extras: {firstInningsSummary.extras}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Performers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Top Batsman */}
                        {firstInningsSummary.topBatsman && (
                            <div className="bg-gradient-to-br from-[#1DB954]/10 to-transparent rounded-2xl p-5 border border-[#1DB954]/20">
                                <div className="text-[#1DB954] text-xs font-black uppercase tracking-widest mb-3">
                                    🏏 Top Batsman
                                </div>
                                <div className="text-white font-black text-xl mb-1 uppercase">
                                    {firstInningsSummary.topBatsman.name}
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-[#A3FF12]">
                                        {firstInningsSummary.topBatsman.runs}
                                    </span>
                                    <span className="text-gray-500 text-sm font-bold">
                                        ({firstInningsSummary.topBatsman.balls} balls)
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Top Bowler */}
                        {firstInningsSummary.topBowler && (
                            <div className="bg-gradient-to-br from-red-500/10 to-transparent rounded-2xl p-5 border border-red-500/20">
                                <div className="text-red-500 text-xs font-black uppercase tracking-widest mb-3">
                                    🎯 Top Bowler
                                </div>
                                <div className="text-white font-black text-xl mb-1 uppercase">
                                    {firstInningsSummary.topBowler.name}
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-red-500">
                                        {firstInningsSummary.topBowler.wickets}
                                    </span>
                                    <span className="text-gray-500 text-sm font-bold">
                                        wickets ({firstInningsSummary.topBowler.runs} runs)
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Target Card */}
                <div className="glass rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl animate-in slide-in-from-bottom-6 duration-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-8 w-1.5 bg-[#A3FF12] rounded-full shadow-[0_0_10px_rgba(163,255,18,0.5)]"></div>
                        <h2 className="text-[#A3FF12] font-black text-2xl italic tracking-tighter uppercase">
                            Second Innings Target
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center">
                            <div className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">
                                Target
                            </div>
                            <div className="text-5xl font-black text-[#A3FF12]">
                                {target}
                            </div>
                            <div className="text-gray-500 text-sm font-bold mt-1">
                                runs to win
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center">
                            <div className="text-gray-400 text-xs font-black uppercase tracking-widest mb-2">
                                Required Run Rate
                            </div>
                            <div className="text-5xl font-black text-white">
                                {requiredRunRate}
                            </div>
                            <div className="text-gray-500 text-sm font-bold mt-1">
                                runs per over
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scorer Controls */}
                {isScorer && (
                    <div className="glass rounded-3xl p-6 border border-white/10 shadow-2xl animate-in slide-in-from-bottom-8 duration-900">
                        <button
                            onClick={onStartNextInnings}
                            className="w-full bg-[#1DB954] text-black font-black text-xl py-5 rounded-2xl shadow-[0_10px_30px_rgba(29,185,84,0.3)] hover:scale-[1.02] active:scale-95 transition-all uppercase italic tracking-tighter group overflow-hidden relative"
                        >
                            <span className="relative z-10">🚀 Start Second Innings</span>
                            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 skew-x-12"></div>
                        </button>
                    </div>
                )}

                {/* Spectator Message */}
                {!isScorer && (
                    <div className="text-center text-gray-500 text-sm font-bold uppercase tracking-widest animate-pulse">
                        ⏳ Waiting for scorer to start next innings...
                    </div>
                )}
            </div>
        </div>
    );
};

export default InningsBreak;
