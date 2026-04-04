-- Asambe initial database schema
-- Matches PRD Section 3: Data Model

-- Custom enum types
create type gender_type as enum ('woman', 'man', 'non-binary', 'prefer-not-to-say');
create type skill_level as enum ('beginner', 'intermediate', 'experienced');
create type companion_gender_pref as enum ('any', 'women-only', 'no-preference');
create type activity_status as enum ('open', 'matched', 'closed', 'expired');
create type match_request_status as enum ('pending', 'accepted', 'declined');
create type match_status as enum ('confirmed', 'completed', 'cancelled');

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  gender gender_type not null,
  age integer not null check (age >= 16 and age <= 120),
  profile_photo text,
  bio text check (char_length(bio) <= 160),
  city text not null,
  country text not null,
  verified boolean not null default false,
  trust_score numeric(2,1) not null default 0.0,
  created_at timestamptz not null default now()
);

-- Categories (fixed enum set)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null,
  active boolean not null default true
);

-- Seed default categories
insert into categories (name, icon) values
  ('hiking', '🥾'),
  ('museums', '🏛️'),
  ('concerts', '🎵'),
  ('dining', '🍽️'),
  ('running', '🏃'),
  ('art', '🎨'),
  ('film', '🎬'),
  ('travel', '✈️'),
  ('other', '✨');

-- Tracks custom labels submitted under "other"
create table other_category_tracker (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  count integer not null default 1,
  promoted boolean not null default false,
  created_at timestamptz not null default now()
);

-- Activities
create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id),
  custom_category_label text,
  title text not null,
  description text not null,
  date_time timestamptz,
  recurrence_rule text,
  recurrence_end_date timestamptz,
  neighborhood text not null,
  coordinates jsonb not null,
  city text not null,
  country text not null,
  companion_count integer not null default 1 check (companion_count >= 1 and companion_count <= 4),
  status activity_status not null default 'open',
  created_at timestamptz not null default now()
);

-- Per-user, per-category preferences
create table user_activity_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  category_id uuid not null references categories(id),
  skill_level skill_level not null default 'beginner',
  preferred_companion_gender companion_gender_pref not null default 'any',
  preferred_age_range_min integer not null default 18,
  preferred_age_range_max integer not null default 65,
  unique (user_id, category_id)
);

-- Match requests
create table match_requests (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  status match_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (activity_id, requester_id)
);

-- Confirmed matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  user1_id uuid not null references profiles(id) on delete cascade,
  user2_id uuid not null references profiles(id) on delete cascade,
  status match_status not null default 'confirmed',
  created_at timestamptz not null default now()
);

-- Post-activity reviews
create table reviews (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewee_id uuid not null references profiles(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  flagged boolean not null default false,
  flag_reason text,
  created_at timestamptz not null default now(),
  unique (match_id, reviewer_id)
);

-- Chat messages
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_activities_user on activities(user_id);
create index idx_activities_category on activities(category_id);
create index idx_activities_status on activities(status);
create index idx_activities_city on activities(city);
create index idx_activities_date on activities(date_time);
create index idx_match_requests_activity on match_requests(activity_id);
create index idx_match_requests_requester on match_requests(requester_id);
create index idx_matches_users on matches(user1_id, user2_id);
create index idx_reviews_reviewee on reviews(reviewee_id);
create index idx_chat_messages_match on chat_messages(match_id);

-- Row Level Security policies

alter table profiles enable row level security;
alter table categories enable row level security;
alter table activities enable row level security;
alter table user_activity_preferences enable row level security;
alter table match_requests enable row level security;
alter table matches enable row level security;
alter table reviews enable row level security;
alter table other_category_tracker enable row level security;
alter table chat_messages enable row level security;

-- Profiles: users can read any profile, only update their own
create policy "Profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Categories: readable by all
create policy "Categories are viewable by everyone" on categories for select using (true);

-- Activities: readable by all, only poster can update/delete
create policy "Activities are viewable by everyone" on activities for select using (true);
create policy "Users can insert own activities" on activities for insert with check (auth.uid() = user_id);
create policy "Users can update own activities" on activities for update using (auth.uid() = user_id);
create policy "Users can delete own activities" on activities for delete using (auth.uid() = user_id);

-- Preferences: users manage their own
create policy "Users can view own preferences" on user_activity_preferences for select using (auth.uid() = user_id);
create policy "Users can insert own preferences" on user_activity_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update own preferences" on user_activity_preferences for update using (auth.uid() = user_id);
create policy "Users can delete own preferences" on user_activity_preferences for delete using (auth.uid() = user_id);

-- Match requests: requester and activity poster can see
create policy "Match requests viewable by involved users" on match_requests
  for select using (
    auth.uid() = requester_id
    or auth.uid() in (select user_id from activities where id = activity_id)
  );
create policy "Users can insert match requests" on match_requests
  for insert with check (auth.uid() = requester_id);
create policy "Activity poster can update match requests" on match_requests
  for update using (
    auth.uid() in (select user_id from activities where id = activity_id)
  );

-- Matches: both matched users can see
create policy "Matches viewable by matched users" on matches
  for select using (auth.uid() = user1_id or auth.uid() = user2_id);

-- Reviews: publicly readable (trust scores are visible)
create policy "Reviews are viewable by everyone" on reviews for select using (true);
create policy "Users can insert own reviews" on reviews
  for insert with check (auth.uid() = reviewer_id);

-- Other category tracker: readable by all, insertable by authenticated
create policy "Tracker viewable by everyone" on other_category_tracker for select using (true);

-- Chat messages: only match participants can read/write
create policy "Chat messages viewable by match participants" on chat_messages
  for select using (
    auth.uid() in (
      select user1_id from matches where id = match_id
      union
      select user2_id from matches where id = match_id
    )
  );
create policy "Match participants can send messages" on chat_messages
  for insert with check (
    auth.uid() = sender_id
    and auth.uid() in (
      select user1_id from matches where id = match_id
      union
      select user2_id from matches where id = match_id
    )
  );

-- Function: recalculate trust score after new review
create or replace function recalculate_trust_score()
returns trigger as $$
begin
  update profiles
  set trust_score = (
    select coalesce(round(avg(rating)::numeric, 1), 0)
    from reviews
    where reviewee_id = NEW.reviewee_id
  )
  where id = NEW.reviewee_id;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_review_inserted
  after insert on reviews
  for each row
  execute function recalculate_trust_score();

-- Function: increment other category tracker on activity insert
create or replace function track_other_category()
returns trigger as $$
begin
  if NEW.custom_category_label is not null and NEW.custom_category_label != '' then
    insert into other_category_tracker (label, count)
    values (lower(trim(NEW.custom_category_label)), 1)
    on conflict (label) do update set count = other_category_tracker.count + 1;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_activity_with_other_category
  after insert on activities
  for each row
  execute function track_other_category();
