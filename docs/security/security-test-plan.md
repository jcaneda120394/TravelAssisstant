# Security test plan

| Test ID | Threat | Steps | Expected | Automation | Severity |
|---------|--------|-------|----------|------------|----------|
| ST-001 | Privilege escalation | Non-admin updates `profiles.role` to `admin` | Trigger rejects | **Live** + unit | Critical |
| ST-002 | Cross-user trip read | User B selects User A private trip | Empty / RLS deny | **Live** | Critical |
| ST-003 | Cross-user trip write | User B updates User A trip | Denied | **Live** | Critical |
| ST-004 | Disabled user writes | Disable user; attempt write | Denied via `is_active_user` | **Live** | High |
| ST-005 | Unauthenticated AI | POST `ai-chat` without JWT | 401 | Manual curl | High |
| ST-006 | AI rate limit | >20 AI requests / minute | 429 | Manual | Medium |
| ST-007 | Admin notes leak | Profile fetch | No `admin_notes` | Unit | Medium |
| ST-008 | Tampered userId on create | Client sends another user’s `owner_id` | RLS `with check` fails | Manual | High |
| ST-009 | Admin Edge Function | Non-admin invokes `admin-update-user` | 403 | Manual | High |
| ST-010 | Delete account auth | Invoke `delete-account` without JWT | 401 | Manual | High |
| ST-011 | Logout cache clear | Cache trips; logout | Private keys removed | Unit | Medium |
| ST-012 | Production env guard | Production without Supabase | Throw / fail closed | Unit | High |
| ST-013 | Oversized AI body | Huge `messages` payload | Truncated / rejected | Manual | Medium |
| ST-014 | Invite without ownership | Non-owner inserts `trip_members` | Denied | Manual | High |
| ST-015 | Safe logger | Log `password` / `token` | Redacted | Unit | Low |
| ST-016 | Input schemas | Invalid email / huge title | Zod reject | Unit | Medium |
| ST-017 | Invite token + expiry | Create invite | Token ≥32 chars + `expires_at` | **Live** | High |
| ST-018 | Invite email mismatch | Wrong account accepts token | Rejected | **Live** | High |
| ST-019 | Invite single-use | Accept twice | Second fails | **Live** | High |
| ST-020 | Revoke removes access | Revoke then member reads trip | Denied | **Live** | High |
| ST-021 | Anonymous private trip | Anon selects private trip | Empty | **Live** | High |

## Automation

```bash
# Unit
npm test -- --testPathPattern=security-

# Live RLS / invites / disable writes (never commit the service role key)
EXPO_PUBLIC_SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:security:rls
```

Live runner: `scripts/security/rls-live-check.mjs` (13 checks; creates temporary users and deletes them).
