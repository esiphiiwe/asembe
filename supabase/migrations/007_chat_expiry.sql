-- Chat expiry enforcement
-- Matches PRD Brand & Design Principles: "Conversations expire 48hrs after activity
-- unless both users opt to keep open"

-- Add expiry and keep-open columns to matches
alter table matches
  add column chat_expires_at timestamptz,
  add column keep_open_user1 boolean not null default false,
  add column keep_open_user2 boolean not null default false;

-- Trigger function: set chat_expires_at automatically on match creation.
-- Clock starts from activity date_time (when the activity actually happens).
-- Falls back to match creation time for recurring activities with no fixed date_time.
create or replace function set_chat_expiry()
returns trigger as $$
declare
  v_date_time timestamptz;
begin
  select date_time into v_date_time
  from activities
  where id = NEW.activity_id;

  NEW.chat_expires_at := coalesce(v_date_time, NEW.created_at) + interval '48 hours';
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_match_created
  before insert on matches
  for each row
  execute function set_chat_expiry();

-- Update the chat_messages send policy to block writes once the chat has expired,
-- unless both participants have opted to keep it open.
drop policy "Match participants can send messages" on chat_messages;

create policy "Match participants can send messages" on chat_messages
  for insert with check (
    auth.uid() = sender_id
    and auth.uid() in (
      select user1_id from matches where id = match_id
      union
      select user2_id from matches where id = match_id
    )
    and exists (
      select 1 from matches
      where id = match_id
        and (
          chat_expires_at > now()
          or (keep_open_user1 = true and keep_open_user2 = true)
        )
    )
  );
