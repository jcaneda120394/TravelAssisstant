# TravelAssistant — System Architecture

**App name:** TravelAssistant  
**Product concept:** Intelligent global travel companion (planning → navigation → discovery → assistance)

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Mobile Clients (iOS / Android)                │
│              React Native + Expo + Expo Router                    │
│  UI → Feature modules → Hooks/Stores → Services → Providers      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS (public keys only)
┌───────────────────────────────▼─────────────────────────────────┐
│                    Supabase Platform                              │
│  Auth │ PostgreSQL + RLS │ Storage │ Realtime │ Edge Functions   │
└───────┬─────────────────┬─────────────────┬─────────────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
   Provider Adapters   AI Gateway      Secure Proxies
   (Places/Transport/  (tool-calling   (maps, hotels,
    Hotels/Weather/     orchestration)  transit, eSIM)
    Currency/eSIM)
```

### Principles

- **Client never holds sensitive API secrets** — paid/provider calls go through Edge Functions or a backend proxy.
- **Provider adapters** isolate third-party APIs behind stable interfaces.
- **Feature-based modules** own UI + domain logic for a capability.
- **Mock providers** unblock development until real API keys exist.
- **Offline-aware** caching via TanStack Query + selective local persistence.

### Core differentiators (foundation-ready)

1. **Intelligent Transport Engine** — `TransportProvider` + route comparison + traveler-aware ranking.
2. **AI Travel Assistant** — `AIProvider` + tool registry; never invents live operational data.

---

## 2. Application Architecture

| Layer | Responsibility |
|-------|----------------|
| `app/` (Expo Router) | Screens, layouts, navigation only |
| `features/` | Domain UI + feature hooks |
| `components/` | Shared UI / design system |
| `services/` | Business orchestration |
| `providers/` | External API adapters (interfaces + mocks + real) |
| `stores/` | Zustand client state (theme, session UI, prefs cache) |
| `lib/` | Supabase, query client, analytics, security helpers |
| `hooks/` | Shared React hooks |
| `types/` | Shared TypeScript contracts |
| `config/` | Env, feature flags, theme tokens |

### Data flow

```
Screen → Feature hook → TanStack Query / Zustand
                      → Service
                      → Provider interface
                      → Mock | Edge Function | Real adapter
```

---

## 3. Database Architecture (overview)

PostgreSQL via Supabase. Migrations live in `supabase/migrations/`.

Core entities (Phase 2+): `profiles`, `user_preferences`, `trips`, `trip_members`, `itinerary_*`, `saved_places`, `budgets`, `expenses`, `travel_documents`, `ai_conversations`, `ai_messages`, etc.

**RLS:** every user-owned table scoped by `auth.uid()` unless explicit sharing grants access.

See `docs/database.md`.

---

## 4. API / Provider Architecture

Interfaces in `src/providers/*/types.ts` (or `*.provider.ts`):

- `PlacesProvider`
- `TransportProvider`
- `HotelProvider`
- `WeatherProvider`
- `CurrencyProvider`
- `EsimProvider`
- `AIProvider`
- `MapsProvider` (Phase 3)

Registry in `src/providers/registry.ts` selects mock vs live via env flags.

See `docs/providers.md`.

---

## 5. AI Architecture

- Abstraction: `AIProvider.chat()` / `stream()` with tool definitions.
- Tools call Places/Transport/Weather/etc. — **never hallucinate API facts**.
- Edge Function orchestrates model + tools; client sends context + messages only.

See `docs/ai.md`.

---

## 6. Transportation Architecture

- `getRoutes`, transit/driving/walking/cycling, stops, departures, fares, alerts.
- Normalized `Route`, `RouteSegment`, `TransitStep` models.
- Comparison modes: recommended / fastest / cheapest / least walking / etc.
- Traveler context (luggage, kids, accessibility) affects ranking, not invented data.

See `docs/transport.md`.

---

## 7. Folder Architecture

See repository `src/` tree (feature-based + Expo Router under `src/app` or `app`).

---

## 8. Security Architecture

- RLS on all user data
- Secrets only in Edge Functions / CI
- Zod validation at boundaries
- Secure document storage (private buckets)
- Rate limiting + caching on expensive APIs

See `docs/environment.md` and future `docs/security` notes in README.

---

## 9. Testing Architecture

`__tests__/unit`, `__tests__/integration`, `e2e/` (Maestro later).  
Jest + RNTL in Phase 1 scaffolding; expand per phase.

See `docs/testing.md`.

---

## 10. Environment Strategy

| Env | Purpose |
|-----|---------|
| development | Local Expo + dev Supabase |
| staging | Pre-prod APIs + staging Supabase |
| production | Live keys, strict logging |

See `docs/environment.md` and `docs/deployment.md`.
