-- Veriff verification sessions
-- Audit trail for identity verification attempts.
-- Stores the Veriff session_id → user_id mapping so the webhook
-- Edge Function can find the right profile to update on completion.

create table veriff_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  session_id text not null unique,
  status text not null default 'created'
    check (status in (
      'created',
      'approved',
      'declined',
      'resubmission_requested',
      'expired',
      'abandoned'
    )),
  created_at timestamptz not null default now()
);

create index idx_veriff_sessions_user on veriff_sessions(user_id);
create index idx_veriff_sessions_session on veriff_sessions(session_id);

alter table veriff_sessions enable row level security;

-- Users can view their own verification sessions (e.g. to check status)
create policy "Users can view own veriff sessions" on veriff_sessions
  for select using (auth.uid() = user_id);

-- Users can insert their own sessions (created via the Edge Function which
-- also inserts under the service role — this policy covers direct reads only)
create policy "Users can insert own veriff sessions" on veriff_sessions
  for insert with check (auth.uid() = user_id);

-- Service role bypasses RLS and is used by the webhook Edge Function
-- to look up user_id from session_id and update status.
