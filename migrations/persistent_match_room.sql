-- ============================================================================
-- PERSISTENT MATCH ROOM SYSTEM
-- ============================================================================
-- This migration enables reusing the same match ID for consecutive matches
-- Spectators stay connected and automatically transition between matches
--
-- Features:
-- - Match versioning (track consecutive matches on same ID)
-- - Waiting state (between matches)
-- - Match reset functionality (scorer-only)
-- - Automatic cleanup of ephemeral data
--
-- Date: 2026-01-15
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD MATCH VERSIONING
-- ============================================================================

-- Add match_version column to track consecutive matches
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matches' AND column_name = 'match_version'
    ) THEN
        ALTER TABLE matches ADD COLUMN match_version integer DEFAULT 1 NOT NULL;
    END IF;
END $$;

-- Update status constraint to include 'waiting'
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matches ADD CONSTRAINT matches_status_check 
  CHECK (status IN ('live', 'timeout', 'innings_break', 'completed', 'disbanded', 'waiting'));

-- ============================================================================
-- STEP 2: CREATE MATCH RESET FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_match_for_new_game(
  p_match_id uuid,
  p_fresh_state jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increment match version and set to live
  UPDATE matches
  SET 
    status = 'live',
    match_version = match_version + 1,
    updated_at = now()
  WHERE id = p_match_id;
  
  -- Reset match state with fresh data
  UPDATE match_state
  SET 
    data = p_fresh_state,
    updated_at = now()
  WHERE match_id = p_match_id;
  
  -- Cleanup ephemeral data from previous match
  DELETE FROM spectator_messages WHERE match_id = p_match_id;
  DELETE FROM match_reactions WHERE match_id = p_match_id;
  
  -- Note: Auto commentary is client-side only, no DB cleanup needed
END;
$$;

-- ============================================================================
-- STEP 3: CREATE TRANSITION TO WAITING STATE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION transition_to_waiting(
  p_match_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set match to waiting state
  UPDATE matches
  SET 
    status = 'waiting',
    updated_at = now()
  WHERE id = p_match_id;
END;
$$;

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTION TO GET MATCH VERSION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_match_version(
  p_match_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version integer;
BEGIN
  SELECT match_version INTO v_version
  FROM matches
  WHERE id = p_match_id;
  
  RETURN COALESCE(v_version, 1);
END;
$$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if match_version column exists
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'matches' AND column_name = 'match_version';

-- Check if status constraint includes 'waiting'
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'matches_status_check';

-- Test match reset function (example)
-- SELECT reset_match_for_new_game(
--   'your-match-id'::uuid,
--   '{"your": "fresh", "state": "here"}'::jsonb
-- );

-- ============================================================================
-- NOTES
-- ============================================================================
-- - match_version starts at 1 for all existing matches
-- - Spectators automatically see waiting screen when status = 'waiting'
-- - Scorer can call reset_match_for_new_game to start a new match
-- - All ephemeral data (reactions, messages) is cleared on reset
-- - Match ID and PIN remain the same across all versions
-- - Realtime subscriptions continue working across match versions
-- ============================================================================
