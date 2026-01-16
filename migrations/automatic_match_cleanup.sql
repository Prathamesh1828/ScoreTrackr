-- ============================================================================
-- AUTOMATIC MATCH CLEANUP SYSTEM
-- ============================================================================
-- This migration implements automatic cleanup of completed and disbanded matches
-- to maintain a lean database and prevent stale data accumulation.
--
-- Features:
-- - Automatic deletion of completed matches after 24 hours
-- - Automatic deletion of disbanded matches after 1 hour
-- - Cascade deletion of all related data (match_state, reactions, messages)
-- - Scheduled execution via Supabase Cron (hourly)
-- - Safe: Only deletes finished matches, never live or active matches
--
-- Date: 2026-01-15
-- ============================================================================

-- ============================================================================
-- STEP 1: UPDATE MATCHES TABLE SCHEMA
-- ============================================================================
-- Add ended_at column to track when a match was completed/disbanded
-- This is essential for time-based cleanup

-- Add ended_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matches' AND column_name = 'ended_at'
    ) THEN
        ALTER TABLE matches ADD COLUMN ended_at timestamp with time zone;
    END IF;
END $$;

-- Update status constraint to include all possible statuses
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matches ADD CONSTRAINT matches_status_check 
  CHECK (status IN ('live', 'timeout', 'innings_break', 'completed', 'disbanded'));

-- ============================================================================
-- STEP 2: CREATE AUTOMATIC ENDED_AT TRIGGER
-- ============================================================================
-- Automatically set ended_at when match status changes to 'completed' or 'disbanded'

CREATE OR REPLACE FUNCTION set_match_ended_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status changed to completed or disbanded, set ended_at
  IF (NEW.status IN ('completed', 'disbanded')) AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.ended_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_match_ended_at ON matches;
CREATE TRIGGER trigger_set_match_ended_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION set_match_ended_at();

-- ============================================================================
-- STEP 3: VERIFY CASCADE DELETE RULES
-- ============================================================================
-- Ensure all child tables have ON DELETE CASCADE
-- This is already in place from previous migrations, but we verify here

-- match_state already has: references matches(id) on delete cascade
-- match_reactions already has: references matches(id) on delete cascade
-- spectator_messages already has: references matches(id) on delete cascade

-- ============================================================================
-- STEP 4: CREATE CLEANUP FUNCTION
-- ============================================================================
-- Main cleanup function that deletes old matches based on retention policy

CREATE OR REPLACE FUNCTION cleanup_old_matches()
RETURNS TABLE(deleted_count integer, match_type text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  completed_deleted integer;
  disbanded_deleted integer;
BEGIN
  -- Delete completed matches older than 24 hours
  WITH deleted_completed AS (
    DELETE FROM matches
    WHERE status = 'completed' 
      AND ended_at IS NOT NULL 
      AND ended_at < now() - interval '24 hours'
    RETURNING id
  )
  SELECT count(*) INTO completed_deleted FROM deleted_completed;
  
  -- Delete disbanded matches older than 1 hour
  WITH deleted_disbanded AS (
    DELETE FROM matches
    WHERE status = 'disbanded' 
      AND ended_at IS NOT NULL 
      AND ended_at < now() - interval '1 hour'
    RETURNING id
  )
  SELECT count(*) INTO disbanded_deleted FROM deleted_disbanded;
  
  -- Return results
  RETURN QUERY
  SELECT completed_deleted, 'completed'::text
  UNION ALL
  SELECT disbanded_deleted, 'disbanded'::text;
  
  -- Log the cleanup (optional, for monitoring)
  RAISE NOTICE 'Cleanup completed: % completed matches, % disbanded matches deleted', 
    completed_deleted, disbanded_deleted;
END;
$$;

-- ============================================================================
-- STEP 5: CREATE MANUAL CLEANUP HELPER (FOR TESTING)
-- ============================================================================
-- Helper function to manually trigger cleanup (useful for testing)

CREATE OR REPLACE FUNCTION manual_cleanup_old_matches()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  result RECORD;
BEGIN
  FOR result IN SELECT * FROM cleanup_old_matches()
  LOOP
    RAISE NOTICE 'Deleted % % matches', result.deleted_count, result.match_type;
  END LOOP;
END;
$$;

-- ============================================================================
-- STEP 6: SCHEDULE AUTOMATIC CLEANUP WITH CRON
-- ============================================================================
-- Schedule cleanup to run every hour using Supabase Cron
-- Note: pg_cron extension must be enabled in Supabase

-- First, ensure pg_cron extension is available
-- (This is automatically available in Supabase projects)

-- Unschedule existing job if it exists
SELECT cron.unschedule('cleanup-old-matches') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-matches'
);

