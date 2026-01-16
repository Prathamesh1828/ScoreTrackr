import { useState, useEffect, useRef } from 'react';
import { MatchState } from '../types';
import { CommentaryItem, CommentaryType, generateCommentary } from '../commentary';
import { calculateInningsScore } from '../engine';

/**
 * Hook to manage auto commentary for spectators
 * Tracks match events and generates appropriate commentary
 */
export function useAutoCommentary(match: MatchState, isSpectator: boolean) {
    const [commentaries, setCommentaries] = useState<CommentaryItem[]>([]);
    const lastEventRef = useRef<string>('');
    const dotBallCountRef = useRef<number>(0);
    const lastStatusRef = useRef<string>(match.status);
    const lastInningIndexRef = useRef<number>(match.currentInningIndex);

    useEffect(() => {
        // Only generate commentary for spectators
        if (!isSpectator) return;

        const currentInning = match.innings[match.currentInningIndex];
        const events = currentInning.events;

        if (events.length === 0) return;

        const latestEvent = events[events.length - 1];
        const eventKey = `${latestEvent.timestamp}-${latestEvent.runs}-${latestEvent.isWicket}`;

        // Avoid duplicate commentary for the same event
        if (eventKey === lastEventRef.current) return;
        lastEventRef.current = eventKey;

        let commentaryType: CommentaryType | null = null;

        // Check for status changes first
        if (match.status !== lastStatusRef.current) {
            if (match.status === 'timeout') {
                commentaryType = 'TIMEOUT';
            } else if (match.status === 'innings_break') {
                commentaryType = 'INNINGS_BREAK';
            } else if (match.status === 'finished') {
                commentaryType = 'MATCH_END';
            }
            lastStatusRef.current = match.status;
        }
        // Check for innings change
        else if (match.currentInningIndex !== lastInningIndexRef.current) {
            commentaryType = 'INNINGS_BREAK';
            lastInningIndexRef.current = match.currentInningIndex;
        }
        // Ball-by-ball commentary
        else if (latestEvent.type === 'legal' || latestEvent.type === 'wide' || latestEvent.type === 'noball') {
            // Wicket takes priority
            if (latestEvent.isWicket) {
                commentaryType = 'WICKET';
                dotBallCountRef.current = 0;
            }
            // Six
            else if (latestEvent.runs === 6) {
                commentaryType = 'SIX';
                dotBallCountRef.current = 0;
            }
            // Four
            else if (latestEvent.runs === 4) {
                commentaryType = 'FOUR';
                dotBallCountRef.current = 0;
            }
            // Dot ball
            else if (latestEvent.runs === 0 && latestEvent.type === 'legal') {
                dotBallCountRef.current++;

                // Pressure build-up after 3 consecutive dots
                if (dotBallCountRef.current === 3) {
                    commentaryType = 'PRESSURE';
                    dotBallCountRef.current = 0; // Reset after pressure commentary
                } else {
                    // Regular dot ball commentary (20% chance to avoid spam)
                    if (Math.random() < 0.2) {
                        commentaryType = 'DOT';
                    }
                }
            }
            // Any other scoring shot resets dot count
            else if (latestEvent.runs > 0) {
                dotBallCountRef.current = 0;
            }

            // Check if over completed (every 6th legal ball)
            const score = calculateInningsScore(events);
            if (score.legalBalls % 6 === 0 && score.legalBalls > 0 && latestEvent.type === 'legal') {
                // Over end commentary (50% chance, or always if no other commentary)
                if (!commentaryType || Math.random() < 0.5) {
                    commentaryType = 'OVER_END';
                }
            }
        }

        // Generate and add commentary
        if (commentaryType) {
            const newCommentary = generateCommentary(commentaryType);
            setCommentaries(prev => [...prev, newCommentary]);
        }
    }, [match, isSpectator]);

    // Remove completed commentaries
    const removeCommentary = (id: string) => {
        setCommentaries(prev => prev.filter(c => c.id !== id));
    };

    return {
        commentaries,
        removeCommentary
    };
}
