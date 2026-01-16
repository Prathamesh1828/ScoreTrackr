
import React, { useState } from 'react';
import { createMatch } from '../lib/match';
import MatchCreatedModal from './MatchCreatedModal';

interface SetupProps {
  onStart: (team1: string, team2: string, overs: number, players: number, matchId?: string, pin?: string) => void;
  onJoin: () => void;
  isResetting?: boolean;
}

const Setup: React.FC<SetupProps> = ({ onStart, onJoin, isResetting = false }) => {
  const [team1, setTeam1] = useState('Team A');
  const [team2, setTeam2] = useState('Team B');
  const [overs, setOvers] = useState<number | string>(4);
  const [players, setPlayers] = useState<number | string>(11);
  const [isCreating, setIsCreating] = useState(false);
  const [createdMatch, setCreatedMatch] = useState<{ matchId: string; pin: string } | null>(null);

  const handleStart = async () => {
    // If resetting a persistent match, skip creation and modal
    if (isResetting) {
      onStart(team1, team2, Number(overs) || 5, Number(players) || 11);
      return;
    }

    try {
      setIsCreating(true);
      const { matchId, pin } = await createMatch(
        team1,
        team2,
        Number(overs) || 5,
        Number(players) || 11
      );
      console.log('Match created successfully, showing modal');
      // Show modal instead of alert
      setCreatedMatch({ matchId, pin });
    } catch (err: any) {
      console.error('Failed to create match:', err);
      alert('Failed to create match: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleModalClose = () => {
    if (createdMatch) {
      onStart(team1, team2, Number(overs) || 5, Number(players) || 11, createdMatch.matchId, createdMatch.pin);
      setCreatedMatch(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-md glass p-8 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#1DB954]/10 rounded-full blur-[80px]"></div>

        <h1 className="text-4xl font-bold text-center mb-10 text-[#1DB954]">
          {isResetting ? 'Next Match Setup' : 'ScoreTrackr'}
        </h1>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Team A</label>
              <input
                type="text"
                value={team1}
                onChange={(e) => setTeam1(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-lg font-bold focus:outline-none focus:border-[#1DB954] transition-all placeholder-gray-700"
                placeholder="Team 1 Name"
              />
            </div>

            <div className="relative flex items-center justify-center py-6">
              <div className="absolute w-full border-t border-white/5"></div>
              <div className="relative bg-[#0B0F14] px-4">
                <div className="bg-[#1DB954]/10 border border-[#1DB954]/30 px-3 py-1 rounded-full">
                  <span className="text-[12px] font-black text-[#1DB954] italic tracking-tighter uppercase">Versus</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Team B</label>
              <input
                type="text"
                value={team2}
                onChange={(e) => setTeam2(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-lg font-bold focus:outline-none focus:border-[#1DB954] transition-all placeholder-gray-700"
                placeholder="Team 2 Name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Overs</label>
              <input
                type="number"
                value={overs}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setOvers('');
                  } else {
                    const num = parseInt(val);
                    if (!isNaN(num) && num > 0) setOvers(num);
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-[#1DB954] transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Team Size</label>
              <input
                type="number"
                value={players}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setPlayers('');
                  } else {
                    const num = parseInt(val);
                    if (!isNaN(num) && num > 0) setPlayers(num);
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-[#1DB954] transition-all"
              />
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={isCreating}
            className="w-full bg-[#1DB954] text-black font-black text-xl py-5 rounded-2xl shadow-[0_10px_30px_rgba(29,185,84,0.3)] hover:scale-[1.02] active:scale-95 transition-all uppercase italic tracking-tighter mt-6 group overflow-hidden relative disabled:opacity-50"
          >
            <span className="relative z-10">{isCreating ? 'Creating Match...' : (isResetting ? 'Start Next Match' : 'Create Match')}</span>
            {!isCreating && <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 skew-x-12"></div>}
          </button>

          {!isResetting && (
            <>
              <div className="relative flex items-center justify-center py-2">
                <div className="absolute w-full border-t border-white/5"></div>
                <span className="relative bg-[#0B0F14] px-2 text-xs text-gray-500 uppercase">OR</span>
              </div>

              <button
                onClick={onJoin}
                className="w-full bg-white/5 text-white font-bold text-sm py-4 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest border border-white/10"
              >
                Join Existing Match
              </button>
            </>
          )}
        </div>
      </div>

      {/* Match Created Modal */}
      {createdMatch && (
        <MatchCreatedModal
          matchId={createdMatch.matchId}
          pin={createdMatch.pin}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Setup;
