# Release security checklist

Do **not** ship a public store build until all **Critical** and **High** items are checked.

## Secrets

- [ ] No service-role / LLM / paid API keys in `EXPO_PUBLIC_*`
- [ ] EAS / Vercel secrets reviewed
- [ ] Rotated any credentials shared in chat or tickets
- [ ] `.env` not committed with privileged secrets

## RLS / database

- [x] RLS enabled on user-data tables
- [x] Non-admin cannot change `role` / `is_disabled` / `admin_notes`
- [x] Disabled users blocked from writes (`is_active_user`)
- [x] `admin_notes` not granted to authenticated SELECT
- [x] Manual/live cross-user trip access verified (`npm run test:security:rls`)
- [x] Trip invites use opaque tokens, expiry, revoke, and email binding
- [x] Disable account revokes sessions (Edge Function `admin-set-user-status`)

## Auth / session

- [x] Production requires Supabase config
- [x] Demo local auth disabled in production
- [x] Native sessions use SecureStore adapter
- [x] Logout clears private offline cache
- [x] Account deletion Edge Function deployed

## Admin

- [x] Server-side role checks on Edge Function
- [x] Admin CORS allowlist
- [ ] MFA enabled for admin accounts (Supabase dashboard)

## Edge Functions / AI

- [x] `ai-chat` `verify_jwt = true`
- [x] AI CORS allowlist + rate limit
- [x] `delete-account` + `admin-update-user` deployed with JWT

## Client privacy

- [x] Safe logging helper
- [x] Analytics debug silenced in production path
- [x] Web security headers (`vercel.json`)
- [ ] Notification copy reviewed (no reservation numbers on lock screen)
- [ ] Privacy policy published matching `data-inventory.md`

## Dependencies / CI

- [x] `npm audit` reviewed (no critical/high as of audit date)
- [ ] CI does not print secrets
- [ ] Workflows use least privilege

## Build

- [ ] Production EAS profile uses production env
- [ ] No debug menus / test accounts in production binary
- [ ] Staging vs production Supabase projects separated (recommended)

## Sign-off

| Role | Name | Date | Result |
|------|------|------|--------|
| Engineering | | | PRODUCTION SECURITY READY |
| Product / Privacy | | | |
