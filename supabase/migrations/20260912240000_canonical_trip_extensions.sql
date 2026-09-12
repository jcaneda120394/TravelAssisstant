-- Canonical trip extensions: status, source, open-ended dates, traveler profile snapshot
alter table public.trips
  alter column end_date drop not null;

alter table public.trips
  add column if not exists status text not null default 'planned'
    check (status in ('draft', 'planned', 'active', 'completed', 'cancelled'));

alter table public.trips
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'ai_suggestion', 'template', 'imported'));

alter table public.trips
  add column if not exists open_ended boolean not null default false;

alter table public.trips
  add column if not exists pace text
    check (pace is null or pace in ('relaxed', 'balanced', 'packed'));

alter table public.trips
  add column if not exists travel_style text;

alter table public.trips
  add column if not exists budget_level text
    check (
      budget_level is null
      or budget_level in ('budget', 'mid_range', 'premium', 'luxury')
    );

alter table public.trips
  add column if not exists interests text[] not null default '{}';

alter table public.trips
  add column if not exists transport_preferences text[] not null default '{}';

alter table public.trips
  add column if not exists walking_tolerance text
    check (
      walking_tolerance is null
      or walking_tolerance in ('low', 'medium', 'high')
    );

alter table public.trips
  add column if not exists planning_mode text
    check (
      planning_mode is null
      or planning_mode in ('ai', 'suggestion', 'manual', 'import')
    );

alter table public.trips
  add column if not exists traveler_profile jsonb not null default '{}'::jsonb;

alter table public.trips
  add column if not exists home_currency text not null default 'USD';

-- Activity kind for itinerary items (hotel/meal/attraction/transport/…)
alter table public.itinerary_items
  add column if not exists item_kind text not null default 'custom';

alter table public.itinerary_items
  add column if not exists priority text not null default 'recommended'
    check (priority in ('must_do', 'recommended', 'optional'));

alter table public.itinerary_items
  add column if not exists flexibility text not null default 'flexible'
    check (flexibility in ('fixed', 'flexible'));

alter table public.itinerary_items
  add column if not exists item_status text not null default 'planned'
    check (
      item_status in (
        'planned',
        'confirmed',
        'in_progress',
        'completed',
        'skipped',
        'cancelled'
      )
    );

alter table public.itinerary_items
  add column if not exists data_confidence text not null default 'suggested'
    check (
      data_confidence in ('verified', 'cached', 'suggested', 'live_data_required')
    );

-- Trip accommodations (multi-hotel stays)
create table if not exists public.trip_accommodations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  address text,
  city text,
  check_in date,
  check_out date,
  reservation_number text,
  notes text,
  place_id text,
  latitude double precision,
  longitude double precision,
  estimated_cost numeric,
  currency text default 'USD',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_accommodations_trip_id_idx
  on public.trip_accommodations (trip_id);

alter table public.trip_accommodations enable row level security;

drop policy if exists "trip_accommodations_owner_all" on public.trip_accommodations;
create policy "trip_accommodations_owner_all"
  on public.trip_accommodations
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
