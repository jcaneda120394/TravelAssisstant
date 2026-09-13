-- Allow service_role (Edge Functions / Admin API) to change privileged profile columns.
-- auth.uid() is null for service role, so the previous trigger blocked disables.

create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  -- Service role bypasses (used by admin-set-user-status Edge Function).
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

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
