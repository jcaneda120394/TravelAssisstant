# TravelAssistant — Security Audit

**Date:** 2026-09-13  
**Scope:** Mobile (Expo), web (Vercel), Supabase (Auth, RLS, Storage, Edge Functions)  
**Standards:** OWASP MASVS / Mobile Top 10 / ASVS (practical subset)

| ID | Severity | Issue | Affected | Attack scenario | Remediation | Status |
|----|----------|-------|----------|-----------------|-------------|--------|
| SEC-001 | Critical | Users can self-escalate `profiles.role` via update | `profiles` RLS | Authenticated user sets `role='admin'` | Trigger `protect_privileged_profile_columns` | **Fixed** |
| SEC-002 | High | `ai-chat` unauthenticated / open CORS | `ai-chat`, `config.toml` | Anon abuse of LLM quota | JWT + CORS allowlist + rate limit | **Fixed** |
| SEC-003 | High | Admin control plane after role escalation | Admin RLS + Edge | Chained from SEC-001 | Fix SEC-001 + server admin checks | **Mitigated** |
| SEC-004 | Medium | `is_disabled` only UI-enforced | Auth / RLS | Disabled user keeps write access | `is_active_user()` on write policies; AI 403 | **Fixed** (writes) |
| SEC-005 | Medium | `admin_notes` readable via `select('*')` | profiles grants / services | User reads internal notes | Column revoke + safe selects + RPC | **Fixed** |
| SEC-006 | Medium | Auth tokens in AsyncStorage (native) | Supabase client | Rooted device token theft | SecureStore adapter | **Fixed** |
| SEC-007 | Medium | Production without Supabase → demo auth | `env.ts`, auth | Passwordless production login | Fail closed in production | **Fixed** |
| SEC-008 | Medium | Verbose analytics / PII in logs | analytics / console | Leak tokens or traits | `safeLog` + production silence | **Fixed** |
| SEC-009 | Medium | `admin-update-user` CORS `*` | Edge Function | Unnecessary origin openness | CORS allowlist + rate limit + audit log | **Fixed** |
| SEC-010 | Medium | No account deletion | Profile / Auth | GDPR / App Store privacy | `delete-account` + Profile UI | **Fixed** |
| SEC-011 | Low | Web CSP / security headers absent | Vercel | XSS / clickjacking on web | `vercel.json` headers | **Fixed** |
| SEC-012 | Low | Demo auth in AsyncStorage | `local-auth.ts` | Device compromise of demo data | Documented; disabled in production | **Accepted** |
| SEC-013 | Medium | Trip invites lack crypto tokens / expiry | `trip_members` | Guessable / durable invites | Token + 14-day expiry + revoke + accept RPC | **Fixed** |
| SEC-014 | Low | Collaborator write RLS incomplete | trip_members roles | Over/under permissioned editors | Expand member write policies carefully | **Open** |
| SEC-015 | Informational | npm moderate advisories | dependencies | Supply-chain | See dependency-audit | **Open** |
| SEC-016 | Informational | AI rate limit in-memory only | `ai-chat` | Bypass across isolates | Redis/Upstash for scale | **Open** |
| SEC-017 | Medium | Disabled users retain valid JWTs for reads | Auth sessions | Read own data until expiry | `admin-set-user-status` global signOut + ban | **Fixed** |
| SEC-018 | Low | SecureStore size fallback to AsyncStorage | auth storage | Rare oversized session blob | Documented residual risk | **Accepted** |

## Assumptions

- Supabase anon key is public by design.
- Client UI gates are convenience only; RLS + Edge Functions are authoritative.
- Guests may browse; LLM gateway requires a signed-in JWT.
