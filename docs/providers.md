# Provider Architecture

All external data sources are accessed through **provider interfaces**. UI and features never import vendor SDKs directly.

## Registry

`src/providers/registry.ts` resolves implementations based on env flags:

| Flag | Default (Phase 1) |
|------|-------------------|
| `EXPO_PUBLIC_USE_MOCK_PROVIDERS` | `true` |

## Interfaces (Phase 1)

| Provider | Responsibility |
|----------|----------------|
| `PlacesProvider` | Search, nearby, details, photos |
| `TransportProvider` | Routes, transit, fares, alerts |
| `HotelProvider` | Search, rates, rooms, photos |
| `WeatherProvider` | Current + forecast |
| `CurrencyProvider` | FX rates + conversion |
| `EsimProvider` | Plans by country |
| `AIProvider` | Chat + tool-calling orchestration |

## Rules

1. Return **normalized domain types** (`Place`, `Route`, `Hotel`, …).
2. Never invent live operational data in providers or AI.
3. If unavailable → typed error / empty result with clear reason.
4. Expensive calls should eventually go through **Supabase Edge Functions**.
5. Swap mock → real adapter without changing feature code.

## Future adapters

- Places: Google Places, Foursquare, HERE
- Transport: Google Routes, Mapbox, HERE, GTFS-RT
- Hotels: Amadeus, Expedia Rapid, Hotelbeds
- Weather: OpenWeather, WeatherAPI
- Currency: Open Exchange Rates, frankfurter
- eSIM: Airalo, Nomad affiliate APIs
- AI: OpenAI, Anthropic, Google via Edge Function gateway
