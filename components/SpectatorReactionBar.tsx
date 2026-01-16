import React from 'react';
import { ReactionType } from '../types';
import { REACTION_TYPES, REACTION_EMOJIS } from '../constants/messageTemplates';
import { useSpectatorInteractions } from '../hooks/useSpectatorInteractions';

interface SpectatorReactionBarProps {
    matchId: string;
    isMatchLive: boolean;
}

const SpectatorReactionBar: React.FC<SpectatorReactionBarProps> = ({ matchId, isMatchLive }) => {
    const { sendReaction, canInteract, cooldownRemaining, isLoading } = useSpectatorInteractions();

    const reactions: { type: ReactionType; label: string }[] = [
        { type: REACTION_TYPES.CLAP, label: 'Applaud' },
        { type: REACTION_TYPES.FIRE, label: 'Fire' },
        { type: REACTION_TYPES.SUPPORT, label: 'Support' },
        { type: REACTION_TYPES.WOW, label: 'Wow' },
    ];

    const handleReactionClick = async (reaction: ReactionType) => {
        if (!isMatchLive || !canInteract || isLoading) return;
        await sendReaction(matchId, reaction);
    };

    if (!isMatchLive) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/20 p-4 safe-area-bottom shadow-[0_-15px_40px_rgba(0,0,0,0.6)]">
            <div className="max-w-4xl mx-auto">
                {/* Cooldown indicator */}
                {!canInteract && cooldownRemaining > 0 && (
                    <div className="mb-2 text-center">
                        <div className="inline-block bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1">
                            <span className="text-xs font-bold text-yellow-500">
                                Wait {Math.ceil(cooldownRemaining / 1000)}s before next interaction
                            </span>
                        </div>
                    </div>
                )}

                {/* Reaction buttons */}
                <div className="grid grid-cols-4 gap-3">
                    {reactions.map(({ type, label }) => (
                        <button
                            key={type}
                            onClick={() => handleReactionClick(type)}
                            disabled={!canInteract || isLoading}
                            className={`
                flex flex-col items-center justify-center
                py-4 rounded-2xl
                font-black text-sm
                border-2
                transition-all duration-300
                active:scale-95
                ${canInteract && !isLoading
                                    ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-[#1DB954] hover:text-[#1DB954] hover:scale-105'
                                    : 'bg-white/5 border-white/10 text-gray-600 cursor-not-allowed opacity-50'
                                }
              `}
                            title={label}
                        >
                            <span className="text-3xl mb-1">{REACTION_EMOJIS[type]}</span>
                            <span className="text-[10px] uppercase tracking-wider">{label}</span>
                        </button>
                    ))}
                </div>

                {/* Info text */}
                <div className="mt-3 text-center">
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                        Tap to react • Reactions visible to all spectators
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SpectatorReactionBar;
