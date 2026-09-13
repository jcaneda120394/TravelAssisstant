# Deployment

## Web (Vercel)

Expo web SPA export. Config: `vercel.json`.

**Production:** https://travelassistant-umber.vercel.app

```bash
npm run build:web   # outputs to dist/
npx vercel          # preview
npx vercel --prod   # production
```

### Required Vercel environment variables (Production + Preview)

Already set on project `travelassistant` for Production, Preview, and Development:

| Variable | Notes |
|----------|--------|
| `EXPO_PUBLIC_APP_ENV` | `production` / `preview` / `development` |
| `EXPO_PUBLIC_APP_NAME` | `TravelAssistant` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://viyzvgdvnxhddtobpyys.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `EXPO_PUBLIC_USE_MOCK_PROVIDERS` | `false` |

Optional: `EXPO_PUBLIC_POSTHOG_*`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

### Place search + photos (Google Places)

Home, Explore, Search, Map, trips, and AI prefer **Google Places** (nearby + text search + details + photos) via the `google-places` Edge Function. OSM/Photon remain as fallback when Google is unavailable.

1. Enable **Places API (New)** on a Google Cloud project.
2. Create an API key (server key for the Edge Function secret).
3. Set the secret and deploy:

```bash
npx supabase secrets set GOOGLE_MAPS_API_KEY=your_key --project-ref viyzvgdvnxhddtobpyys
npx supabase functions deploy google-places --project-ref viyzvgdvnxhddtobpyys
npx supabase functions deploy place-photo --project-ref viyzvgdvnxhddtobpyys

# Optional free stock photos — sequential Pexels → Unsplash → Openverse → Wikimedia
# NEVER use EXPO_PUBLIC for Pexels/Unsplash keys (server-only on stock-photos Edge).
npx supabase secrets set PEXELS_API_KEY=... UNSPLASH_ACCESS_KEY=... --project-ref viyzvgdvnxhddtobpyys
npx supabase functions deploy stock-photos --project-ref viyzvgdvnxhddtobpyys
# Cache table: apply migration 20260913160000_place_images_cache.sql
```

Optional client fallback: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (restrict by HTTP referrer to your Vercel domain). Without a Google key, the app uses OSM/Photon + the travel image service (Openverse/Wikimedia always; Pexels/Unsplash when Edge secrets are set).

Travel images go through `getTravelImage()` in `src/lib/images/` — do not call Pexels/Unsplash from the Expo client.

Rebuild after changing env vars (`EXPO_PUBLIC_*` are inlined at build time).

### Connect GitHub → Vercel (optional auto-deploy)

Vercel GitHub login connection may need to be enabled once in the Vercel dashboard, then:

```bash
npx vercel git connect https://github.com/jcaneda120394/TravelAssisstant.git
```

### Supabase Auth redirects for Vercel

[Auth → URL Configuration](https://supabase.com/dashboard/project/viyzvgdvnxhddtobpyys/auth/url-configuration)

Add:

- `https://travelassistant-umber.vercel.app`
- `https://travelassistant-umber.vercel.app/**`
- `https://*.vercel.app/**` (preview deployments)

Also keep:

- `travelassistant://`
- `travelassistant://**`
- `exp://127.0.0.1:8081/--/*`
- `exp://localhost:8081/--/*`

Site URL can be `https://travelassistant-umber.vercel.app`.

## Mobile

- **EAS Build** for iOS and Android
- **EAS Submit** for App Store / Play Store
- Profiles: `development`, `preview`, `production`

## CI (planned)

GitHub Actions:

1. Install
2. Lint
3. Typecheck
4. Unit tests
5. Build (preview)
6. E2E (later)

## Supabase Edge Function secrets (optional)

```bash
npx supabase secrets set GROQ_API_KEY=gsk_...
# or GEMINI_API_KEY / OPENAI_API_KEY
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions.
