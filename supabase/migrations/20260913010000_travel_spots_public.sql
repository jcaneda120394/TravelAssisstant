-- Travel Spots: check-ins, public reviews/photos, public trips, storage

alter table public.trips
  add column if not exists is_public boolean not null default false;

alter table public.trips
  add column if not exists public_summary text;

create table if not exists public.place_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id text not null,
  place_name text not null,
  latitude double precision,
  longitude double precision,
  place_json jsonb not null default '{}'::jsonb,
  visited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create table if not exists public.place_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id text not null,
  place_name text not null,
  latitude double precision,
  longitude double precision,
  place_json jsonb not null default '{}'::jsonb,
  rating smallint not null check (rating >= 1 and rating <= 5),
  body text not null default '',
  trip_id uuid references public.trips (id) on delete set null,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  place_id text not null,
  place_name text not null,
  review_id uuid references public.place_reviews (id) on delete set null,
  storage_path text not null,
  public_url text not null,
  caption text not null default '',
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists place_checkins_user_place_idx on public.place_checkins (user_id, place_id);
create index if not exists place_reviews_place_public_idx on public.place_reviews (place_id, created_at desc)
  where is_public = true;
create index if not exists place_photos_place_public_idx on public.place_photos (place_id, created_at desc)
  where is_public = true;
create index if not exists trips_is_public_idx on public.trips (is_public, updated_at desc)
  where is_public = true;

-- Visited = check-in OR past itinerary day for that place
create or replace function public.user_has_visited_place(p_place_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.place_checkins c
        where c.user_id = auth.uid()
          and c.place_id = p_place_id
      )
      or exists (
        select 1
        from public.itinerary_items i
        join public.trips t on t.id = i.trip_id
        where t.owner_id = auth.uid()
          and i.place_id = p_place_id
          and i.day <= (timezone('utc', now()))::date
      )
    );
$$;

revoke all on function public.user_has_visited_place(text) from public;
grant execute on function public.user_has_visited_place(text) to authenticated;

alter table public.place_checkins enable row level security;
alter table public.place_reviews enable row level security;
alter table public.place_photos enable row level security;

drop policy if exists "place_checkins_own" on public.place_checkins;
create policy "place_checkins_own" on public.place_checkins
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "place_reviews_public_select" on public.place_reviews;
create policy "place_reviews_public_select" on public.place_reviews
  for select
  using (is_public = true or auth.uid() = user_id);

drop policy if exists "place_reviews_own_insert" on public.place_reviews;
create policy "place_reviews_own_insert" on public.place_reviews
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "place_reviews_own_update" on public.place_reviews;
create policy "place_reviews_own_update" on public.place_reviews
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "place_reviews_own_delete" on public.place_reviews;
create policy "place_reviews_own_delete" on public.place_reviews
  for delete
  using (auth.uid() = user_id);

drop policy if exists "place_photos_public_select" on public.place_photos;
create policy "place_photos_public_select" on public.place_photos
  for select
  using (is_public = true or auth.uid() = user_id);

drop policy if exists "place_photos_own_insert" on public.place_photos;
create policy "place_photos_own_insert" on public.place_photos
  for insert
  with check (
    auth.uid() = user_id
    and public.user_has_visited_place(place_id)
  );

drop policy if exists "place_photos_own_update" on public.place_photos;
create policy "place_photos_own_update" on public.place_photos
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "place_photos_own_delete" on public.place_photos;
create policy "place_photos_own_delete" on public.place_photos
  for delete
  using (auth.uid() = user_id);

-- Public trips readable by guests; owners keep full access via trips_owner_all
drop policy if exists "trips_public_select" on public.trips;
create policy "trips_public_select" on public.trips
  for select
  using (is_public = true);

-- Public itinerary for published trips (read-only for guests)
drop policy if exists "itinerary_public_select" on public.itinerary_items;
create policy "itinerary_public_select" on public.itinerary_items
  for select
  using (
    exists (
      select 1
      from public.trips t
      where t.id = trip_id
        and t.is_public = true
    )
  );

grant select, insert, update, delete on public.place_checkins to authenticated;
grant select on public.place_reviews to anon, authenticated;
grant insert, update, delete on public.place_reviews to authenticated;
grant select on public.place_photos to anon, authenticated;
grant insert, update, delete on public.place_photos to authenticated;
grant select on public.trips to anon, authenticated;
grant select on public.itinerary_items to anon, authenticated;

-- Storage: public read, authenticated upload under own user folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'place-media',
  'place-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "place_media_public_read" on storage.objects;
create policy "place_media_public_read" on storage.objects
  for select
  using (bucket_id = 'place-media');

drop policy if exists "place_media_auth_upload" on storage.objects;
create policy "place_media_auth_upload" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'place-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "place_media_auth_update" on storage.objects;
create policy "place_media_auth_update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'place-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'place-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "place_media_auth_delete" on storage.objects;
create policy "place_media_auth_delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'place-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
