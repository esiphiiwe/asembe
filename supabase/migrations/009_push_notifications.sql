-- Push notification infrastructure
-- Adds push token storage and per-user notification preferences to profiles

-- Push tokens: one row per device per user
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create index idx_push_tokens_user on push_tokens(user_id);

alter table push_tokens enable row level security;

create policy "Users can manage their own push tokens" on push_tokens
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notification preferences on profiles (server-readable by Edge Functions)
alter table profiles
  add column if not exists push_enabled boolean not null default true,
  add column if not exists email_enabled boolean not null default false;
