-- Admin role support for category management

-- Add is_admin flag to profiles
alter table profiles add column is_admin boolean not null default false;

-- Helper function: returns true when the calling user has is_admin = true
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  )
$$;

-- Categories: admins can insert new standalone categories
create policy "Admins can insert categories" on categories
  for insert with check (is_admin());

-- Categories: admins can update (e.g. toggle active status)
create policy "Admins can update categories" on categories
  for update using (is_admin());

-- Other category tracker: admins can update (e.g. mark promoted = true)
create policy "Admins can update tracker" on other_category_tracker
  for update using (is_admin());
