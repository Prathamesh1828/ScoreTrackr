
import React from 'react';
import { MatchState } from '../types';
import { calculateInningsScore } from '../engine';

interface ResultProps {
  match: MatchState;
  onReset: () => void;
}

const Result: React.FC<ResultProps> = ({ match, onReset }) => {
  const i1 = calculateInningsScore(match.innings[0].events);
  const i2 = calculateInningsScore(match.innings[1].events);

  const isTeam2Winner = i2.totalRuns >= (i1.totalRuns + 1);
  const winnerName = isTeam2Winner ? match.innings[1].teamName : match.innings[0].teamName;

  const margin = isTeam2Winner
    ? `${(match.playersPerTeam - 1) - i2.totalWickets} Wickets`
    : `${i1.totalRuns - i2.totalRuns} Runs`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#0B0F14] text-[#EAEAEA] animate-in fade-in duration-1000">
      <div className="w-full max-w-2xl glass p-8 md:p-12 rounded-[3rem] text-center space-y-12 shadow-[0_0_100px_rgba(29,185,84,0.15)] border border-white/10 relative overflow-hidden">
        {/* Visual Flair */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#1DB954] to-transparent"></div>
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#1DB954]/10 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#A3FF12]/10 rounded-full blur-[100px]"></div>

        <div className="space-y-4 relative">
          <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#1DB954] mb-2 shadow-inner">Match Summary</div>
          <h2 className="text-6xl md:text-8xl font-black text-white uppercase leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <span className="text-[#A3FF12]">{winnerName}</span> <br />
            <span className="text-white">WINS!</span>
          </h2>
          <div className="h-[2px] w-24 bg-[#1DB954] mx-auto my-6"></div>
          <p className="text-2xl font-bold text-gray-400">by {margin}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {/* Innings 1 Card */}
          <div className="glass rounded-[2rem] p-6 border-l-4 border-white/10 bg-white/5 space-y-3 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{match.innings[0].teamName}</span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400">1st Innings</span>
            </div>
            <div className="flex items-baseline gap-2 justify-center">
              <span className="text-5xl font-black tracking-tighter tabular-nums">{i1.totalRuns}</span>
              <span className="text-xl font-bold text-gray-600">/ {i1.totalWickets}</span>
            </div>
            <div className="text-xs font-bold text-gray-500">{i1.overs} Overs Batted</div>
          </div>

          {/* Innings 2 Card */}
          <div className="glass rounded-[2rem] p-6 border-l-4 border-[#A3FF12]/50 bg-white/5 space-y-3 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-[#A3FF12] uppercase tracking-widest italic">{match.innings[1].teamName}</span>
              <span className="text-[10px] bg-[#A3FF12]/10 px-2 py-0.5 rounded text-[#A3FF12]">2nd Innings</span>
            </div>
            <div className="flex items-baseline gap-2 justify-center">
              <span className="text-5xl font-black tracking-tighter tabular-nums">{i2.totalRuns}</span>
              <span className="text-xl font-bold text-gray-600">/ {i2.totalWickets}</span>
            </div>
            <div className="text-xs font-bold text-gray-500">{i2.overs} Overs Batted</div>
          </div>
        </div>

        <div className="pt-8 space-y-4 relative">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Official Final Scored Log Verified</p>
          <button
            onClick={onReset}
            className="group relative w-full bg-white text-black font-bold py-6 rounded-3xl text-2xl uppercase shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all overflow-hidden flex items-center justify-center gap-4"
          >
            <span className="relative z-10">Launch New Match</span>
            <svg className="w-6 h-6 relative z-10 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Result;
