# TravelAssistant

Intelligent global travel companion for iOS and Android (React Native + Expo).

**Phase 1 — Foundation is complete.** Do not start Phase 2 until explicitly requested.

## Stack

- Expo SDK 57 · Expo Router · TypeScript (strict)
- NativeWind · Reanimated · TanStack Query · Zustand · Zod · React Hook Form
- Supabase (client scaffold) · Provider adapters with mocks

## Quick start

```bash
cp .env.example .env
npm install
npx expo start
```

## Documentation

| Doc | Path |
|-----|------|
| System architecture | [docs/architecture.md](docs/architecture.md) |
| Database | [docs/database.md](docs/database.md) |
| Providers | [docs/providers.md](docs/providers.md) |
| AI | [docs/ai.md](docs/ai.md) |
| Transport | [docs/transport.md](docs/transport.md) |
| Environment | [docs/environment.md](docs/environment.md) |
| Testing | [docs/testing.md](docs/testing.md) |
| Deployment | [docs/deployment.md](docs/deployment.md) |
| Phase 2 Auth | [docs/phase-2.md](docs/phase-2.md) |

## Scripts

```bash
npm start          # Expo dev server
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run typecheck  # TypeScript
npm test           # Jest unit tests
```

## Phase 1 screens

Bottom tabs: **Home · Explore · Trips · Map · AI · Profile**

Additional routes: place details, directions, hotels, currency, budget, eSIM, emergency, weather, search, favorites, notifications, trip detail.

See [docs/phases-3-20.md](docs/phases-3-20.md) for the full feature map.

## Security note

Never put secret API keys in `EXPO_PUBLIC_*` variables. Paid provider calls must go through Supabase Edge Functions.
