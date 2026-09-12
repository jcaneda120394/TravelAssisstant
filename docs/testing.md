# Testing Architecture

## Layout

```
__tests__/
  unit/
  integration/
e2e/          # Maestro flows (later)
```

## Stack

- **Jest** + **jest-expo**
- **React Native Testing Library**
- **Maestro** (mobile e2e — Phase 19+)
- API/integration tests against mocks and Edge Functions

## Phase 1 focus

- Env schema validation
- Provider registry resolves mocks
- Theme store toggles
- Screen smoke renders (optional)

## Critical future coverage

Auth, onboarding, places, directions, route comparison, trips, itinerary, currency, hotels, expenses, AI tool failures, offline, timeouts, rate limits.

## Test IDs

Critical components expose `testID` (e.g. `tab-home`, `screen-home`).
