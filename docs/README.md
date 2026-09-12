# TravelAssistant — complete architecture index

See individual docs:

1. [architecture.md](./architecture.md) — system + application overview  
2. [database.md](./database.md) — PostgreSQL / Supabase schema plan  
3. [providers.md](./providers.md) — adapter layer  
4. [ai.md](./ai.md) — AI assistant + tool calling  
5. [transport.md](./transport.md) — Intelligent Transport Engine  
6. [environment.md](./environment.md) — env strategy  
7. [testing.md](./testing.md) — test architecture  
8. [deployment.md](./deployment.md) — EAS / CI  
9. [supabase-setup.md](./supabase-setup.md) — project connection  
10. [phase-1-checklist.md](./phase-1-checklist.md) — Phase 1 QA  
11. [phase-2.md](./phase-2.md) — Auth + onboarding  
12. [phases-3-20.md](./phases-3-20.md) — Remaining phases delivery map  
13. [release-checklist.md](./release-checklist.md) — Store submission  
14. [legal/privacy-policy.md](./legal/privacy-policy.md)  
15. [legal/terms.md](./legal/terms.md)  

## Folder architecture (Phase 1)

```
src/
  app/                 # Expo Router screens & layouts
  components/          # Shared UI, layout, feedback
  features/            # Feature screens (home, explore, …)
  services/            # Business orchestration (expand later)
  providers/           # External API adapters + mocks + AppProviders
  hooks/
  lib/                 # supabase, query, errors, analytics
  stores/              # Zustand
  types/
  config/
  constants/
  utils/
  localization/
```
