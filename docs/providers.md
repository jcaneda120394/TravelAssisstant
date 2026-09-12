# Provider Architecture

All external data sources are accessed through **provider interfaces**. UI and features never import vendor SDKs directly.

## Registry

`src/providers/registry.ts` resolves implementations based on env flags:

| Flag | Live (`false`) | Mock (`true`) |
|------|----------------|---------------|
| `EXPO_PUBLIC_USE_MOCK_PROVIDERS` | Free public APIs + native maps | Offline fixtures |

Default in `.env.example` is **live** (`false`).

## Live adapters (no paid keys required)

| Provider | Implementation | Source |
|----------|----------------|--------|
| Places | `OsmPlacesProvider` | Nominatim + Overpass (OpenStreetMap) |
| Transport | `OsrmTransportProvider` | OSRM public router + OSM stops |
| Hotels | `OsmHotelProvider` | OSM hotel POIs (rates need a partner API) |
| Weather | `OpenMeteoWeatherProvider` | Open-Meteo |
| Currency | `FrankfurterCurrencyProvider` | Frankfurter.app ECB rates |
| Maps | `NativeMapsProvider` | `react-native-maps` (Apple Maps on iOS Expo Go) |
| eSIM | `CatalogEsimProvider` | Curated public plan catalog + purchase URLs |
| AI | `LiveAIProvider` | Live tools + optional `ai-chat` Edge Function |

## Optional paid upgrades

| Capability | How |
|------------|-----|
| LLM chat quality | Deploy `supabase/functions/ai-chat` + set `OPENAI_API_KEY` secret |
| Hotel rates / booking | Add Amadeus / Expedia Rapid adapter behind Edge Function |
| Google transit / Places | Add Google adapters + restricted server keys via Edge Functions |
| eSIM checkout | Airalo / Nomad partner API |

## Rules

1. Return **normalized domain types** (`Place`, `Route`, `Hotel`, …).
2. Never invent live operational data in providers or AI.
3. If unavailable → typed error / empty result with clear reason.
4. Secrets stay in Edge Functions / server env — never in `EXPO_PUBLIC_*`.
5. Swap mock → live without changing feature screens.
