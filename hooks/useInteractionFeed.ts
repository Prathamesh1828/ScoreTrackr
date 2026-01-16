import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { InteractionFeedItem, MatchReaction, SpectatorMessage } from '../types';
import { getReactionEmoji, renderMessageTemplate } from '../constants/messageTemplates';

const AUTO_EXPIRE_MS = 6000; // 6 seconds
const MAX_FEED_ITEMS = 50; // Maximum items to keep in feed

interface UseInteractionFeedReturn {
    feedItems: InteractionFeedItem[];
    floatingReactions: InteractionFeedItem[];
    isLoading: boolean;
    error: string | null;
}

/**
 * Custom hook for managing the real-time interaction feed
 * Subscribes to reactions and messages, handles aggregation and auto-expiry
 */
export function useInteractionFeed(matchId: string | undefined): UseInteractionFeedReturn {
    const [feedItems, setFeedItems] = useState<InteractionFeedItem[]>([]);
    const [floatingReactions, setFloatingReactions] = useState<InteractionFeedItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const subscriptionSetup = useRef(false);

    // Aggregate reactions by type
    const aggregateReactions = useCallback((items: InteractionFeedItem[]): InteractionFeedItem[] => {
        const reactionMap = new Map<string, InteractionFeedItem>();
        const messages: InteractionFeedItem[] = [];

        items.forEach(item => {
            if (item.type === 'reaction') {
                const existing = reactionMap.get(item.content);
                if (existing) {
                    existing.count = (existing.count || 1) + 1;
                } else {
                    reactionMap.set(item.content, { ...item, count: 1 });
                }
            } else {
                messages.push(item);
            }
        });

        return [...Array.from(reactionMap.values()), ...messages]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, MAX_FEED_ITEMS);
    }, []);

    // Remove expired items
    const removeExpiredItems = useCallback(() => {
        const now = Date.now();
        setFeedItems(prev => {
            const filtered = prev.filter(item => now - item.timestamp < AUTO_EXPIRE_MS);
            return filtered.length !== prev.length ? aggregateReactions(filtered) : prev;
        });

        setFloatingReactions(prev => {
            // Floating reactions fade out faster (e.g., 3 seconds)
            return prev.filter(item => now - item.timestamp < 3000);
        });
    }, [aggregateReactions]);

    // Convert database reaction to feed item
    const reactionToFeedItem = useCallback((reaction: MatchReaction): InteractionFeedItem => {
        return {
            id: reaction.id,
            type: 'reaction',
            content: getReactionEmoji(reaction.reaction),
            timestamp: new Date(reaction.created_at).getTime(),
            x: Math.random() * 80 + 10, // Randomized position (10% to 90%)
        };
    }, []);

    // Convert database message to feed item
    const messageToFeedItem = useCallback((message: SpectatorMessage): InteractionFeedItem => {
        const renderedText = renderMessageTemplate(message.template_key, {
            team: message.team,
            player: message.player,
        });

        return {
            id: message.id,
            type: 'message',
            content: renderedText,
            timestamp: new Date(message.created_at).getTime(),
        };
    }, []);

    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (!matchId) {
            setIsLoading(false);
            return;
        }

        // Prevent duplicate setup in React StrictMode
        if (subscriptionSetup.current) {
            return;
        }
        subscriptionSetup.current = true;

        const setupRealtimeSubscriptions = async () => {
            try {
                console.log('Setting up Realtime for matchId:', matchId);

                // Fetch recent reactions (last 30 seconds)
                const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

                const [reactionsRes, messagesRes] = await Promise.all([
                    supabase
                        .from('match_reactions')
                        .select('*')
                        .eq('match_id', matchId)
                        .gte('created_at', thirtySecondsAgo)
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('spectator_messages')
                        .select('*')
                        .eq('match_id', matchId)
                        .gte('created_at', thirtySecondsAgo)
                        .order('created_at', { ascending: false })
                ]);

                if (reactionsRes.error) throw reactionsRes.error;
                if (messagesRes.error) throw messagesRes.error;

                // Convert to feed items
                const reactionItems = (reactionsRes.data || []).map(reactionToFeedItem);
                const messageItems = (messagesRes.data || []).map(messageToFeedItem);
                const allItems = [...reactionItems, ...messageItems];

                setFeedItems(aggregateReactions(allItems));
                setIsLoading(false);

                // Use a single channel for both types of interactions
                // Removing server-side filter temporarily to troubleshoot sync issues
                const channel = supabase
                    .channel(`match_interactions:${matchId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'match_reactions',
                        },
                        (payload) => {
                            const newReaction = payload.new as MatchReaction;
                            console.log('Realtime Reaction received:', newReaction);

                            // Manual client-side filter (case-insensitive for UUIDs)
                            if (newReaction.match_id?.toLowerCase() !== matchId.toLowerCase()) {
                                console.log(`Ignoring reaction for match ${newReaction.match_id} (current: ${matchId})`);
                                return;
                            }

                            const feedItem = {
                                ...reactionToFeedItem(newReaction),
                                timestamp: Date.now(),
                            };

                            setFeedItems(prev => aggregateReactions([feedItem, ...prev]));
                            setFloatingReactions(prev => {
                                // Prevent duplicate (e.g. if we are the sender and already have an optimistic one)
                                // Note: Optimistic IDs start with 'opt-' so we should check database ID specifically
                                // But since Realtime sends the true UUID, we check if any existing item has this ID.
                                if (prev.some(item => item.id === feedItem.id)) return prev;
                                return [feedItem, ...prev].slice(0, 20);
                            });
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'spectator_messages',
                        },
                        (payload) => {
                            const newMessage = payload.new as SpectatorMessage;
                            console.log('Realtime Message received:', newMessage);

                            // Manual client-side filter (case-insensitive for UUIDs)
                            if (newMessage.match_id?.toLowerCase() !== matchId.toLowerCase()) {
                                console.log(`Ignoring message for match ${newMessage.match_id} (current: ${matchId})`);
                                return;
                            }

                            const feedItem = {
                                ...messageToFeedItem(newMessage),
                                timestamp: Date.now(),
                            };

                            setFeedItems(prev => aggregateReactions([feedItem, ...prev]));
                            setFloatingReactions(prev => {
                                if (prev.some(item => item.id === feedItem.id)) return prev;
                                return [feedItem, ...prev].slice(0, 20);
                            });
                        }
                    )
                    .subscribe((status) => {
                        console.log(`Realtime subscription status for match ${matchId}:`, status);
                        if (status === 'CHANNEL_ERROR') {
                            console.error('Realtime Channel Error. Retrying in 5s...');
                            setTimeout(() => {
                                subscriptionSetup.current = false;
                                // This will trigger re-setup if still mounted
                            }, 5000);
                        }
                    });

                channelRef.current = channel;
            } catch (err: any) {
                console.error('Error in setupRealtimeSubscriptions:', err);
                setError(err.message || 'Failed to load interactions');
                setIsLoading(false);
            }
        };

        setupRealtimeSubscriptions();

        // Set up auto-expiry timer
        const expiryInterval = setInterval(removeExpiredItems, 100);

        return () => {
            subscriptionSetup.current = false;
            clearInterval(expiryInterval);

            if (channelRef.current) {
                console.log('Unsubscribing from channel:', matchId);
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
        };
    }, [matchId, reactionToFeedItem, messageToFeedItem, aggregateReactions, removeExpiredItems]);

    useEffect(() => {
        const handleOptimisticReaction = (e: any) => {
            const { type, content } = e.detail;
            const optimisticItem: InteractionFeedItem = {
                id: `opt-${Date.now()}-${Math.random()}`,
                type,
                content,
                timestamp: Date.now(),
                x: Math.random() * 80 + 10,
                isOptimistic: true,
            };
            setFloatingReactions(prev => [optimisticItem, ...prev].slice(0, 20));
        };

        window.addEventListener('optimistic-reaction', handleOptimisticReaction);
        return () => window.removeEventListener('optimistic-reaction', handleOptimisticReaction);
    }, []);

    return {
        feedItems,
        floatingReactions,
        isLoading,
        error,
    };
}
