
import React, { useState, useCallback, useRef } from 'react';

interface TossProps {
  team1: string;
  team2: string;
  onComplete: (winner: string, decision: 'bat' | 'bowl') => void;
  onBack: () => void;
}

const Toss: React.FC<TossProps> = ({ team1, team2, onComplete, onBack }) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [callerChoice, setCallerChoice] = useState<'Heads' | 'Tails' | null>(null);
  const [flipResult, setFlipResult] = useState<'Heads' | 'Tails' | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [decision, setDecision] = useState<'bat' | 'bowl' | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFlip = () => {
    if (!callerChoice || isFlipping) {
      return;
    }

    setIsFlipping(true);
    setFlipResult(null);
    setWinner(null);

    // Play user-provided coin spin sound
    const audio = new Audio('/coin-spin.mp3');
    audioRef.current = audio;
    audio.play().catch((e) => console.log("Audio play failed (user interactive policy or missing file):", e));

    // After animation duration
    setTimeout(() => {
      // Stop the spinning sound
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const outcome = Math.random() > 0.5 ? 'Heads' : 'Tails';
      setFlipResult(outcome);

      const won = outcome === callerChoice ? team1 : team2;
      setWinner(won);
      setIsFlipping(false);
    }, 2400); // Slightly longer for more "air time"
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#0B0F14] text-[#EAEAEA]">
      <div className="w-full max-w-md glass p-8 rounded-[2.5rem] text-center space-y-10 shadow-2xl border border-white/10 relative overflow-hidden">
        {/* Dynamic Background Glows */}
        <div className={`absolute -top-24 -left-24 w-64 h-64 rounded-full blur-[100px] transition-colors duration-1000 ${isFlipping ? 'bg-[#A3FF12]/20' : 'bg-[#1DB954]/10'}`}></div>
        <div className={`absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-[100px] transition-colors duration-1000 ${isFlipping ? 'bg-[#1DB954]/20' : 'bg-[#A3FF12]/10'}`}></div>

        {/* Back Button */}
        <button
          onClick={onBack}
          disabled={isFlipping}
          className="absolute top-6 left-6 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-0"
          title="Back to Setup"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>

        <div className="space-y-6 relative">
          <h2 className="text-4xl font-bold text-white uppercase tracking-wider">Toss</h2>
        </div>

        {/* Advanced 3D Coin Visual - Always visible, animates on flip, shows result on land */}
        <div className="relative h-64 flex items-center justify-center perspective-2000">
          {/* Shadow beneath the coin */}
          <div className={`absolute bottom-0 w-24 h-4 bg-black/40 rounded-full blur-xl transition-all duration-300 ${isFlipping ? 'scale-150 opacity-20' : 'scale-100 opacity-60'}`}></div>

          <div className={`relative w-40 h-40 transition-transform duration-[2400ms] preserve-3d ${isFlipping ? 'animate-pro-flip' : ''}`}>
            {/* Front Side - Showing Result (or Heads default) */}
            <div className="absolute inset-0 w-40 h-40 bg-gradient-to-br from-[#FFD700] via-[#FFC107] to-[#B8860B] rounded-full flex flex-col items-center justify-center border-[8px] border-[#FFF176]/40 shadow-[inset_0_0_20px_rgba(0,0,0,0.2),0_0_40px_rgba(255,193,7,0.3)] backface-hidden z-10">
              <div className="absolute inset-2 rounded-full border border-white/20"></div>
              {/* If result is Tails, show Tails on Front. Else Heads. */}
              {flipResult === 'Tails' ? (
                <>
                  <span className="text-7xl font-bold text-[#453200] drop-shadow-[0_2px_2px_rgba(255,255,255,0.4)]">T</span>
                  <div className="text-[10px] font-bold text-[#453200]/60 mt-1 uppercase">Tails</div>
                </>
              ) : (
                <>
                  <span className="text-7xl font-bold text-[#453200] drop-shadow-[0_2px_2px_rgba(255,255,255,0.4)]">H</span>
                  <div className="text-[10px] font-bold text-[#453200]/60 mt-1 uppercase">Heads</div>
                </>
              )}
            </div>

            {/* Back Side - Opposite of Result */}
            <div className="absolute inset-0 w-40 h-40 bg-gradient-to-br from-[#F5F5F5] via-[#BDBDBD] to-[#616161] rounded-full flex flex-col items-center justify-center border-[8px] border-white/40 shadow-[inset_0_0_20px_rgba(0,0,0,0.2),0_0_40px_rgba(255,255,255,0.15)] backface-hidden transform rotate-y-180">
              <div className="absolute inset-2 rounded-full border border-black/5"></div>
              {flipResult === 'Tails' ? (
                <>
                  <span className="text-7xl font-bold text-[#212121] drop-shadow-[0_2px_2px_rgba(255,255,255,0.6)]">H</span>
                  <div className="text-[10px] font-bold text-[#212121]/60 mt-1 uppercase">Heads</div>
                </>
              ) : (
                <>
                  <span className="text-7xl font-bold text-[#212121] drop-shadow-[0_2px_2px_rgba(255,255,255,0.6)]">T</span>
                  <div className="text-[10px] font-bold text-[#212121]/60 mt-1 uppercase">Tails</div>
                </>
              )}
            </div>

            {/* Side edge to give depth */}
            <div className="absolute top-0 left-[50%] w-[10px] h-40 bg-[#B8860B] origin-left -translate-x-[5px] rotate-y-90"></div>
          </div>
        </div>

        {!winner && !isFlipping && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-400 uppercase">{team1} to call the outcome</p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setCallerChoice('Heads'); }}
                  className={`group relative py-6 rounded-3xl font-bold transition-all border-2 flex flex-col items-center gap-1 ${callerChoice === 'Heads' ? 'bg-[#A3FF12] text-black border-[#A3FF12] shadow-lg scale-105' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'}`}
                >
                  <span className="text-3xl">HEADS</span>
                  <span className="text-[10px] opacity-50">GOLD SIDE</span>
                  {callerChoice === 'Heads' && <div className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full animate-ping"></div>}
                </button>
                <button
                  onClick={() => { setCallerChoice('Tails'); }}
                  className={`group relative py-6 rounded-3xl font-bold transition-all border-2 flex flex-col items-center gap-1 ${callerChoice === 'Tails' ? 'bg-[#A3FF12] text-black border-[#A3FF12] shadow-lg scale-105' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20'}`}
                >
                  <span className="text-3xl">TAILS</span>
                  <span className="text-[10px] opacity-50">SILVER SIDE</span>
                  {callerChoice === 'Tails' && <div className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full animate-ping"></div>}
                </button>
              </div>
            </div>

            <button
              disabled={!callerChoice}
              onClick={handleFlip}
              className={`w-full font-bold py-5 rounded-[1.5rem] text-xl uppercase transition-all shadow-xl group relative overflow-hidden ${callerChoice ? 'bg-[#1DB954] text-black hover:scale-[1.03] active:scale-95' : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'}`}
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                <svg className={`w-6 h-6 ${isFlipping ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Launch Toss
              </div>
              {callerChoice && <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 skew-x-12"></div>}
            </button>
          </div>
        )}

        {isFlipping && (
          <div className="space-y-6 py-4">
            <div className="flex justify-center gap-2">
              <div className="w-1 h-1 bg-[#A3FF12] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1 h-1 bg-[#A3FF12] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1 h-1 bg-[#A3FF12] rounded-full animate-bounce"></div>
            </div>
            <p className="text-[#A3FF12] font-black italic uppercase tracking-tighter text-2xl animate-pulse">
              The air is tense...
            </p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">{team1} called {callerChoice}</p>
          </div>
        )}

        {winner && !isFlipping && (
          <div className="space-y-8 animate-in zoom-in-95 fade-in slide-in-from-top-4 duration-500 min-h-[300px] flex flex-col justify-center">

            <div className="bg-gradient-to-b from-white/10 to-transparent p-px rounded-[2rem]">
              <div className="bg-[#0B0F14]/90 rounded-[2rem] p-8 space-y-3">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Match Referee Decision</p>

                <h3 className="text-4xl font-bold text-white">
                  {winner} <span className="text-[#A3FF12]">WINS!</span>
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Captain's Selection</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setDecision('bat'); }}
                  className={`group flex flex-col items-center gap-3 py-7 rounded-3xl font-bold border-2 transition-all ${decision === 'bat' ? 'bg-[#1DB954] border-[#1DB954] text-black shadow-lg scale-105' : 'bg-white/5 border-white/10 hover:border-white/30 text-gray-500'}`}
                >
                  <div className={`p-4 rounded-full transition-colors ${decision === 'bat' ? 'bg-black/10' : 'bg-white/5'}`}>
                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.3 4.2 L17.5 2.4 C17.3 2.2 17 2.2 16.8 2.4 L14.5 4.7 L13 3.2 C12.8 3 12.5 3 12.3 3.2 L2.4 13.1 C1.5 14 1.5 15.4 2.4 16.3 L6.7 20.6 C7.6 21.5 9 21.5 9.9 20.6 L19.8 10.7 C20 10.5 20 10.2 19.8 10 L18.3 8.5 L20.6 6.2 C20.8 6 20.8 5.7 20.6 5.5 L19.3 4.2 Z" />
                    </svg>
                  </div>
                  <span className="text-xl">ELECT BAT</span>
                </button>
                <button
                  onClick={() => { setDecision('bowl'); }}
                  className={`group flex flex-col items-center gap-3 py-7 rounded-3xl font-bold border-2 transition-all ${decision === 'bowl' ? 'bg-[#1DB954] border-[#1DB954] text-black shadow-lg scale-105' : 'bg-white/5 border-white/10 hover:border-white/30 text-gray-500'}`}
                >
                  <div className={`p-4 rounded-full transition-colors ${decision === 'bowl' ? 'bg-black/10' : 'bg-white/5'}`}>
                    <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12,2a10,10,0,0,1,0,20" fill="rgba(0,0,0,0.2)" />
                      <path d="M12,2a10,10,0,0,0,0,20" fill="none" />
                      <path d="M7.05 4.05A7 7 0 0 1 16.95 19.95M16.95 4.05A7 7 0 0 0 7.05 19.95" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="text-xl">ELECT BOWL</span>
                </button>
              </div>
            </div>

            {decision && (
              <button
                onClick={() => onComplete(winner, decision)}
                className="w-full bg-white text-black font-bold py-6 rounded-3xl text-2xl uppercase mt-4 shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4"
              >
                Start Match
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .perspective-2000 { perspective: 2000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        
        @keyframes pro-flip {
          0% { transform: rotateY(0) translateY(0) scale(1); filter: blur(0px); }
          15% { transform: rotateY(450deg) translateY(-140px) scale(1.1); filter: blur(1px); }
          50% { transform: rotateY(1440deg) translateY(-220px) scale(1.3); filter: blur(4px); }
          85% { transform: rotateY(2430deg) translateY(-140px) scale(1.1); filter: blur(1px); }
          100% { transform: rotateY(3600deg) translateY(0) scale(1); filter: blur(0px); }
        }
        .animate-pro-flip {
          animation: pro-flip 2.4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }

        .accent-glow {
          box-shadow: 0 0 30px rgba(163, 255, 18, 0.4);
        }
      `}</style>
    </div>
  );
};

export default Toss;
