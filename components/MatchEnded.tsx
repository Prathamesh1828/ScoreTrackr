import React from 'react';

interface MatchEndedProps {
    onBack: () => void;
}

const MatchEnded: React.FC<MatchEndedProps> = ({ onBack }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-black via-red-950/20 to-black">
            <div className="glass rounded-3xl p-12 max-w-md w-full border border-red-500/20 shadow-2xl text-center">
                <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-500/30">
                    <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>

                <h1 className="text-4xl font-black text-red-500 mb-4 uppercase tracking-tight">Match Ended</h1>
                <p className="text-gray-400 mb-8 text-lg">
                    This match has been completed or disbanded by the scorer.
                </p>

                <button
                    onClick={onBack}
                    className="w-full bg-[#1DB954] text-black font-black text-lg py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-tight shadow-lg"
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
};

export default MatchEnded;
