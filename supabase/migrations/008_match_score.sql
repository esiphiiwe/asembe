-- Match scoring
-- Matches PRD Section 4: Matching Logic
-- Score is calculated at request time and stored for ranking pending requests.

alter table match_requests
  add column score numeric(5,4);

-- Composite index so pending requests for an activity are returned pre-sorted by score.
create index idx_match_requests_score
  on match_requests(activity_id, score desc nulls last);
