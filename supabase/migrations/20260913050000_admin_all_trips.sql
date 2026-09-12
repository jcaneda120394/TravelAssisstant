-- Admins can read all trips (including private) and related trip data.

-- Ensure trips admin select remains in place (all rows, not only public)
drop policy if exists "trips_select_admin" on public.trips;
create policy "trips_select_admin"
  on public.trips for select
  using (public.is_admin());

drop policy if exists "trips_update_admin" on public.trips;
create policy "trips_update_admin"
  on public.trips for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "trips_delete_admin" on public.trips;
create policy "trips_delete_admin"
  on public.trips for delete
  using (public.is_admin());

-- Trip-scoped child tables
drop policy if exists "itinerary_select_admin" on public.itinerary_items;
create policy "itinerary_select_admin"
  on public.itinerary_items for select
  using (public.is_admin());

drop policy if exists "trip_members_select_admin" on public.trip_members;
create policy "trip_members_select_admin"
  on public.trip_members for select
  using (public.is_admin());

drop policy if exists "budgets_select_admin" on public.budgets;
create policy "budgets_select_admin"
  on public.budgets for select
  using (public.is_admin());

drop policy if exists "expenses_select_admin" on public.expenses;
create policy "expenses_select_admin"
  on public.expenses for select
  using (public.is_admin());

drop policy if exists "trip_destinations_select_admin" on public.trip_destinations;
create policy "trip_destinations_select_admin"
  on public.trip_destinations for select
  using (public.is_admin());

drop policy if exists "itinerary_days_select_admin" on public.itinerary_days;
create policy "itinerary_days_select_admin"
  on public.itinerary_days for select
  using (public.is_admin());

drop policy if exists "transport_segments_select_admin" on public.transport_segments;
create policy "transport_segments_select_admin"
  on public.transport_segments for select
  using (public.is_admin());

-- trip_accommodations may exist from later migrations
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'trip_accommodations'
  ) then
    execute 'drop policy if exists "trip_accommodations_select_admin" on public.trip_accommodations';
    execute 'create policy "trip_accommodations_select_admin" on public.trip_accommodations for select using (public.is_admin())';
  end if;
end $$;
