-- TravelAssistant — complete remaining Supabase setup (idempotent)
-- Run in: https://supabase.com/dashboard/project/viyzvgdvnxhddtobpyys/sql/new
-- Safe to re-run.

-- Ensure RLS is on for all app tables
alter table if exists public.profiles enable row level security;
alter table if exists public.user_preferences enable row level security;
alter table if exists public.trips enable row level security;
alter table if exists public.trip_members enable row level security;
alter table if exists public.itinerary_items enable row level security;
alter table if exists public.saved_places enable row level security;
alter table if exists public.favorite_collections enable row level security;
alter table if exists public.budgets enable row level security;
alter table if exists public.expenses enable row level security;
alter table if exists public.travel_documents enable row level security;
alter table if exists public.ai_conversations enable row level security;
alter table if exists public.ai_messages enable row level security;

-- Trip owner policies (core)
drop policy if exists "trips_owner_all" on public.trips;
create policy "trips_owner_all" on public.trips
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "saved_places_own" on public.saved_places;
create policy "saved_places_own" on public.saved_places
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "collections_own" on public.favorite_collections;
create policy "collections_own" on public.favorite_collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "expenses_own" on public.expenses;
create policy "expenses_own" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "documents_own" on public.travel_documents;
create policy "documents_own" on public.travel_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai_conversations_own" on public.ai_conversations;
create policy "ai_conversations_own" on public.ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Missing policies for trip-scoped + AI messages
drop policy if exists "itinerary_via_trip_owner" on public.itinerary_items;
create policy "itinerary_via_trip_owner" on public.itinerary_items
  for all using (
    exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
  );

drop policy if exists "trip_members_via_trip_owner" on public.trip_members;
create policy "trip_members_via_trip_owner" on public.trip_members
  for all using (
    exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
  );

drop policy if exists "budgets_via_trip_owner" on public.budgets;
create policy "budgets_via_trip_owner" on public.budgets
  for all using (
    exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
  );

drop policy if exists "ai_messages_via_owner" on public.ai_messages;
create policy "ai_messages_via_owner" on public.ai_messages
  for all using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- Profiles / preferences (phase 2) — ensure present
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "preferences_select_own" on public.user_preferences;
create policy "preferences_select_own" on public.user_preferences for select using (auth.uid() = user_id);

drop policy if exists "preferences_insert_own" on public.user_preferences;
create policy "preferences_insert_own" on public.user_preferences for insert with check (auth.uid() = user_id);

drop policy if exists "preferences_update_own" on public.user_preferences;
create policy "preferences_update_own" on public.user_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "preferences_delete_own" on public.user_preferences;
create policy "preferences_delete_own" on public.user_preferences for delete using (auth.uid() = user_id);

-- Grants for authenticated clients
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Done
select 'TravelAssistant Supabase setup policies applied' as status;
