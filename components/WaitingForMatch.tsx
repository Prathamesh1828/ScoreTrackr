import React, { useEffect, useState } from 'react';

interface WaitingForMatchProps {
    matchId?: string;
}

const WaitingForMatch: React.FC<WaitingForMatchProps> = ({ matchId }) => {
    const [dots, setDots] = useState('');

    // Animated dots effect
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#0B0F14] to-[#1a1f2e] animate-in fade-in duration-500">
            {/* Header */}
            <div className="sticky top-0 z-50 glass border-b border-white/10 px-4 py-6 shadow-2xl">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-block bg-gradient-to-r from-gray-600 to-gray-500 text-white px-8 py-3 rounded-full">
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider">
                            🕒 Match Room
                        </h1>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex items-center justify-center p-4 md:p-6">
                <div className="max-w-2xl w-full space-y-8 animate-in slide-in-from-bottom-8 duration-700">

                    {/* Main Message Card */}
                    <div className="glass rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl text-center">
                        {/* Icon */}
                        <div className="mb-6">
                            <div className="inline-block p-6 bg-gradient-to-br from-[#1DB954]/20 to-[#A3FF12]/20 rounded-full animate-pulse">
                                <svg
                                    className="w-16 h-16 md:w-20 md:h-20 text-[#1DB954]"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl md:text-4xl font-black text-white mb-4 uppercase tracking-tight">
                            Waiting for Next Match{dots}
                        </h2>

                        {/* Subtitle */}
                        <p className="text-lg md:text-xl text-gray-400 font-bold mb-8">
                            The scorer will start the match shortly
                        </p>

                        {/* Divider */}
                        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#1DB954] to-transparent mx-auto mb-8"></div>

                        {/* Info */}
                        <div className="space-y-3 text-gray-500 text-sm md:text-base font-bold">
                            <p>✓ You're connected to the match room</p>
                            <p>✓ The match will start automatically</p>
                            <p>✓ No need to refresh this page</p>
                        </div>
                    </div>

                    {/* Match ID Card (if available) */}
                    {matchId && (
                        <div className="glass rounded-2xl p-6 border border-white/10 shadow-lg text-center">
                            <div className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">
                                Match Room ID
                            </div>
                            <div className="text-[#A3FF12] text-xl md:text-2xl font-black font-mono">
                                {matchId.slice(0, 8)}...
                            </div>
                        </div>
                    )}

                    {/* Pulsing Indicator */}
                    <div className="flex justify-center gap-2">
                        <div className="w-3 h-3 bg-[#1DB954] rounded-full animate-pulse"></div>
                        <div className="w-3 h-3 bg-[#1DB954] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-3 h-3 bg-[#1DB954] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                </div>
            </div>

            {/* Footer Note */}
            <div className="p-4 text-center">
                <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">
                    Stay connected • Match starts soon
                </p>
            </div>
        </div>
    );
};

export default WaitingForMatch;
