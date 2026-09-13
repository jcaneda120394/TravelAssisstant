# Admin security

## Threat model

Admin capabilities must not rely on:

- Hidden routes (`/admin`)
- Client-only `isAdmin` flags
- Email string checks in the UI

## Authoritative controls

| Control | Location |
|---------|----------|
| `profiles.role = 'admin'` | Database column |
| `is_admin()` | SQL helper used by RLS |
| Trigger `protect_privileged_profile_columns` | Blocks non-admins from changing `role` / `is_disabled` / `admin_notes` |
| `admin-update-user` Edge Function | Re-checks `role` + `is_disabled` before Auth Admin API |
| Column grants | `admin_notes` not selectable by authenticated clients; RPC `admin_get_profile_notes` |

## Admin capabilities

Admins may:

- List/manage users (within RLS admin policies)
- Disable accounts (`is_disabled`)
- Update another user’s Auth email/password via Edge Function
- View admin notes via RPC
- Read all trips (admin select policies)

Admins must not:

- Escalate themselves via client-only logic (blocked by trigger)
- Call Auth Admin API from the mobile app with the service role key

## Audit logging

`admin-update-user` emits structured logs:

```json
{ "event": "admin_update_user", "adminId": "...", "targetId": "...", "fields": ["password"], "at": "..." }
```

Review in Supabase Edge Function logs. Prefer shipping these to a SIEM before large-scale launch.

## Operational checklist

- [ ] Limit number of admin accounts
- [ ] Use strong unique passwords + MFA on admin emails (Supabase Auth MFA when enabled)
- [ ] Rotate admin passwords after any suspected leak
- [ ] Disable unused admin accounts via `is_disabled`
