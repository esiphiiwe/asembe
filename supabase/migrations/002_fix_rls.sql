-- Fix missing RLS policies identified after initial schema

-- matches: allow the activity poster (user1) to insert confirmed matches
-- This is called by respondToRequest when accepting a match request
create policy "Activity poster can insert matches"
  on matches for insert
  with check (auth.uid() = user1_id);

-- matches: allow matched users to update their own match status
-- (e.g. marking as completed/cancelled)
create policy "Matched users can update match status"
  on matches for update
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- other_category_tracker: allow authenticated users to insert via trigger
-- The track_other_category trigger runs as security definer so direct
-- app inserts are not needed, but this covers any direct upserts
create policy "Authenticated users can upsert other category tracker"
  on other_category_tracker for insert
  with check (auth.role() = 'authenticated');
