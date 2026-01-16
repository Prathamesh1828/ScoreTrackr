# Database Migration Instructions

## Step 1: Apply the Database Schema

You need to apply the spectator interaction schema to your Supabase database.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://boftyftyfwgickkngylj.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `schema_spectator_interactions.sql` in your project
5. Copy the entire contents of the file
6. Paste it into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Verify success - you should see "Success. No rows returned"

### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

Or apply the migration directly:

```bash
supabase db execute --file schema_spectator_interactions.sql
```

## Step 2: Enable Realtime Replication

After creating the tables, you need to enable realtime replication:

1. Go to **Database** → **Replication** in the Supabase dashboard
2. Find the `match_reactions` table in the list
3. Toggle the switch to **enable** replication
4. Find the `spectator_messages` table in the list
5. Toggle the switch to **enable** replication

## Step 3: Verify the Setup

Run this query in the SQL Editor to verify everything is set up correctly:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('match_reactions', 'spectator_messages');

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('match_reactions', 'spectator_messages');

-- Check policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('match_reactions', 'spectator_messages');
```

Expected results:
- 2 tables found
- Both tables have `rowsecurity = true`
- 4 policies total (2 per table: SELECT and INSERT)

## Step 4: Test the Integration

1. Start your dev server: `npm run dev`
2. Create a new match as a scorer
3. Copy the spectator link
4. Open the link in a new browser tab/window
5. As a spectator, try sending reactions and messages
6. Verify they appear in real-time across all spectator views

## Troubleshooting

### Issue: "relation does not exist" error
**Solution**: Make sure you ran the migration SQL in the correct database. Check that you're connected to the right Supabase project.

### Issue: Realtime updates not working
**Solution**: 
1. Verify realtime replication is enabled for both tables
2. Check browser console for WebSocket connection errors
3. Ensure your Supabase project has realtime enabled (it should be by default)

### Issue: "permission denied" when inserting
**Solution**: 
1. Verify RLS policies are created correctly
2. Check that the policies allow public INSERT access
3. Run the verification query above to confirm policies exist

### Issue: Template validation errors
**Solution**: The database constraint only allows specific template keys. Make sure you're using one of:
- `team_support`
- `player_support`
- `big_moment`
- `need_wicket`
- `well_played`

## Next Steps

Once the database is set up and verified:
1. Test the spectator interaction features
2. Monitor the database for any performance issues
3. Consider setting up the cleanup function to run periodically (optional)

To run the cleanup function manually:
```sql
SELECT cleanup_old_interactions();
```

To schedule it (requires pg_cron extension):
```sql
-- Run cleanup every hour
SELECT cron.schedule('cleanup-interactions', '0 * * * *', 'SELECT cleanup_old_interactions()');
```
