-- Security hardening: privileged profile columns, disabled-user gate, safer grants
-- Applied after admin_roles / admin_user_management migrations.

-- ---------------------------------------------------------------------------
-- 1) Prevent non-admins from changing role / is_disabled / admin_notes
-- ---------------------------------------------------------------------------
create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  caller_is_admin := public.is_admin();

  if not caller_is_admin then
    if new.role is distinct from old.role then
      raise exception 'Cannot change role'
        using errcode = '42501';
    end if;
    if new.is_disabled is distinct from old.is_disabled then
      raise exception 'Cannot change account status'
        using errcode = '42501';
    end if;
    if new.admin_notes is distinct from old.admin_notes then
      raise exception 'Cannot change admin notes'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged on public.profiles;
create trigger profiles_protect_privileged
  before update on public.profiles
  for each row
  execute function public.protect_privileged_profile_columns();

revoke all on function public.protect_privileged_profile_columns() from public;

-- ---------------------------------------------------------------------------
-- 2) Helper: current user must be authenticated and not disabled
-- ---------------------------------------------------------------------------
create or replace function public.is_active_user()
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
      and p.is_disabled = false
  );
$$;

revoke all on function public.is_active_user() from public;
grant execute on function public.is_active_user() to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Tighten owner policies so disabled accounts lose write access
--    (reads of own profile still allowed so the app can show "disabled")
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id and public.is_active_user())
  with check (auth.uid() = id and public.is_active_user());

drop policy if exists "preferences_update_own" on public.user_preferences;
create policy "preferences_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id and public.is_active_user())
  with check (auth.uid() = user_id and public.is_active_user());

drop policy if exists "preferences_insert_own" on public.user_preferences;
create policy "preferences_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id and public.is_active_user());

drop policy if exists "trips_owner_all" on public.trips;
create policy "trips_owner_all" on public.trips
  for all
  using (auth.uid() = owner_id and public.is_active_user())
  with check (auth.uid() = owner_id and public.is_active_user());

drop policy if exists "saved_places_own" on public.saved_places;
create policy "saved_places_own" on public.saved_places
  for all
  using (auth.uid() = user_id and public.is_active_user())
  with check (auth.uid() = user_id and public.is_active_user());

drop policy if exists "collections_own" on public.favorite_collections;
create policy "collections_own" on public.favorite_collections
  for all
  using (auth.uid() = user_id and public.is_active_user())
  with check (auth.uid() = user_id and public.is_active_user());

drop policy if exists "expenses_own" on public.expenses;
create policy "expenses_own" on public.expenses
  for all
  using (auth.uid() = user_id and public.is_active_user())
  with check (auth.uid() = user_id and public.is_active_user());

drop policy if exists "documents_own" on public.travel_documents;
create policy "documents_own" on public.travel_documents
  for all
  using (auth.uid() = user_id and public.is_active_user())
  with check (auth.uid() = user_id and public.is_active_user());

drop policy if exists "ai_conversations_own" on public.ai_conversations;
create policy "ai_conversations_own" on public.ai_conversations
  for all
  using (auth.uid() = user_id and public.is_active_user())
  with check (auth.uid() = user_id and public.is_active_user());

-- Trip-scoped child tables: owner writes only while active
drop policy if exists "itinerary_via_trip_owner" on public.itinerary_items;
create policy "itinerary_via_trip_owner" on public.itinerary_items
  for all using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid() and public.is_active_user()
    )
  )
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid() and public.is_active_user()
    )
  );

drop policy if exists "trip_members_via_trip_owner" on public.trip_members;
create policy "trip_members_via_trip_owner" on public.trip_members
  for all using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid() and public.is_active_user()
    )
  )
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid() and public.is_active_user()
    )
  );

drop policy if exists "budgets_via_trip_owner" on public.budgets;
create policy "budgets_via_trip_owner" on public.budgets
  for all using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid() and public.is_active_user()
    )
  )
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid() and public.is_active_user()
    )
  );

drop policy if exists "ai_messages_via_owner" on public.ai_messages;
create policy "ai_messages_via_owner" on public.ai_messages
  for all using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid() and public.is_active_user()
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid() and public.is_active_user()
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Column privilege: revoke direct SELECT of admin_notes from authenticated
--    Admins still read via security-definer is_admin() policies + service role
--    Client should select explicit columns (not *). Defense in depth:
--    GRANT SELECT on all columns except admin_notes for authenticated.
-- ---------------------------------------------------------------------------
revoke select on public.profiles from authenticated;
grant select (
  id,
  email,
  full_name,
  avatar_url,
  phone,
  bio,
  onboarding_completed,
  role,
  is_disabled,
  created_at,
  updated_at
) on public.profiles to authenticated;

-- Admins need admin_notes via a definer helper (used by admin service with service/admin JWT)
create or replace function public.admin_get_profile_notes(target_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then (select admin_notes from public.profiles where id = target_id)
    else null
  end;
$$;

revoke all on function public.admin_get_profile_notes(uuid) from public;
grant execute on function public.admin_get_profile_notes(uuid) to authenticated;
