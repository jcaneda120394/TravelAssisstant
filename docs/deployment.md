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
