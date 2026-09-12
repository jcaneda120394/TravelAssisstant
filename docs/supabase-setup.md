# TravelAssistant — Supabase setup (project viyzvgdvnxhddtobpyys)

## Current status (verified)

| Item | Status |
|------|--------|
| Project URL + anon key in `.env` | Connected |
| `EXPO_PUBLIC_USE_MOCK_PROVIDERS=false` | Live free APIs (OSM, OSRM, Open-Meteo, Frankfurter) |
| Tables: profiles, preferences, trips, itinerary, favorites, budgets, expenses, AI | Present |
| Email auth | Enabled (`mailer_autoconfirm: true` — no confirm email required) |
| Google / Apple OAuth | Off (optional) |
| RLS extra policies + grants | Run SQL below if not applied yet |
| `ai-chat` Edge Function | Deploy optional (for nicer AI replies) |

Live travel data does **not** need Supabase secrets. Supabase is for **auth + saving trips/favorites/profiles**.

---

## 1. App `.env` (already done if keys are set)

```bash
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_APP_NAME=TravelAssistant
EXPO_PUBLIC_SUPABASE_URL=https://viyzvgdvnxhddtobpyys.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
EXPO_PUBLIC_USE_MOCK_PROVIDERS=false
```

Restart Expo after changes: `npx expo start -c`

---

## 2. Apply remaining SQL (required once)

Open [SQL Editor](https://supabase.com/dashboard/project/viyzvgdvnxhddtobpyys/sql/new)

Paste and run **this file**:

`supabase/migrations/20260912220000_complete_rls_grants.sql`

You should see: `TravelAssistant Supabase setup policies applied`

Or run migrations in order if starting fresh:

1. `20260912120000_phase2_profiles_preferences.sql`
2. `20260912180000_phases_6_17_core.sql`
3. `20260912210000_live_rls_policies.sql`
4. `20260912220000_complete_rls_grants.sql`

---

## 3. Auth URL config

[Authentication → URL Configuration](https://supabase.com/dashboard/project/viyzvgdvnxhddtobpyys/auth/url-configuration)

Add redirect URLs:

- `travelassistant://`
- `travelassistant://**`
- `exp://127.0.0.1:8081/--/*` (local Expo)
- `exp://localhost:8081/--/*`

Site URL can stay your dashboard or `travelassistant://`

---

## 4. Optional: free AI LLM via Edge Function

AI already answers using live tools without a key. For natural chat:

1. Create a free key at [Groq Console](https://console.groq.com/) (recommended)  
   or [Google AI Studio](https://aistudio.google.com/)
2. In terminal:

```bash
npx supabase login
npx supabase link --project-ref viyzvgdvnxhddtobpyys
npx supabase functions deploy ai-chat --no-verify-jwt
npx supabase secrets set GROQ_API_KEY=gsk_your_key_here
```

Or set `GEMINI_API_KEY=...` / `OPENAI_API_KEY=...` instead.

Function source: `supabase/functions/ai-chat/index.ts`

---

## 5. Optional OAuth (Google / Apple)

[Auth → Providers](https://supabase.com/dashboard/project/viyzvgdvnxhddtobpyys/auth/providers)

Only needed if you want social login. Email/password already works.

---

## 6. Quick app test

1. Sign up / sign in  
2. Complete onboarding  
3. Home → **Save trip** → create a trip  
4. Confirm it appears under Trips (cloud when UUID auth user)  
5. Explore / Weather / Directions → live OSM / Open-Meteo / OSRM  

---

## Security rules

- Never put `service_role` in the mobile app  
- Never put Groq/OpenAI/Gemini keys in `EXPO_PUBLIC_*`  
- Keep RLS enabled on all tables  
