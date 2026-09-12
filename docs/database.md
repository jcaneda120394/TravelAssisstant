# Database Architecture

TravelAssistant uses **PostgreSQL via Supabase**. Schema changes are applied only through versioned migrations in `supabase/migrations/`.

## Principles

- Every user-owned row includes `user_id` (or is reachable via trip membership).
- `id uuid primary key default gen_random_uuid()`
- `created_at` / `updated_at` timestamptz
- Foreign keys + indexes on lookup columns
- **RLS enabled on all tables** — default deny

## Planned tables (introduced across phases)

| Table | Phase | Purpose |
|-------|-------|---------|
| `profiles` | 2 | User profile |
| `user_preferences` | 2 | Travel style, interests, units |
| `trips` | 6 | Trip containers |
| `trip_members` | 6 / 17 | Collaboration + roles |
| `trip_destinations` | 6 | Ordered destinations |
| `itinerary_days` | 7 | Day buckets |
| `itinerary_items` | 7 | Activities + transport legs |
| `saved_places` | 4 | Favorites |
| `favorite_collections` | 4 | Named collections |
| `favorite_items` | 4 | Collection membership |
| `budgets` | 11 | Trip budgets |
| `expenses` | 11 | Expense entries |
| `trip_hotels` | 10 | Saved hotel stays |
| `routes` / `route_segments` | 5 | Cached route summaries |
| `travel_documents` | 15 | Private storage metadata |
| `notifications` | 16 | Notification log |
| `emergency_contacts` | 13 | User emergency contacts |
| `ai_conversations` / `ai_messages` | 8 | Assistant history |
| `currency_preferences` | 11 | Favorite pairs |
| `esim_favorites` | 12 | Saved eSIM plans |
| `app_settings` | 2 | Client settings mirror |

## Phase 1

No production tables required for UI foundation.

## Phase 2 (applied)

Migration: `supabase/migrations/20260912120000_phase2_profiles_preferences.sql`

- `profiles` — id (auth.users), email, full_name, avatar_url, onboarding_completed
- `user_preferences` — travel styles, interests, budget, transport, locale/units, party size, diet, accessibility
- Trigger `handle_new_user` creates profile + preferences row on signup
- RLS: users can only read/write their own rows

See `docs/phase-2.md` for setup steps.