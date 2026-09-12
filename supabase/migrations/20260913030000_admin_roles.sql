-- Admin roles for TravelAssistant dashboard
-- Promote operators with: update public.profiles set role = 'admin' where email = '...';

alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

alter table public.profiles
  add column if not exists is_disabled boolean not null default false;

create index if not exists profiles_role_idx on public.profiles (role);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.is_disabled = false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Admins can read all profiles
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

-- Admins can update roles / disable flags (not mass-delete accounts)
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Travel Guide moderation
drop policy if exists "place_reviews_select_admin" on public.place_reviews;
create policy "place_reviews_select_admin"
  on public.place_reviews for select
  using (public.is_admin());

drop policy if exists "place_reviews_update_admin" on public.place_reviews;
create policy "place_reviews_update_admin"
  on public.place_reviews for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "place_reviews_delete_admin" on public.place_reviews;
create policy "place_reviews_delete_admin"
  on public.place_reviews for delete
  using (public.is_admin());

drop policy if exists "place_photos_select_admin" on public.place_photos;
create policy "place_photos_select_admin"
  on public.place_photos for select
  using (public.is_admin());

drop policy if exists "place_photos_update_admin" on public.place_photos;
create policy "place_photos_update_admin"
  on public.place_photos for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "place_photos_delete_admin" on public.place_photos;
create policy "place_photos_delete_admin"
  on public.place_photos for delete
  using (public.is_admin());

-- Admins can count / list public trips
drop policy if exists "trips_select_admin" on public.trips;
create policy "trips_select_admin"
  on public.trips for select
  using (public.is_admin());
