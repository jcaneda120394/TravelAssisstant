# TravelAssistant New User Guide — Screenshot Checklist

Captured from the running app at `http://localhost:8081` with an iPhone-sized viewport (393×852 @2x).

| # | Screenshot | Status | Notes |
|---|------------|--------|-------|
| 01 | `01-welcome-home.png` | Captured | Home / cover |
| 02 | `02-login.png` | Captured | Sign in |
| 02b | `02b-signup.png` | Captured | Create account |
| 02c | `02c-magic-link.png` | Captured | Passwordless email |
| 03 | `03-onboarding.png` | Needs data | Onboarding only after confirmed email + first sign-in; guest capture redirected |
| 03b | `03b-prefs-done.png` | Needs data | Same as above (may mirror Home) |
| 04 | `04-home.png` | Captured | Home |
| 04b | `04b-search.png` | Captured | Search |
| 04c | `04c-guide.png` | Captured | Guide / travel spots |
| 05 | `05-explore.png` | Captured | Explore filters |
| 06 | `06-place-details.png` | Captured | Philippine Arena example |
| 07 | `07-map.png` | Captured | Map + layers |
| 07b | `07b-trip-suggestions.png` | Captured | Curated templates |
| 07c | `07c-trip-suggestion.png` | Captured | Generate city plan |
| 08 | `08-directions.png` | Captured | Directions (pick destination for full routes) |
| 09 | `09-trips.png` | Captured | Trips list / auth prompt |
| 10 | `10-create-trip.png` | Needs data | Wizard requires signed-in session (email confirmation); use Suggestions until signed in |
| 10b | `10b-create-trip-dates.png` | Needs data | Depends on Create Trip |
| 11 | Trip detail / itinerary | Needs data | Requires a saved trip after sign-in |
| 12 | `12-ai-assistant.png` | Captured | Modes + voice |
| 13 | `13-hotels.png` | Captured | Hotel search |
| 14 | `14-currency.png` | Captured | FX converter |
| 15 | `15-budget.png` | Needs data | Needs `tripId` after creating a trip |
| 16 | `16-weather.png` | Captured | Forecast |
| 17 | `17-esim.png` | Captured | Catalog / offer links |
| 18 | `18-emergency.png` | Captured | Numbers + nearby help |
| 19 | `19-favorites.png` | Captured | Sign-in to save |
| 20 | `20-notifications.png` | Captured | In-app sample alerts |
| 21 | `21-profile.png` | Captured | Preferences + offline pack |
| 22 | Offline banner | Feature unavailable as static shot | Appears only when device is offline |
| — | `annotated/04-home-callouts.png` | Captured | Numbered markers |
| — | `annotated/05-explore-callouts.png` | Captured | Numbered markers |
| — | `annotated/12-ai-callouts.png` | Captured | Numbered markers |

## Features intentionally excluded from “fully working” claims

| Feature | Reason |
|---------|--------|
| Live hotel booking rates | OSM listings may lack bookable rates; mock mode uses sample prices |
| Real-time transit platforms / arrivals | Bus/train/rideshare often estimated |
| Push notifications | In-app samples only |
| eSIM in-app purchase | External provider links |
| Admin screens | Not for travelers |

## Features needing external APIs / accounts

- Sign-in + Create Trip + cloud favorites: Supabase auth (email confirmation)
- Live maps / places / weather / FX: network access
- AI natural language: optional Edge Function LLM keys
- Google / Apple sign-in: provider setup in Supabase
