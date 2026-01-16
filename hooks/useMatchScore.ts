import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MatchStateRow } from '../types/match';
import { MatchState } from '../types';

export function useMatchScore(matchId: string | undefined) {
    const [matchState, setMatchState] = useState<MatchState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const subscriptionRef = useRef<any>(null);

    useEffect(() => {
        if (!matchId) return;

        // Fetch initial state
        const fetchState = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('match_state')
                    .select('data')
                    .eq('match_id', matchId)
                    .single();

                if (error) {
                    // If no state exists yet, it might be a fresh match or invalid ID
                    // Check if match exists in 'matches' table to be sure? 
                    // For now, just set error or null.
                    console.error('Error fetching match state:', error);
                    // If it's a "PGRST116" (no rows), we might just wait for realtime or init
                    if (error.code !== 'PGRST116') {
                        setError(error.message);
                    }
                } else if (data) {
                    setMatchState(data.data as MatchState); // supabase returns 'data' column which is jsonb
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchState();

        // Subscribe to realtime changes
        const channel = supabase
            .channel(`match:${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'match_state',
                    filter: `match_id=eq.${matchId}`,
                },
                (payload) => {
                    console.log('Realtime update:', payload);
                    const newState = payload.new as MatchStateRow;
                    setMatchState(newState.data);
                }
            )
            .subscribe();

        subscriptionRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matchId]);

    const updateScore = async (newState: MatchState) => {
        if (!matchId) return;

        // Optimistic update
        setMatchState(newState);

        const { error } = await supabase
            .from('match_state')
            .update({ data: newState, updated_at: new Date().toISOString() })
            .eq('match_id', matchId);

        if (error) {
            console.error('Failed to update score:', error);
            setError(error.message);
            // Revert optimistic update if needed or just let next fetch/realtime fix it
            // But for now, we just log it.
        }
    };

    return { matchState, loading, error, updateScore };
}
