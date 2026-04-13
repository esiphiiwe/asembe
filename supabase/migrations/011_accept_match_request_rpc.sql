-- Atomic match acceptance RPC
-- Replaces the four sequential writes in respondToRequest with a single
-- transaction so a mid-flight failure cannot leave data in an inconsistent state.
-- The function is security invoker (default): it runs under the caller's
-- auth.uid(), which must be the activity poster, satisfying all existing RLS.

create or replace function accept_match_request(
  p_request_id   uuid,
  p_activity_id  uuid,
  p_requester_id uuid
)
returns void
language plpgsql
as $$
declare
  v_poster_id uuid;
begin
  select user_id into v_poster_id
  from activities
  where id = p_activity_id;

  if v_poster_id is null then
    raise exception 'Activity not found';
  end if;

  if auth.uid() != v_poster_id then
    raise exception 'Only the activity poster can accept match requests';
  end if;

  -- 1. Accept the chosen request
  update match_requests
  set status = 'accepted'
  where id = p_request_id;

  -- 2. Create the confirmed match (poster is user1, requester is user2)
  insert into matches (activity_id, user1_id, user2_id, status)
  values (p_activity_id, v_poster_id, p_requester_id, 'confirmed');

  -- 3. Mark the activity as matched
  update activities
  set status = 'matched'
  where id = p_activity_id;

  -- 4. Decline all remaining pending requests for this activity
  update match_requests
  set status = 'declined'
  where activity_id = p_activity_id
    and status = 'pending'
    and id != p_request_id;
end;
$$;
