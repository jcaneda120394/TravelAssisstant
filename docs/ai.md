# AI Architecture

The AI Travel Assistant is a **tool-using travel agent**, not a generic chatbot.

## Non-negotiable rule

**Never invent operational facts.** Hotel prices, transit times, exits, platforms, fares, weather, opening hours, eSIM prices, and disruptions must come from tools/APIs. If unavailable, say so.

## Layers

```
Client (context + message)
  → Edge Function AI gateway
    → AIProvider (model adapter)
      → Tool registry
        → Places / Transport / Weather / Trips / …
```

## Context envelope (sent with each turn)

- Location (city/country/lat/lng when permitted)
- Timezone + local time
- Active trip + itinerary summary
- Traveler profile (adults/children, budget, diet, accessibility)
- Weather snapshot (from WeatherProvider)
- Mode: Ask | Explore | Planner | Navigator | Emergency | Budget

## Tool calling

Tools mirror provider capabilities (`get_routes`, `search_places`, `convert_currency`, …).  
The model may **plan and explain**; tools supply **facts**.

## Phase 1

- `AIProvider` interface + `MockAIProvider`
- Mock returns structured, clearly-labeled placeholder guidance
- No paid model keys in the client

## Later phases

- Phase 8: real gateway + tools
- Phase 9: itinerary generation + transport feasibility validation
- Proactive notifications only after explicit permission
