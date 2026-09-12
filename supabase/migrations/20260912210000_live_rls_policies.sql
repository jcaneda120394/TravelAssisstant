-- Missing RLS policies for itinerary, members, budgets, AI messages

drop policy if exists "itinerary_via_trip_owner" on public.itinerary_items;
create policy "itinerary_via_trip_owner" on public.itinerary_items
  for all using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid()
    )
  );

drop policy if exists "trip_members_via_trip_owner" on public.trip_members;
create policy "trip_members_via_trip_owner" on public.trip_members
  for all using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid()
    )
  );

drop policy if exists "budgets_via_trip_owner" on public.budgets;
create policy "budgets_via_trip_owner" on public.budgets
  for all using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid()
    )
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
