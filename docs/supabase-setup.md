# Supabase Setup

## Your project

- Dashboard: [Project settings](https://supabase.com/dashboard/project/viyzvgdvnxhddtobpyys/settings/general)
- API settings: [Project API](https://supabase.com/dashboard/project/viyzvgdvnxhddtobpyys/settings/api)
- Project URL: `https://viyzvgdvnxhddtobpyys.supabase.co`

## Connect the mobile app

1. Open [API settings](https://supabase.com/dashboard/project/viyzvgdvnxhddtobpyys/settings/api)
2. Copy the **anon** `public` key (not `service_role`)
3. Put it in `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://viyzvgdvnxhddtobpyys.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=paste-anon-key-here
EXPO_PUBLIC_USE_MOCK_PROVIDERS=true
```

4. Restart Expo with cache clear:

```bash
npx expo start -c
```

## Apply database migrations

In [SQL Editor](https://supabase.com/dashboard/project/viyzvgdvnxhddtobpyys/sql/new), run these files **in order**:

1. `supabase/migrations/20260912120000_phase2_profiles_preferences.sql`
2. `supabase/migrations/20260912180000_phases_6_17_core.sql`

## Auth settings to enable

In [Authentication → Providers](https://supabase.com/dashboard/project/viyzvgdvnxhddtobpyys/auth/providers):

- Email (password) — enable
- Magic link / OTP — enable if desired
- Google / Apple — optional; needs OAuth credentials

Redirect URLs (Authentication → URL Configuration) should include:

- `travelassistant://`
- Your Expo auth redirect (from `AuthSession.makeRedirectUri`)

## Important

- Never put the **service_role** key in the React Native app.
- RLS is defined in the migrations — keep it enabled.
- Sensitive provider secrets belong in Edge Functions (later).
