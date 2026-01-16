-- ============================================================================
-- QUICK REFERENCE: Automatic Match Cleanup System
-- ============================================================================

-- ============================================================================
-- SETUP (Run once in Supabase SQL Editor)
-- ============================================================================
-- Copy and run: migrations/automatic_match_cleanup.sql

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if ended_at column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'matches' AND column_name = 'ended_at';

-- Check if trigger exists
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'matches' AND trigger_name = 'trigger_set_match_ended_at';

-- Check if cron job is scheduled
SELECT jobname, schedule, command, active 
FROM cron.job 
WHERE jobname = 'cleanup-old-matches';

-- View matches pending cleanup
SELECT * FROM matches_pending_cleanup;

-- ============================================================================
-- MANUAL OPERATIONS
-- ============================================================================

-- Run cleanup manually (for testing or immediate cleanup)
SELECT * FROM cleanup_old_matches();

-- View cleanup results with logging
SELECT manual_cleanup_old_matches();

-- ============================================================================
-- MONITORING
-- ============================================================================

-- View recent cron job executions
SELECT jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
FROM cron.job_run_details 
WHERE jobname = 'cleanup-old-matches'
ORDER BY start_time DESC
LIMIT 10;

-- Count matches by status
SELECT status, count(*) as count
FROM matches
GROUP BY status
ORDER BY count DESC;

-- View matches that will be cleaned up soon
SELECT id, pin, status, ended_at, time_until_cleanup
FROM matches_pending_cleanup
WHERE eligible_for_cleanup = false
ORDER BY time_until_cleanup ASC
LIMIT 10;

-- View matches ready for cleanup now
SELECT id, pin, status, ended_at
FROM matches_pending_cleanup
WHERE eligible_for_cleanup = true;

-- ============================================================================
-- TESTING
-- ============================================================================

-- Create test completed match
INSERT INTO matches (pin, status, created_by) 
VALUES ('TEST-COMPLETED', 'completed', 'test-user')
RETURNING id, pin, status, ended_at;

-- Create test disbanded match
INSERT INTO matches (pin, status, created_by) 
VALUES ('TEST-DISBANDED', 'disbanded', 'test-user')
RETURNING id, pin, status, ended_at;

-- Manually set ended_at to past (for testing cleanup)
UPDATE matches 
SET ended_at = now() - interval '25 hours'
WHERE pin = 'TEST-COMPLETED';

UPDATE matches 
SET ended_at = now() - interval '2 hours'
WHERE pin = 'TEST-DISBANDED';

-- Run cleanup
SELECT * FROM cleanup_old_matches();

-- Verify deletion
SELECT * FROM matches WHERE pin LIKE 'TEST-%';

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- Find matches with NULL ended_at that should have it
SELECT id, pin, status, created_at, ended_at
FROM matches
WHERE status IN ('completed', 'disbanded') AND ended_at IS NULL;

-- Manually fix NULL ended_at values
UPDATE matches 
SET ended_at = now()
WHERE status IN ('completed', 'disbanded') AND ended_at IS NULL;

-- Check for orphaned child records
SELECT 'match_state' as table_name, count(*) as orphaned_count
FROM match_state ms
LEFT JOIN matches m ON ms.match_id = m.id
WHERE m.id IS NULL
UNION ALL
SELECT 'match_reactions', count(*)
FROM match_reactions mr
LEFT JOIN matches m ON mr.match_id = m.id
WHERE m.id IS NULL
UNION ALL
SELECT 'spectator_messages', count(*)
FROM spectator_messages sm
LEFT JOIN matches m ON sm.match_id = m.id
WHERE m.id IS NULL;

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Disable cleanup (if needed)
SELECT cron.unschedule('cleanup-old-matches');

-- Re-enable cleanup
SELECT cron.schedule(
  'cleanup-old-matches',
  '0 * * * *',
  $$ SELECT cleanup_old_matches(); $$
);

-- Change cleanup schedule (e.g., every 6 hours)
SELECT cron.unschedule('cleanup-old-matches');
SELECT cron.schedule(
  'cleanup-old-matches',
  '0 */6 * * *',  -- Every 6 hours
  $$ SELECT cleanup_old_matches(); $$
);

-- ============================================================================
-- RETENTION POLICY REFERENCE
-- ============================================================================
-- completed matches: 24 hours
-- disbanded matches: 1 hour
-- live matches: never deleted
-- timeout matches: never deleted
-- innings_break matches: never deleted
-- ============================================================================
