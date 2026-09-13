# Data inventory (privacy map)

| Data category | Purpose | Storage | Retention | Third parties | Sensitivity | Deletion |
|---------------|---------|---------|-----------|---------------|-------------|----------|
| Email | Auth / invites | Supabase Auth + `profiles` | Account lifetime | Supabase | High | Account deletion |
| Full name | Profile display | `profiles` | Account lifetime | — | Medium | Account deletion / profile update |
| Password hash | Auth | Supabase Auth | Account lifetime | Supabase | Critical | Account deletion |
| Session JWT / refresh | Auth session | SecureStore (native), memory (web) | Session / refresh policy | — | Critical | Logout / delete |
| Travel preferences | Personalization | `user_preferences` | Account lifetime | — | Medium | Cascade on profile delete |
| Trips / destinations / dates | Core product | `trips` + local offline cache | Account / trip lifetime | — | High | Delete trip / account |
| Itinerary / notes | Planning | `itinerary_*` | Trip lifetime | — | High | Cascade |
| Budgets / expenses | Money planning | `budgets`, `expenses` | Trip lifetime | — | High | Cascade |
| Favorites / saved places | UX | `saved_places`, collections | Account lifetime | — | Medium | Cascade |
| Trip membership / invites | Collaboration | `trip_members` | Invite / trip lifetime | Email to invitee | Medium | Revoke / cascade |
| AI chat messages | Assistant | `ai_*` (if persisted) + Edge logs | Limited | LLM provider (prompts) | High | Cascade / provider retention |
| Precise location | Maps / nearby | Device; may cache locally | Minimize | Map/OSM providers when querying | High | Clear cache on logout |
| Device push tokens | Notifications | Provider + device | Subscription lifetime | Expo / APNs / FCM | Medium | Unregister on logout |
| Analytics events | Product metrics | Analytics vendor (if enabled) | Per vendor policy | PostHog (optional) | Low–Med | Disable / vendor delete |
| Admin notes | Support | `profiles.admin_notes` | Operational | — | High | Admin clear / account delete |
| FX / public map tiles | Convenience | Local cache | Short | Frankfurter, OSM tiles | Low | Cache expiry / logout clears private packs |

## Collection principles

- Collect only what onboarding and trip planning need.
- Do not send email, precise GPS, or raw AI prompts to analytics by default.
- Precise location is requested at point of use (`expo-location`), not continuously in background unless a future feature explicitly requires it.
