import React, { useState } from 'react';
import { MatchState } from '../types';
import { calculateInningsScore, calculatePlayerOfTheMatch } from '../engine';
import Scorecard from './Scorecard';
import { transitionToWaiting } from '../lib/supabase';

interface ResultProps {
  match: MatchState;
  onReset: () => void;
  matchId?: string;
  isOnlineMatch?: boolean;
  onStartNewMatch?: () => void;
}

const Result: React.FC<ResultProps> = ({ match, onReset, matchId, isOnlineMatch = false, onStartNewMatch }) => {
  const [activeTab, setActiveTab] = useState<0 | 1>(0);

  // Auto-transition to waiting state for online matches (only if scorer is present)
  React.useEffect(() => {
    if (isOnlineMatch && matchId && onStartNewMatch) {
      // Transition to waiting after a short delay to allow everybody to see the result
      const timer = setTimeout(() => {
        transitionToWaiting(matchId).catch(console.error);
      }, 5000); // 5 seconds delay
      return () => clearTimeout(timer);
    }
  }, [isOnlineMatch, matchId, onStartNewMatch]);

  const i1 = calculateInningsScore(match.innings[0].events);
  const i2 = calculateInningsScore(match.innings[1].events);
  const potm = calculatePlayerOfTheMatch(match);

  const isTeam2Winner = i2.totalRuns >= (i1.totalRuns + 1);
  const winnerName = isTeam2Winner ? match.innings[1].teamName : match.innings[0].teamName;

  const margin = isTeam2Winner
    ? `${(match.playersPerTeam - 1) - i2.totalWickets} Wickets`
    : `${i1.totalRuns - i2.totalRuns} Runs`;

  return (
    <div className="flex flex-col min-h-screen bg-[#121212] text-[#EAEAEA] animate-in fade-in duration-700 font-sans">

      {/* Header Match Summary */}
      <div className="text-center py-6 sm:py-8 px-3 sm:px-4 bg-[#1e1e1e] border-b border-white/5 shadow-2xl relative overflow-hidden group">

        <div className="relative z-10 space-y-1 sm:space-y-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#1DB954] uppercase italic tracking-tighter drop-shadow-[0_4px_10px_rgba(29,185,84,0.3)] leading-tight">
            {winnerName} Won
          </h2>
          <p className="text-sm sm:text-base md:text-lg font-black text-gray-400 uppercase tracking-[0.2em] sm:tracking-[0.3em]">{margin}</p>
        </div>

        {potm.name !== "None" && (
          <div className="relative z-10 mt-6 sm:mt-8 animate-in slide-in-from-bottom-6 duration-700 delay-300">
            <div className="inline-block bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-[0_0_50px_rgba(163,255,18,0.1)] hover:scale-105 transition-transform duration-500 max-w-[90vw]">
              <p className="text-[9px] sm:text-[10px] font-black text-[#A3FF12] uppercase tracking-[0.25em] sm:tracking-[0.3em] mb-1 sm:mb-2">Player of the Match</p>
              <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter drop-shadow-lg break-words">
                {potm.name}
              </div>
              <div className="text-xs sm:text-sm font-bold text-gray-400 mt-1 sm:mt-2 uppercase tracking-wide">
                {potm.stats} <span className="text-[#A3FF12]">({potm.points} pts)</span>
              </div>
            </div>
          </div>
        )}

        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#1DB954] to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      </div>

      {/* Inning Tabs */}
      <div className="max-w-3xl mx-auto w-full mt-4 sm:mt-6 md:mt-8 px-3 sm:px-4"> {/* Removed space-y-4 as there's only one child div now */}
        <div className="flex bg-[#1e1e1e] p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab(0)}
            className={`flex-1 py-2 sm:py-3 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest italic transition-all duration-300 relative ${activeTab === 0 ? 'bg-[#A3FF12] text-black shadow-lg scale-[1.02]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
          >
            <span className="block sm:hidden">{match.innings[0].teamName.substring(0, 10)}</span>
            <span className="hidden sm:block">{match.innings[0].teamName}</span>
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`flex-1 py-2 sm:py-3 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest italic transition-all duration-300 relative ${activeTab === 1 ? 'bg-[#A3FF12] text-black shadow-lg scale-[1.02]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
          >
            <span className="block sm:hidden">{match.innings[1].teamName.substring(0, 10)}</span>
            <span className="hidden sm:block">{match.innings[1].teamName}</span>
          </button>
        </div>

        {/* Removed View Toggle (Card vs Timeline) UI */}
      </div>

      {/* Scorecard Content */}
      <div className="max-w-3xl mx-auto w-full p-3 sm:p-4 flex-grow">
        {activeTab === 0 && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Header Stats for Inning 1 */}
            <div className="flex justify-between items-end mb-3 sm:mb-4 px-1 sm:px-2">
              <span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] sm:tracking-[0.2em]">1st Innings</span>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter">{i1.totalRuns}/{i1.totalWickets}</span>
                <span className="text-xs sm:text-sm text-gray-500 font-bold ml-1 sm:ml-2">({i1.overs} ov)</span>
              </div>
            </div>
            <Scorecard
              events={match.innings[0].events}
              teamName={match.innings[0].teamName}
              playersPerTeam={match.playersPerTeam}
            />
          </div>
        )}

        {activeTab === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header Stats for Inning 2 */}
            <div className="flex justify-between items-end mb-3 sm:mb-4 px-1 sm:px-2">
              <span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] sm:tracking-[0.2em]">2nd Innings</span>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black text-white italic tracking-tighter">{i2.totalRuns}/{i2.totalWickets}</span>
                <span className="text-xs sm:text-sm text-gray-500 font-bold ml-1 sm:ml-2">({i2.overs} ov)</span>
              </div>
            </div>
            <Scorecard
              events={match.innings[1].events}
              teamName={match.innings[1].teamName}
              playersPerTeam={match.playersPerTeam}
            />
          </div>
        )}
      </div>

      {/* Footer / Reset */}
      <div className="p-4 sm:p-6 text-center pb-8 sm:pb-12 space-y-4">
        {/* Scorer: Start Next Match button */}
        {onStartNewMatch && (
          <button
            onClick={onStartNewMatch}
            className="bg-[#1DB954] text-black font-black uppercase italic tracking-widest text-xs sm:text-sm px-6 sm:px-10 py-3 sm:py-4 rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(29,185,84,0.4)] hover:shadow-[0_0_50px_rgba(29,185,84,0.6)]"
          >
            Start Next Match
          </button>
        )}

        {/* Offline: Start New Match button */}
        {!isOnlineMatch && !onStartNewMatch && (
          <button
            onClick={onReset}
            className="bg-[#1DB954] text-black font-black uppercase italic tracking-widest text-xs sm:text-sm px-6 sm:px-10 py-3 sm:py-4 rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(29,185,84,0.4)] hover:shadow-[0_0_50px_rgba(29,185,84,0.6)]"
          >
            Start New Match
          </button>
        )}

        {/* Spectator: End Spectate button */}
        {isOnlineMatch && !onStartNewMatch && (
          <button
            onClick={() => window.location.href = '/'}
            className="bg-red-500/20 text-red-400 border border-red-500/30 font-bold uppercase tracking-widest text-xs sm:text-sm px-6 sm:px-10 py-3 sm:py-4 rounded-full hover:scale-105 active:scale-95 transition-all hover:bg-red-500/30"
          >
            End Spectate
          </button>
        )}
      </div>

    </div>
  );
};

export default Result;
