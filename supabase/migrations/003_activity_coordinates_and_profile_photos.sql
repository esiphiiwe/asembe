-- Allow activities to be posted before exact map coordinates are collected
alter table activities
  alter column coordinates drop not null;

-- Public bucket for user profile photos
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "Profile photos are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "Users can upload own profile photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own profile photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own profile photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
