-- Phases 6–17 schema foundations (trips, itinerary, favorites, budget, docs, collab, AI)
-- Apply after Phase 2 migration.

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  destinations text[] not null default '{}',
  adults integer not null default 1,
  children integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  email text not null,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now()
);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day date not null,
  start_time text not null,
  end_time text not null,
  title text not null,
  place_id text,
  place_name text,
  latitude double precision,
  longitude double precision,
  estimated_cost numeric,
  currency text,
  notes text,
  transport_summary text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_json jsonb not null,
  collection_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.favorite_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips (id) on delete cascade,
  total numeric not null,
  currency text not null,
  categories jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric not null,
  currency text not null,
  amount_home numeric not null,
  home_currency text not null,
  category text not null,
  expense_date date not null,
  location text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.travel_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete set null,
  title text not null,
  doc_type text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists trips_owner_id_idx on public.trips (owner_id);
create index if not exists itinerary_items_trip_day_idx on public.itinerary_items (trip_id, day);
create index if not exists expenses_trip_id_idx on public.expenses (trip_id);
create index if not exists saved_places_user_id_idx on public.saved_places (user_id);

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.saved_places enable row level security;
alter table public.favorite_collections enable row level security;
alter table public.budgets enable row level security;
alter table public.expenses enable row level security;
alter table public.travel_documents enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

-- Owner-scoped policies (members/collaboration policies can be refined later)
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
