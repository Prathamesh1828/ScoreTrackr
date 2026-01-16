import React from 'react';
import { InteractionFeedItem } from '../types';

interface FloatingReactionLayerProps {
  reactions: InteractionFeedItem[];
}

const FloatingReactionLayer: React.FC<FloatingReactionLayerProps> = ({ reactions }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className={`
            absolute transition-opacity duration-300 will-change-transform
            ${reaction.type === 'message'
              ? 'glass px-4 py-2 rounded-2xl text-sm font-bold text-white border border-white/20 shadow-2xl backdrop-blur-md'
              : 'text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]'
            }
          `}
          style={{
            left: `${reaction.x || Math.random() * 80 + 10}%`,
            bottom: '10%',
            animation: 'float-up-enhanced 3.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
          }}
        >
          {reaction.content}
        </div>
      ))}

      <style>{`
        @keyframes float-up-enhanced {
          0% {
            transform: translateY(0) rotate(0deg) scale(0.5);
            opacity: 0;
          }
          15% {
            transform: translateY(-50px) rotate(var(--rot, -10deg)) scale(1.2);
            opacity: 1;
          }
          40% {
            transform: translateY(-150px) rotate(var(--rot-mid, 10deg)) scale(1);
          }
          100% {
            transform: translateY(-800px) rotate(var(--rot-end, -20deg)) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default FloatingReactionLayer;
