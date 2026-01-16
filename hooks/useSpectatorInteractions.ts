import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ReactionType, MessageTemplateKey } from '../types';
import { REACTION_EMOJIS, renderMessageTemplate } from '../constants/messageTemplates';

interface UseSpectatorInteractionsReturn {
    sendReaction: (matchId: string, reaction: ReactionType, team?: 'A' | 'B') => Promise<void>;
    sendMessage: (matchId: string, templateKey: MessageTemplateKey, team?: string, player?: string) => Promise<void>;
    canInteract: boolean;
    cooldownRemaining: number;
    isLoading: boolean;
    error: string | null;
}

const COOLDOWN_MS = 5000; // 5 seconds cooldown

/**
 * Custom hook for managing spectator interactions (reactions and messages)
 * Handles cooldown, rate limiting, and Supabase mutations
 */
export function useSpectatorInteractions(): UseSpectatorInteractionsReturn {
    const [lastInteractionTime, setLastInteractionTime] = useState<number>(0);
    const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Check if user can interact (cooldown expired)
    const canInteract = lastInteractionTime === 0 || Date.now() - lastInteractionTime >= COOLDOWN_MS;

    // Use effect to handle the cooldown timer and periodic re-renders

    useEffect(() => {
        if (lastInteractionTime === 0) return;

        const timer = setInterval(() => {
            const now = Date.now();
            const elapsed = now - lastInteractionTime;
            const remaining = Math.max(0, COOLDOWN_MS - elapsed);
            setCooldownRemaining(remaining);

            if (remaining <= 0) {
                clearInterval(timer);
            }
        }, 100);

        return () => clearInterval(timer);
    }, [lastInteractionTime]);

    /**
     * Send an emoji reaction
     */
    const sendReaction = useCallback(async (
        matchId: string,
        reaction: ReactionType,
        team?: 'A' | 'B'
    ): Promise<void> => {
        if (!canInteract) {
            setError('Please wait before sending another interaction');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from('match_reactions')
                .insert({
                    match_id: matchId,
                    reaction,
                    team: team || null,
                });

            if (insertError) {
                throw insertError;
            }

            // Trigger optimistic floating reaction
            const event = new CustomEvent('optimistic-reaction', {
                detail: {
                    type: 'reaction',
                    content: REACTION_EMOJIS[reaction],
                }
            });
            window.dispatchEvent(event);

            // Update last interaction time
            const now = Date.now();
            setLastInteractionTime(now);
        } catch (err: any) {
            console.error('Error sending reaction:', err);
            setError(err.message || 'Failed to send reaction');
        } finally {
            setIsLoading(false);
        }
    }, [canInteract]);

    /**
     * Send a template-based message
     */
    const sendMessage = useCallback(async (
        matchId: string,
        templateKey: MessageTemplateKey,
        team?: string,
        player?: string
    ): Promise<void> => {
        if (!canInteract) {
            setError('Please wait before sending another interaction');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from('spectator_messages')
                .insert({
                    match_id: matchId,
                    template_key: templateKey,
                    team: team || null,
                    player: player || null,
                });

            if (insertError) {
                throw insertError;
            }

            // Trigger optimistic floating message
            const renderedText = renderMessageTemplate(templateKey, { team, player });
            const event = new CustomEvent('optimistic-reaction', {
                detail: {
                    type: 'message',
                    content: renderedText,
                }
            });
            window.dispatchEvent(event);

            // Update last interaction time
            const now = Date.now();
            setLastInteractionTime(now);
        } catch (err: any) {
            console.error('Error sending message:', err);
            setError(err.message || 'Failed to send message');
        } finally {
            setIsLoading(false);
        }
    }, [canInteract]);

    return {
        sendReaction,
        sendMessage,
        canInteract,
        cooldownRemaining,
        isLoading,
        error,
    };
}
