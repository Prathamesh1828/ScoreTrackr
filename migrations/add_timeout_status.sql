-- Migration: Add 'timeout' status to matches table
-- Date: 2026-01-15
-- Description: Updates the status constraint to support timeout state

-- Drop existing constraint
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;

-- Add new constraint with 'timeout' status
ALTER TABLE matches ADD CONSTRAINT matches_status_check 
  CHECK (status IN ('live', 'timeout', 'innings_break', 'completed'));

-- Note: The match_state table does not need changes as it stores
-- the full MatchState object as JSONB, which already supports the new status
