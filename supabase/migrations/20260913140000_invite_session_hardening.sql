-- Invite tokens + expiry/revocation; member trip read access; accept/revoke RPCs

create extension if not exists pgcrypto with schema extensions;

alter table public.trip_members drop constraint if exists trip_members_status_check;
alter table public.trip_members
  add constraint trip_members_status_check
  check (status in ('pending', 'accepted', 'revoked'));

alter table public.trip_members
  add column if not exists invite_token text,
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists invited_by uuid references public.profiles (id) on delete set null;

update public.trip_members
set
  invite_token = coalesce(invite_token, encode(extensions.gen_random_bytes(32), 'hex')),
  expires_at = coalesce(expires_at, now() + interval '14 days')
where status = 'pending'
  and (invite_token is null or expires_at is null);

create unique index if not exists trip_members_invite_token_uidx
  on public.trip_members (invite_token)
  where invite_token is not null;

create index if not exists trip_members_trip_user_idx
  on public.trip_members (trip_id, user_id);

create or replace function public.trip_members_set_invite_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'owner' then
    new.status := coalesce(nullif(new.status, ''), 'accepted');
    new.invite_token := null;
    new.expires_at := null;
    return new;
  end if;

  if new.status = 'pending' then
    if new.invite_token is null or length(new.invite_token) < 32 then
      new.invite_token := encode(extensions.gen_random_bytes(32), 'hex');
    end if;
    if new.expires_at is null then
      new.expires_at := now() + interval '14 days';
    end if;
  end if;

  if new.invited_by is null then
    new.invited_by := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists trip_members_invite_defaults on public.trip_members;
create trigger trip_members_invite_defaults
  before insert on public.trip_members
  for each row
  execute function public.trip_members_set_invite_defaults();

revoke all on function public.trip_members_set_invite_defaults() from public;

create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members m
    where m.trip_id = p_trip_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
      and m.revoked_at is null
  );
$$;

revoke all on function public.is_trip_member(uuid) from public;
grant execute on function public.is_trip_member(uuid) to authenticated;

drop policy if exists "trips_select_member" on public.trips;
create policy "trips_select_member"
  on public.trips for select
  using (public.is_trip_member(id));

drop policy if exists "trip_members_select_self" on public.trip_members;
create policy "trip_members_select_self"
  on public.trip_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.trips t
      where t.id = trip_id and t.owner_id = auth.uid()
    )
    or public.is_trip_member(trip_id)
  );

create or replace function public.accept_trip_invite(p_token text)
returns public.trip_members
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.trip_members;
  caller_email text;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_token is null or length(p_token) < 32 then
    raise exception 'Invalid invite token' using errcode = '22023';
  end if;

  if not public.is_active_user() then
    raise exception 'Account disabled' using errcode = '42501';
  end if;

  select email into caller_email from public.profiles where id = uid;

  select * into row
  from public.trip_members
  where invite_token = p_token
  for update;

  if not found then
    raise exception 'Invite not found' using errcode = 'P0002';
  end if;

  if row.status = 'revoked' or row.revoked_at is not null then
    raise exception 'Invite revoked' using errcode = '42501';
  end if;

  if row.status = 'accepted' and row.user_id = uid then
    return row;
  end if;

  if row.status <> 'pending' then
    raise exception 'Invite is no longer pending' using errcode = '42501';
  end if;

  if row.expires_at is not null and row.expires_at < now() then
    raise exception 'Invite expired' using errcode = '42501';
  end if;

  if row.email is not null
     and row.email <> 'owner'
     and position('@' in row.email) > 0
     and lower(row.email) is distinct from lower(coalesce(caller_email, '')) then
    raise exception 'Invite email mismatch' using errcode = '42501';
  end if;

  update public.trip_members
  set
    status = 'accepted',
    user_id = uid,
    invite_token = null
  where id = row.id
  returning * into row;

  return row;
end;
$$;

revoke all on function public.accept_trip_invite(text) from public;
grant execute on function public.accept_trip_invite(text) to authenticated;

create or replace function public.revoke_trip_invite(p_member_id uuid)
returns public.trip_members
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.trip_members;
  owner_ok boolean;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into row from public.trip_members where id = p_member_id for update;
  if not found then
    raise exception 'Invite not found' using errcode = 'P0002';
  end if;

  select exists (
    select 1 from public.trips t where t.id = row.trip_id and t.owner_id = uid
  ) into owner_ok;

  if not owner_ok then
    raise exception 'Only the trip owner can revoke invites' using errcode = '42501';
  end if;

  if row.role = 'owner' then
    raise exception 'Cannot revoke the owner membership' using errcode = '42501';
  end if;

  update public.trip_members
  set
    status = 'revoked',
    revoked_at = now(),
    invite_token = null
  where id = row.id
  returning * into row;

  return row;
end;
$$;

revoke all on function public.revoke_trip_invite(uuid) from public;
grant execute on function public.revoke_trip_invite(uuid) to authenticated;

-- Owners still manage members via existing trip_members_via_trip_owner policy.
-- Ensure pending insert still requires active owner (already gated by trips ownership).
