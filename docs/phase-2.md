# Phase 2 — Authentication + Onboarding

## What we built

- Email/password sign up & sign in
- Magic link (Supabase required)
- Google OAuth (Supabase + provider config required)
- Apple Sign-In (iOS + Supabase required)
- Multi-step onboarding preferences
- Profile screen with preferences + sign out
- Auth gate routing: Auth → Onboarding → Tabs
- Local **demo auth** when Supabase env vars are empty (so Phase 2 is testable offline)

## Architecture decisions

1. **Auth service abstraction** (`src/services/auth/auth.service.ts`) keeps screens free of vendor details.
2. **Local demo auth** uses AsyncStorage when `EXPO_PUBLIC_SUPABASE_*` is unset — same UX path as production.
3. **Profiles + preferences** live in Postgres with strict RLS; migration in `supabase/migrations/`.
4. **Onboarding gate** uses `profiles.onboarding_completed` so incomplete users cannot skip setup.
5. **Secrets stay out of the client** — only anon key; OAuth client secrets belong in Supabase dashboard.

## Folder map

```
src/app/(auth)/          login, signup, magic-link
src/app/(onboarding)/    onboarding wizard
src/features/auth/       screens + AuthGate
src/features/onboarding/ wizard UI
src/services/auth/       Supabase + local demo
src/services/profile/    profile/preferences CRUD
src/stores/auth-store.ts session/profile state
src/types/auth.ts        Zod schemas
supabase/migrations/     Phase 2 SQL
```

## Environment

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Optional for Phase 2 testing without cloud:

Leave Supabase empty → demo auth mode.

## Configure Supabase

1. Create project
2. Run migration SQL: `supabase/migrations/20260912120000_phase2_profiles_preferences.sql`
3. Auth → Providers:
   - Email enabled
   - Google: add Client ID/Secret
   - Apple: configure Services ID / key
4. Auth → URL configuration:
   - Redirect URLs include `travelassistant://` and Expo auth session redirect
5. Paste URL + anon key into `.env`
6. Restart Expo: `npx expo start -c`

### Google OAuth redirect tip

Use the redirect URI printed by:

```ts
AuthSession.makeRedirectUri({ scheme: 'travelassistant' })
```

Add that exact URI in Google Cloud + Supabase redirect allow-list.

## Manual test checklist

- [ ] Cold start shows Login when logged out
- [ ] Sign up with email (demo or Supabase)
- [ ] Land on onboarding wizard
- [ ] Cannot skip required steps
- [ ] Finish onboarding → Home tabs
- [ ] Profile shows name/email/preferences
- [ ] Sign out returns to Login
- [ ] Sign in again skips onboarding
- [ ] Magic link shows clear error in demo mode
- [ ] Google/Apple show clear errors until providers configured
- [ ] Theme still works on Profile

## Automated tests

```bash
npm test
npm run typecheck
```

## What Phase 3 will build

Location permissions, current/manual location, map provider abstraction, markers, clusters, location search.
