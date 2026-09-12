# Environment Strategy

## Environments

| Name | Use |
|------|-----|
| `development` | Local Expo, live free APIs by default, Supabase optional |
| `staging` | Shared staging Supabase + limited paid APIs |
| `production` | Production Supabase + paid APIs via Edge Functions |

## Client env vars (`EXPO_PUBLIC_*` only)

See `.env.example`. These are **public** and embedded in the app binary.

Key switch:

```bash
EXPO_PUBLIC_USE_MOCK_PROVIDERS=false   # live OpenStreetMap / OSRM / Open-Meteo / Frankfurter
EXPO_PUBLIC_USE_MOCK_PROVIDERS=true    # offline mock fixtures
```

## Secrets

Never put in the React Native client:

- OpenAI / Anthropic keys
- Google Maps **server** keys
- Hotel / eSIM affiliate secrets
- Service role Supabase key

Use Supabase Edge Functions or a backend proxy.

Optional LLM:

```bash
supabase functions deploy ai-chat
supabase secrets set OPENAI_API_KEY=sk-...
```

## Files

- `.env` — local (gitignored)
- `.env.example` — documented template
- `src/config/env.ts` — Zod-validated access

## Supabase

Create separate projects for staging and production when ready.  
Development may use one shared project or local CLI.

Trips, favorites, itinerary, and budgets sync to Supabase when the signed-in user has a real auth UUID (not local demo auth).
