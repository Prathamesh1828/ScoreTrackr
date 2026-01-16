import React from 'react';

interface MatchCreatedModalProps {
    matchId: string;
    pin: string;
    onClose: () => void;
}

const MatchCreatedModal: React.FC<MatchCreatedModalProps> = ({ matchId, pin, onClose }) => {
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert(`${label} copied to clipboard!`);
        });
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass rounded-3xl p-8 max-w-md w-full border border-[#1DB954]/20 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-[#1DB954] rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-black text-[#1DB954] mb-2">Match Created!</h2>
                    <p className="text-sm text-gray-400">Save these details to access your match</p>
                </div>

                <div className="space-y-4 mb-6">
                    {/* Match ID */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Match ID</label>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm font-mono text-white bg-black/30 px-3 py-2 rounded-lg overflow-x-auto scrollbar-hide">
                                {matchId}
                            </code>
                            <button
                                onClick={() => copyToClipboard(matchId, 'Match ID')}
                                className="bg-[#1DB954] text-black p-2 rounded-lg hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
                                title="Copy Match ID"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Share this with spectators</p>
                    </div>

                    {/* Scorer PIN */}
                    <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-2xl p-4 border border-red-500/20">
                        <label className="text-xs font-bold text-red-400 uppercase tracking-widest block mb-2">Scorer PIN</label>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-3xl font-black text-[#A3FF12] bg-black/30 px-4 py-3 rounded-lg text-center tracking-widest">
                                {pin}
                            </code>
                            <button
                                onClick={() => copyToClipboard(pin, 'PIN')}
                                className="bg-red-500 text-white p-2 rounded-lg hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
                                title="Copy PIN"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-xs text-red-400 mt-2 font-bold">⚠️ Keep this private! Required for scoring.</p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-[#1DB954] text-black font-black text-lg py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-tight shadow-lg"
                >
                    Start Match
                </button>
            </div>
        </div>
    );
};

export default MatchCreatedModal;
