-- Safety features: blocks, reports, trusted contacts, women-only activity flag
-- Matches PRD Section 7: Safety Features

-- User blocks
create table user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create index idx_user_blocks_blocker on user_blocks(blocker_id);

alter table user_blocks enable row level security;

create policy "Users can view own blocks" on user_blocks
  for select using (auth.uid() = blocker_id);

create policy "Users can insert own blocks" on user_blocks
  for insert with check (auth.uid() = blocker_id);

create policy "Users can delete own blocks" on user_blocks
  for delete using (auth.uid() = blocker_id);

-- User reports
create table user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  reported_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  context_type text check (context_type in ('match', 'activity')),
  context_id uuid,
  created_at timestamptz not null default now()
);

create index idx_user_reports_reporter on user_reports(reporter_id);
create index idx_user_reports_reported on user_reports(reported_id);

alter table user_reports enable row level security;

create policy "Users can insert own reports" on user_reports
  for insert with check (auth.uid() = reporter_id);

create policy "Users can view own reports" on user_reports
  for select using (auth.uid() = reporter_id);

-- Trusted contacts for activity check-in (up to 3 per user)
create table user_trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  check (phone is not null or email is not null)
);

create index idx_trusted_contacts_user on user_trusted_contacts(user_id);

alter table user_trusted_contacts enable row level security;

create policy "Users can view own trusted contacts" on user_trusted_contacts
  for select using (auth.uid() = user_id);

create policy "Users can insert own trusted contacts" on user_trusted_contacts
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own trusted contacts" on user_trusted_contacts
  for delete using (auth.uid() = user_id);

-- Women-only flag on activities (hard filter: only women can request to join)
alter table activities add column women_only boolean not null default false;
