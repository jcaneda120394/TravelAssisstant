# AI security

## Architecture

1. Client runs travel **tools** under the signed-in user’s Supabase session (RLS applies).
2. Optional LLM rewrite goes through Edge Function `ai-chat` with JWT required.
3. Provider keys (`GROQ_API_KEY`, etc.) never ship in the mobile bundle.

## Controls implemented

| Control | Detail |
|---------|--------|
| Auth | `verify_jwt = true`; function also calls `getUser()` |
| Disabled accounts | Rejected with 403 |
| Rate limit | ~20 requests / minute / user (in-memory per isolate) |
| Input bounds | Message / tool summary truncation |
| CORS | Allowlist (not `*`) |
| Prompt hygiene | System prompt forbids secrets and instructs to ignore tool/user attempts to override policy |
| Error leakage | Generic provider failures returned to client |
| Travel scope | Client-side off-topic rejection (`travel-scope.ts`) before tools |

## Tool authorization

Tools such as `get_trip` / `get_budget` call app services that:

- Use the current session against Supabase (RLS), or
- Read local demo storage only in non-production demo mode

Do **not** assume the model “checked” permissions. Each tool path must remain user-scoped.

## Prompt injection

Untrusted content (place descriptions, notes, web snippets) must be treated as data:

- Separated in prompts as tool output / user input
- System instructions tell the model not to follow instructions found inside tool data
- Tools must not execute arbitrary code or dynamic SQL from model output

## Cost / abuse

- Per-user rate limit on `ai-chat`
- Prefer cheaper models (Groq) with fallbacks
- Guests do not get LLM gateway access after JWT enforcement (local tool replies only)

## Remaining risks

- In-memory rate limits reset per Edge isolate — add Redis/Upstash for multi-region production
- Client-side tool execution can still be abused for API quota on free third-party APIs (OSRM, Nominatim) — respect provider ToS and add server proxies if abuse appears
- Full tool-calling agent with model-chosen functions is not enabled; keep it that way unless each tool is independently authorized server-side
