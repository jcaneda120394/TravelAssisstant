# Authorization matrix

| Action | Guest | USER | TRIP_MEMBER (viewer) | TRIP_MEMBER (editor) | ADMIN |
|--------|-------|------|----------------------|----------------------|-------|
| Browse public travel spots / maps | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create account / sign in | ✓ | — | — | — | — |
| Manage own profile / preferences | — | ✓ | ✓ | ✓ | ✓ |
| Create / update / delete own trips | — | ✓ (owner) | — | — | ✓ (all) |
| Read shared trip | — | owner | ✓ | ✓ | ✓ |
| Edit shared trip itinerary | — | owner | — | ✓* | ✓ |
| Manage budget / expenses (own trips) | — | ✓ | per RLS | per RLS | ✓ |
| Invite collaborators | — | owner | — | — | ✓ |
| Call `ai-chat` LLM gateway | — | ✓ (active) | ✓ | ✓ | ✓ |
| Admin dashboard / user mgmt | — | — | — | — | ✓ |
| Disable users / set roles | — | — | — | — | ✓ |
| Delete own account | — | ✓ | ✓ | ✓ | ✓ |

\* Editor write access depends on trip_members policies; current RLS focuses on **owner** writes for itinerary/budgets. Treat expanded collaborator write as a future hardening item — do not grant broader client trust without new policies.

## Enforcement layers

1. **RLS** — `auth.uid()`, `is_active_user()`, `is_admin()`
2. **Edge Functions** — JWT + role checks independent of UI
3. **UI gates** — convenience only (`AdminGate`, `requireAuthToSave`)

## Disabled users

`is_disabled = true` → `is_active_user()` false → owner write policies fail; `ai-chat` returns 403.
