import React, { useEffect, useState } from 'react';
import { InteractionFeedItem } from '../types';
import { useInteractionFeed } from '../hooks/useInteractionFeed';
import FloatingReactionLayer from './FloatingReactionLayer';

interface LiveInteractionFeedProps {
    matchId: string | undefined;
}

const LiveInteractionFeed: React.FC<LiveInteractionFeedProps> = ({ matchId }) => {
    const { feedItems, floatingReactions, isLoading } = useInteractionFeed(matchId);
    const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

    // Track which items are visible for animation
    useEffect(() => {
        const newIds = feedItems.map(item => item.id);
        setVisibleItems(new Set(newIds));
    }, [feedItems]);

    if (!matchId || isLoading) {
        return null;
    }

    return (
        <>
            {/* Global floating reactions layer */}
            <FloatingReactionLayer reactions={floatingReactions} />

            {feedItems.length > 0 && (
                <div className="fixed top-20 right-4 z-40 max-w-xs w-full pointer-events-none">
                    <div className="space-y-2">
                        {feedItems.slice(0, 8).map((item, index) => (
                            <div
                                key={item.id}
                                className={`
                                    glass rounded-2xl px-4 py-3 border border-white/10
                                    shadow-lg
                                    animate-in slide-in-from-right-4 fade-in duration-300
                                    ${index > 0 ? 'opacity-80' : 'opacity-100'}
                                    ${index > 2 ? 'scale-95' : 'scale-100'}
                                    transition-all
                                `}
                                style={{
                                    animationDelay: `${index * 50}ms`,
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    {item.type === 'reaction' ? (
                                        <>
                                            <span className="text-2xl">{item.content}</span>
                                            {item.count && item.count > 1 && (
                                                <span className="text-sm font-black text-[#A3FF12]">
                                                    x{item.count}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 bg-[#1DB954] rounded-full mt-1.5 flex-shrink-0"></div>
                                            <p className="text-sm font-bold text-white leading-tight">
                                                {item.content}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Overflow indicator */}
                    {feedItems.length > 8 && (
                        <div className="mt-2 text-center">
                            <div className="inline-block glass rounded-full px-3 py-1 border border-white/10">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    +{feedItems.length - 8} more
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default LiveInteractionFeed;
