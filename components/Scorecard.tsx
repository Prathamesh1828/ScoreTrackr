import React from 'react';
import { BallEvent } from '../types';
import { calculateInningsScore, getBatsmanStats, getBowlerStats } from '../engine';

interface ScorecardProps {
    events: BallEvent[];
    teamName: string;
    playersPerTeam: number;
    strikerId?: string;
    nonStrikerId?: string;
}

const Scorecard: React.FC<ScorecardProps> = ({ events, teamName, playersPerTeam }) => {
    const { totalRuns, totalWickets, overs, extras, totalExtras } = calculateInningsScore(events);

    // --- Batting Stats ---
    // Identify all batsmen who have appeared on the crease
    const distinctBatsmen = Array.from(new Set(events.map(e => e.strikerId))).filter(Boolean);

    // Also include those who might have only been at non-striker end if not yet faced a ball? 
    // (In gully cricket engine, usually distinct strikerIds cover it, but let's be safe)
    const allParticipatingBatsmen = Array.from(new Set([
        ...events.map(e => e.strikerId),
        ...events.map(e => e.nonStrikerId)
    ])).filter(Boolean);

    // We want to preserve the order of appearance if possible, or usually just list them.
    // Ideally, valid batsmen are those who have stats.
    const activeBatsmenStats = allParticipatingBatsmen.map(name => getBatsmanStats(events, name));

    // Sort: Generally by order of appearance is best, but we don't strictly track batting order index.
    // We can infer order by first appearance in events.
    const firstAppearanceIndex = (name: string) => {
        const idx = events.findIndex(e => e.strikerId === name || e.nonStrikerId === name);
        return idx === -1 ? 9999 : idx;
    };

    activeBatsmenStats.sort((a, b) => firstAppearanceIndex(a.name) - firstAppearanceIndex(b.name));

    // "Yet to bat"
    const yetToBatCount = Math.max(0, playersPerTeam - activeBatsmenStats.length);
    const yetToBatNames = Array.from({ length: yetToBatCount }).map((_, i) => `${teamName} Player ${activeBatsmenStats.length + i + 1}`);

    // --- Fall of Wickets ---
    // A simplified FOW list
    const fowEvents = events.filter(e => e.isWicket);
    const fows = fowEvents.map((e, idx) => {
        // Calculate score at that moment
        const eventIndex = events.indexOf(e);
        const eventsTillThen = events.slice(0, eventIndex + 1);
        const score = calculateInningsScore(eventsTillThen).totalRuns;
        return {
            score,
            wicketIndex: idx + 1,
            batsman: e.dismissalType === 'run-out' ? (e.strikerId || 'Run Out') : e.strikerId, // Simplification
            over: `${e.over}.${e.ballInOver}`
        };
    });


    // --- Bowling Stats ---
    const distinctBowlers = Array.from(new Set(events.map(e => e.bowlerId))).filter(Boolean);
    const bowlersStats = distinctBowlers.map(name => getBowlerStats(events, name));

    return (
        <div className="bg-[#1e1e1e] rounded-lg overflow-hidden text-[#e0e0e0] font-sans text-sm shadow-md border border-white/5">
            {/* Batting Section */}
            <div className="border-b border-gray-700">
                <div className="flex justify-between items-center bg-[#2c2c2c] px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-600">
                    <span className="font-black text-[#A3FF12] uppercase text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] italic">Batting</span>
                    <div className="flex gap-2 sm:gap-4 text-[10px] sm:text-xs font-black text-gray-400 text-center w-32 sm:w-48 uppercase tracking-wider sm:tracking-widest">
                        <span className="w-6 sm:w-8">R</span>
                        <span className="w-6 sm:w-8">B</span>
                        <span className="w-6 sm:w-8">4s</span>
                        <span className="w-6 sm:w-8">6s</span>
                        <span className="w-8 sm:w-10">S/R</span>
                    </div>
                </div>

                {activeBatsmenStats.map((stat, idx) => (
                    <div key={idx} className="flex justify-between items-center px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-800 last:border-b-0 hover:bg-white/5 transition-colors group">
                        <div className="flex flex-col flex-1 min-w-0 pr-2">
                            <span className="font-black text-white uppercase italic tracking-tighter text-sm sm:text-base md:text-lg group-hover:text-[#1DB954] transition-colors truncate">{stat.name}</span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wide sm:tracking-wider">
                                {stat.isOut ? (stat.dismissal || 'OUT') : 'NOT OUT'}
                            </span>
                        </div>
                        <div className="flex gap-2 sm:gap-4 text-center w-32 sm:w-48 font-mono text-xs sm:text-sm items-center flex-shrink-0">
                            <span className="w-6 sm:w-8 font-black text-white text-base sm:text-lg">{stat.runs}</span>
                            <span className="w-6 sm:w-8 text-gray-400 font-bold text-xs sm:text-sm">{stat.balls}</span>
                            <span className="w-6 sm:w-8 text-[#A3FF12] font-bold text-xs sm:text-sm">{stat.fours}</span>
                            <span className="w-6 sm:w-8 text-[#A3FF12] font-bold text-xs sm:text-sm">{stat.sixes}</span>
                            <span className="w-8 sm:w-10 text-gray-500 font-bold text-xs sm:text-sm">{stat.sr.toFixed(0)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Extras & Total */}
            <div className="bg-[#181818] px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-1 sm:gap-0 text-xs">
                <span className="font-black text-gray-500 uppercase tracking-[0.15em] sm:tracking-[0.2em]">Extras</span>
                <span className="font-mono text-white font-bold text-xs sm:text-sm">
                    {totalExtras} <span className="text-gray-600 ml-1 sm:ml-2 text-[10px] sm:text-xs">(W {extras.wide}, NB {extras.noball}, LB {extras.legbye}, B {extras.bye})</span>
                </span>
            </div>

            <div className="bg-[#A3FF12]/5 px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-700 flex justify-between items-center">
                <span className="font-black text-[#1DB954] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-xs sm:text-sm italic">Total Runs</span>
                <span className="font-black text-white text-xl sm:text-2xl italic tracking-tighter">
                    {totalRuns} <span className="text-xs sm:text-sm font-bold text-gray-500 not-italic ml-1">/{totalWickets} ({overs} ov)</span>
                </span>
            </div>

            {/* Yet to Bat */}
            {yetToBatNames.length > 0 && (
                <div className="bg-[#1e1e1e] px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-700 text-xs">
                    <span className="font-bold text-gray-600 block mb-1 uppercase tracking-widest text-[9px] sm:text-[10px]">Did not bat</span>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 text-gray-500 font-bold uppercase text-[9px] sm:text-[10px]">
                        {yetToBatNames.map((name, i) => (
                            <span key={i} className="bg-white/5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md truncate max-w-[120px] sm:max-w-none">{name}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Fall of Wickets */}
            {fows.length > 0 && (
                <div className="bg-[#1e1e1e] px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-700 text-xs">
                    <span className="font-black text-gray-500 block mb-2 uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[9px] sm:text-[10px]">Fall of wickets</span>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        {fows.map((fow, i) => (
                            <div key={i} className="bg-black/40 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/5">
                                <span className="text-[#A3FF12] font-black text-xs sm:text-sm">{fow.score}-{fow.wicketIndex}</span>
                                <span className="text-gray-500 ml-1 sm:ml-1.5 font-bold uppercase text-[9px] sm:text-[10px] tracking-wide">{fow.batsman} ({fow.over})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Bowling Section */}
            <div className="mt-0">
                <div className="flex justify-between items-center bg-[#2c2c2c] px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-600">
                    <span className="font-black text-[#A3FF12] uppercase text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] italic">Bowling</span>
                    <div className="flex gap-2 sm:gap-4 text-[10px] sm:text-xs font-black text-gray-400 text-center w-32 sm:w-48 uppercase tracking-wider sm:tracking-widest">
                        <span className="w-6 sm:w-8">O</span>
                        <span className="w-6 sm:w-8">M</span>
                        <span className="w-6 sm:w-8">R</span>
                        <span className="w-6 sm:w-8">W</span>
                        <span className="w-8 sm:w-10">Econ</span>
                    </div>
                </div>
                {bowlersStats.map((stat, idx) => (
                    <div key={idx} className="flex justify-between items-center px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-800 last:border-b-0 hover:bg-white/5 transition-colors group">
                        <div className="flex flex-col flex-1 min-w-0 pr-2">
                            <span className="font-black text-white uppercase italic tracking-tighter text-sm sm:text-base group-hover:text-[#1DB954] transition-colors truncate">{stat.name}</span>
                        </div>
                        <div className="flex gap-2 sm:gap-4 text-center w-32 sm:w-48 font-mono text-xs sm:text-sm items-center flex-shrink-0">
                            <span className="w-6 sm:w-8 text-gray-300 font-bold text-xs sm:text-sm">{stat.overs}</span>
                            <span className="w-6 sm:w-8 text-gray-500 text-xs sm:text-sm">{stat.maidens}</span>
                            <span className="w-6 sm:w-8 text-gray-300 font-bold text-xs sm:text-sm">{stat.runs}</span>
                            <span className="w-6 sm:w-8 font-black text-[#A3FF12] text-base sm:text-lg">{stat.wickets}</span>
                            <span className="w-8 sm:w-10 text-gray-500 font-bold text-xs sm:text-sm">{stat.economy.toFixed(1)}</span>
                        </div>
                    </div>
                ))}

            </div>

        </div>
    );
};

export default Scorecard;
