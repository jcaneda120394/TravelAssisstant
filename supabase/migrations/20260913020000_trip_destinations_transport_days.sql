-- Trip destinations, itinerary day metadata, transport segments between activities

create table if not exists public.trip_destinations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  label text not null,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  sort_order integer not null default 0,
  arrival_day date,
  departure_day date,
  created_at timestamptz not null default now()
);

create table if not exists public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day date not null,
  day_number integer not null default 1,
  title text,
  city text,
  country text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, day)
);

create table if not exists public.transport_segments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day date not null,
  from_item_id uuid references public.itinerary_items (id) on delete set null,
  to_item_id uuid references public.itinerary_items (id) on delete set null,
  status text not null default 'live_data_required'
    check (status in ('pending', 'live_data_required', 'ready', 'failed', 'skipped')),
  summary text,
  mode text,
  duration_seconds integer,
  distance_meters double precision,
  estimated_cost numeric,
  currency text,
  provider text,
  selected_route jsonb,
  alternatives jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_destinations_trip_idx on public.trip_destinations (trip_id, sort_order);
create index if not exists itinerary_days_trip_day_idx on public.itinerary_days (trip_id, day);
create index if not exists transport_segments_trip_day_idx on public.transport_segments (trip_id, day, sort_order);

alter table public.trip_destinations enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.transport_segments enable row level security;

drop policy if exists "trip_destinations_owner_all" on public.trip_destinations;
create policy "trip_destinations_owner_all" on public.trip_destinations
  for all
  using (
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

drop policy if exists "trip_destinations_public_select" on public.trip_destinations;
create policy "trip_destinations_public_select" on public.trip_destinations
  for select
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.is_public = true
    )
  );

drop policy if exists "itinerary_days_owner_all" on public.itinerary_days;
create policy "itinerary_days_owner_all" on public.itinerary_days
  for all
  using (
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

drop policy if exists "itinerary_days_public_select" on public.itinerary_days;
create policy "itinerary_days_public_select" on public.itinerary_days
  for select
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.is_public = true
    )
  );

drop policy if exists "transport_segments_owner_all" on public.transport_segments;
create policy "transport_segments_owner_all" on public.transport_segments
  for all
  using (
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

drop policy if exists "transport_segments_public_select" on public.transport_segments;
create policy "transport_segments_public_select" on public.transport_segments
  for select
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id and t.is_public = true
    )
  );

grant select, insert, update, delete on public.trip_destinations to authenticated;
grant select on public.trip_destinations to anon;
grant select, insert, update, delete on public.itinerary_days to authenticated;
grant select on public.itinerary_days to anon;
grant select, insert, update, delete on public.transport_segments to authenticated;
grant select on public.transport_segments to anon;
