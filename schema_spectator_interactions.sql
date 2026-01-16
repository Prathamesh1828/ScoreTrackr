-- Spectator Interaction System - Database Schema
-- This migration adds support for emoji reactions and template-based messages

-- ============================================================================
-- MATCH REACTIONS TABLE
-- ============================================================================
-- Stores emoji-based reactions from spectators
create table match_reactions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  reaction text not null check (reaction in ('clap', 'fire', 'support', 'wow')),
  team text check (team in ('A', 'B') or team is null),
  created_at timestamp with time zone default now()
);

-- Index for fast queries by match_id
create index idx_match_reactions_match_id on match_reactions(match_id);
create index idx_match_reactions_created_at on match_reactions(created_at);

-- ============================================================================
-- SPECTATOR MESSAGES TABLE
-- ============================================================================
-- Stores template-based messages from spectators
create table spectator_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  template_key text not null check (
    template_key in (
      'team_support',
      'player_support',
      'big_moment',
      'need_wicket',
      'well_played'
    )
  ),
  team text,
  player text,
  created_at timestamp with time zone default now()
);

-- Index for fast queries by match_id
create index idx_spectator_messages_match_id on spectator_messages(match_id);
create index idx_spectator_messages_created_at on spectator_messages(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
alter table match_reactions enable row level security;
alter table spectator_messages enable row level security;

-- ============================================================================
-- MATCH REACTIONS POLICIES
-- ============================================================================

-- Allow anyone to read reactions (spectators need to see all reactions)
create policy "Public read reactions"
  on match_reactions
  for select
  using (true);

-- Allow anyone to insert reactions (spectators can send reactions)
create policy "Spectator insert reactions"
  on match_reactions
  for insert
  with check (true);

-- No update or delete allowed (reactions are immutable)

-- ============================================================================
-- SPECTATOR MESSAGES POLICIES
-- ============================================================================

-- Allow anyone to read messages (spectators need to see all messages)
create policy "Public read messages"
  on spectator_messages
  for select
  using (true);

-- Allow anyone to insert messages with template validation
-- Template validation is enforced by the CHECK constraint on template_key
create policy "Spectator insert messages"
  on spectator_messages
  for insert
  with check (
    template_key in (
      'team_support',
      'player_support',
      'big_moment',
      'need_wicket',
      'well_played'
    )
  );

-- No update or delete allowed (messages are immutable)

-- ============================================================================
-- CLEANUP FUNCTION (OPTIONAL)
-- ============================================================================
-- Function to clean up old interactions (older than 24 hours)
-- This can be run periodically to prevent database bloat
create or replace function cleanup_old_interactions()
returns void
language plpgsql
security definer
as $$
begin
  delete from match_reactions
  where created_at < now() - interval '24 hours';
  
  delete from spectator_messages
  where created_at < now() - interval '24 hours';
end;
$$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- To apply this migration:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Paste this entire file
-- 3. Click "Run"
-- 4. Verify tables and policies are created in the Table Editor
--
-- To enable Realtime:
-- 1. Go to Database > Replication
-- 2. Enable replication for match_reactions and spectator_messages tables
