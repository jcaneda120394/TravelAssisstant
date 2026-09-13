# Trip invite security

## Model

| Property | Behavior |
|----------|----------|
| Token | 32+ byte hex from `extensions.gen_random_bytes` |
| Expiry | Default 14 days (`expires_at`) |
| Binding | Accept requires signed-in email to match invite email |
| Single-use | `invite_token` cleared on accept |
| Revocation | Owner calls `revoke_trip_invite`; status=`revoked`, `revoked_at` set |
| Deep link | `travelassistant://invite/{token}` or `/invite/{token}` on web |

## Server RPCs

- `accept_trip_invite(p_token text)` — security definer; checks auth, active user, expiry, email, status
- `revoke_trip_invite(p_member_id uuid)` — owner only
- `is_trip_member(trip_id)` — accepted + not revoked

## Client

- Create invite from trip Collaborate card → copies link (do not paste tokens into analytics)
- Accept via `src/app/invite/[token].tsx`
- Owner can revoke pending/accepted non-owner members

## Tests

Covered by `scripts/security/rls-live-check.mjs` (INV-01 … INV-06).
