-- Cached third-party travel images (Pexels / Unsplash / Openverse / Wikimedia).
-- Read by the Expo client; written by client cache warm or Edge resolver.

create table if not exists public.place_images (
  id uuid primary key default gen_random_uuid(),
  place_key text not null unique,
  place_name text not null,
  city text,
  country text,
  type text,
  search_query text,
  image_url text not null,
  thumbnail_url text,
  provider text not null,
  provider_image_id text,
  photographer text,
  photographer_url text,
  source_url text,
  license text,
  attribution text,
  width integer,
  height integer,
  alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists place_images_updated_at_idx
  on public.place_images (updated_at desc);

alter table public.place_images enable row level security;

-- Anyone can read cached images (public travel content).
drop policy if exists place_images_public_select on public.place_images;
create policy place_images_public_select
  on public.place_images
  for select
  to anon, authenticated
  using (true);

-- Allow authenticated + anon upsert for cache warming from the app.
-- Rows only store public image URLs / attribution — no secrets.
drop policy if exists place_images_public_upsert on public.place_images;
create policy place_images_public_upsert
  on public.place_images
  for insert
  to anon, authenticated
  with check (
    image_url ~* '^https?://'
    and char_length(place_key) between 2 and 180
  );

drop policy if exists place_images_public_update on public.place_images;
create policy place_images_public_update
  on public.place_images
  for update
  to anon, authenticated
  using (true)
  with check (
    image_url ~* '^https?://'
    and char_length(place_key) between 2 and 180
  );

grant select, insert, update on public.place_images to anon, authenticated;
