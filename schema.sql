-- Create matches table
create table matches (
  id uuid primary key default gen_random_uuid(),
  pin text not null,
  created_by text, -- Can be Supabase Auth UID or anonymous ID
  status text not null default 'live' check (status in ('live', 'completed')),
  created_at timestamp with time zone default now()
);

-- Create match_state table
create table match_state (
  match_id uuid primary key references matches(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table matches enable row level security;
alter table match_state enable row level security;

-- Policies for matches
create policy "Matches are viewable by everyone"
on matches for select
using (true);

create policy "Anyone can create a match"
on matches for insert
with check (true);

-- Policies for match_state
create policy "Match state is viewable by everyone"
on match_state for select
using (true);

-- Allow creating initial match state
create policy "Anyone can create match state"
on match_state for insert
with check (true);

-- Allow updates only if the user is the creator (checks auth.uid()) OR if we implement a PIN check function
-- For now, using the prompt's suggested RLS for 'auth.uid() = created_by'
-- NOTE: This assumes the scorer is authenticated via Supabase Auth (even anonymously).
create policy "Scorer write access"
on match_state
for update
using (
  auth.uid()::text = (
      select created_by from matches
      where matches.id = match_state.match_id
  )
);
