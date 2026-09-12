# Environment Strategy

## Environments

| Name | Use |
|------|-----|
| `development` | Local Expo, mock providers, optional local Supabase |
| `staging` | Shared staging Supabase + limited real APIs |
| `production` | Production Supabase + paid APIs via Edge Functions |

## Client env vars (`EXPO_PUBLIC_*` only)

See `.env.example`. These are **public** and embedded in the app binary.

## Secrets

Never put in the React Native client:

- OpenAI / Anthropic keys
- Google Maps server keys (restricted server keys)
- Hotel / eSIM affiliate secrets
- Service role Supabase key

Use Supabase Edge Functions or a backend proxy.

## Files

- `.env` — local (gitignored)
- `.env.example` — documented template
- `src/config/env.ts` — Zod-validated access

## Supabase

Create separate projects for staging and production when ready.  
Development may use one shared project or local CLI.
