import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('URL:', supabaseUrl);
  console.error('Key:', supabaseAnonKey ? 'Present' : 'Missing');
} else {
  console.log('✅ Supabase client initialized');
  console.log('URL:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * Transition a match to waiting state
 * Called after a match ends to prepare for the next match
 */
export async function transitionToWaiting(matchId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('transition_to_waiting', {
      p_match_id: matchId
    });

    if (error) {
      console.error('Error transitioning to waiting:', error);
      throw error;
    }

    console.log('✅ Match transitioned to waiting state');
  } catch (err) {
    console.error('Failed to transition to waiting:', err);
    throw err;
  }
}

/**
 * Reset match for a new game on the same match ID
 * Increments match version, resets state, and cleans up ephemeral data
 */
export async function resetMatchForNewGame(matchId: string, freshState: any): Promise<void> {
  try {
    const { error } = await supabase.rpc('reset_match_for_new_game', {
      p_match_id: matchId,
      p_fresh_state: freshState
    });

    if (error) {
      console.error('Error resetting match:', error);
      throw error;
    }

    console.log('✅ Match reset for new game');
  } catch (err) {
    console.error('Failed to reset match:', err);
    throw err;
  }
}

/**
 * Get current match version
 */
export async function getMatchVersion(matchId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_match_version', {
      p_match_id: matchId
    });

    if (error) {
      console.error('Error getting match version:', error);
      throw error;
    }

    return data || 1;
  } catch (err) {
    console.error('Failed to get match version:', err);
    return 1;
  }
}
