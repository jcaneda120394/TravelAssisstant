-- Admin can edit profiles + preferences; richer profile detail fields.

alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists bio text;

alter table public.profiles
  add column if not exists admin_notes text;

-- Admins can read / write any traveler preferences
drop policy if exists "preferences_select_admin" on public.user_preferences;
create policy "preferences_select_admin"
  on public.user_preferences for select
  using (public.is_admin());

drop policy if exists "preferences_update_admin" on public.user_preferences;
create policy "preferences_update_admin"
  on public.user_preferences for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "preferences_insert_admin" on public.user_preferences;
create policy "preferences_insert_admin"
  on public.user_preferences for insert
  with check (public.is_admin());
