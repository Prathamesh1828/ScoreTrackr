import React, { useEffect, useState } from 'react';
import { CommentaryItem } from '../commentary';

interface FloatingCommentaryProps {
    commentary: CommentaryItem;
    onComplete: (id: string) => void;
}

const FloatingCommentary: React.FC<FloatingCommentaryProps> = ({ commentary, onComplete }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation
        setTimeout(() => setIsVisible(true), 10);

        // Auto-remove after animation
        const timer = setTimeout(() => {
            onComplete(commentary.id);
        }, 5000); // 5 seconds total (3s visible + 2s fade)

        return () => clearTimeout(timer);
    }, [commentary.id, onComplete]);

    return (
        <div
            className={`fixed left-1/2 -translate-x-1/2 pointer-events-none z-50 transition-all duration-[5000ms] ease-out px-4 ${isVisible ? 'opacity-0 -translate-y-[80px]' : 'opacity-0 translate-y-5'
                }`}
            style={{
                bottom: '120px',
                animation: isVisible ? 'floatFade 5s ease-out forwards' : 'none',
                maxWidth: '90vw'
            }}
        >
            <div className="bg-gradient-to-r from-[#1DB954]/95 to-[#A3FF12]/95 backdrop-blur-md text-black px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-[0_8px_32px_rgba(29,185,84,0.4)] border border-white/20">
                <p className="text-xs sm:text-sm md:text-base font-black uppercase tracking-wide text-center break-words">
                    {commentary.text}
                </p>
            </div>
        </div>
    );
};

export default FloatingCommentary;