-- Schedule new cleanup job to run every hour at minute 0
-- Cron format: '0 * * * *' = every hour at minute 0
SELECT cron.schedule(
  'cleanup-old-matches',           -- Job name
  '0 * * * *',                     -- Cron schedule (every hour)
  $$ SELECT cleanup_old_matches(); $$  -- SQL to execute
);

-- ============================================================================
-- STEP 7: CREATE MONITORING VIEW (OPTIONAL)
-- ============================================================================
-- View to monitor matches eligible for cleanup

CREATE OR REPLACE VIEW matches_pending_cleanup AS
SELECT 
  id,
  status,
  created_at,
  ended_at,
  CASE 
    WHEN status = 'completed' THEN now() - ended_at > interval '24 hours'
    WHEN status = 'disbanded' THEN now() - ended_at > interval '1 hour'
    ELSE false
  END as eligible_for_cleanup,
  CASE 
    WHEN status = 'completed' THEN interval '24 hours' - (now() - ended_at)
    WHEN status = 'disbanded' THEN interval '1 hour' - (now() - ended_at)
    ELSE NULL
  END as time_until_cleanup
FROM matches
WHERE status IN ('completed', 'disbanded') AND ended_at IS NOT NULL
ORDER BY ended_at DESC;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify the setup:

-- 1. Check if ended_at column exists
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'matches' AND column_name = 'ended_at';

-- 2. Check if trigger exists
-- SELECT trigger_name FROM information_schema.triggers 
-- WHERE event_object_table = 'matches';

-- 3. Check if cron job is scheduled
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-old-matches';

-- 4. View matches pending cleanup
-- SELECT * FROM matches_pending_cleanup;

-- 5. Manually run cleanup (for testing)
-- SELECT * FROM cleanup_old_matches();

-- ============================================================================
-- TESTING PROCEDURE
-- ============================================================================
-- To test the cleanup system:
--
-- 1. Create a test match and mark it as completed:
--    UPDATE matches SET status = 'completed' WHERE id = 'your-match-id';
--
-- 2. Manually set ended_at to past time (for testing):
--    UPDATE matches SET ended_at = now() - interval '25 hours' 
--    WHERE id = 'your-match-id';
--
-- 3. Run cleanup manually:
--    SELECT * FROM cleanup_old_matches();
--
-- 4. Verify match and related data are deleted:
--    SELECT * FROM matches WHERE id = 'your-match-id';
--    SELECT * FROM match_state WHERE match_id = 'your-match-id';
--    SELECT * FROM match_reactions WHERE match_id = 'your-match-id';
--
-- ============================================================================
-- NOTES
-- ============================================================================
-- - Cleanup runs automatically every hour via Supabase Cron
-- - Only completed/disbanded matches are deleted, never live matches
-- - All related data (match_state, reactions, messages) is auto-deleted via CASCADE
-- - The ended_at timestamp is automatically set when status changes
-- - You can monitor pending cleanups using the matches_pending_cleanup view
-- - For manual testing, use the manual_cleanup_old_matches() function
--
-- ============================================================================
