# Secret management

## Rules

1. Anything in `EXPO_PUBLIC_*` is **public** (bundled into the client).
2. Provider secrets (OpenAI, Groq, Gemini, Amadeus, Airalo, Maps billed keys, service role) live only in:
   - Supabase Edge Function secrets
   - CI / EAS secrets (never committed)
3. The Supabase **anon** key is intentionally public; security depends on RLS + Edge Function auth.
4. Never commit `.env` with service-role or LLM keys.

## Client-safe (allowed as `EXPO_PUBLIC_*`)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anon JWT |
| `EXPO_PUBLIC_APP_ENV` | development / staging / production |
| `EXPO_PUBLIC_USE_MOCK_PROVIDERS` | Toggle mock travel APIs |
| `EXPO_PUBLIC_POSTHOG_*` / `EXPO_PUBLIC_SENTRY_DSN` | Optional analytics / crash (project keys only) |

## Server-only (Edge Function / dashboard secrets)

| Secret | Used by |
|--------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Injected automatically to Edge Functions |
| `GROQ_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` | `ai-chat` |
| Optional paid provider keys | Future proxies only |

Set with:

```bash
npx supabase secrets set GROQ_API_KEY=...
```

## Git history / rotation

| Item | Status |
|------|--------|
| Supabase anon key in `.env` / docs | Expected public — rotate only if project compromised |
| Service role key | Must never appear in git; rotate immediately if ever leaked |
| LLM API keys | Rotate if ever placed in `EXPO_PUBLIC_*` or committed |
| Demo admin password (if shared in chat/docs) | Rotate before public launch |

**Action before public release:** Rotate any credentials that were pasted into chat, tickets, or screenshots — including the Supabase **service_role** key if it was ever printed by CLI tooling in shared logs. Confirm no service-role key exists in GitHub history (`git log -p | rg -i 'service_role|sk-|gsk_'`).


## Build environments

- EAS: store secrets in EAS Environment Variables (production / preview / development).
- Vercel: same `EXPO_PUBLIC_*` for web builds; never add service role to Vercel.
- Production builds fail closed if Supabase URL/anon are missing (`src/config/env.ts`).
