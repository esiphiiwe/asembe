-- Asambe subscriptions schema
-- Supports freemium tiers: free, standard, premium, founding

create type subscription_tier as enum ('free', 'standard', 'premium', 'founding');
create type subscription_status as enum ('active', 'cancelled', 'past_due');

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  tier subscription_tier not null default 'free',
  status subscription_status not null default 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_subscriptions_user on subscriptions(user_id);

alter table subscriptions enable row level security;

-- Users can read only their own subscription
create policy "Users can view own subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- No client-side inserts or updates; managed by Edge Functions / triggers only

-- Auto-create a free subscription row whenever a new profile is inserted
create or replace function create_free_subscription()
returns trigger as $$
begin
  insert into subscriptions (user_id, tier, status)
  values (NEW.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on profiles
  for each row
  execute function create_free_subscription();

-- Update updated_at on any subscription change
create or replace function update_subscription_timestamp()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger on_subscription_updated
  before update on subscriptions
  for each row
  execute function update_subscription_timestamp();
