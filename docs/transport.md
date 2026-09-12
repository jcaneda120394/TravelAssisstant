# Transport Architecture

The **Intelligent Transport Engine** is a primary product differentiator.

## Goals

Help travelers understand **exactly how** to travel between A and B:

- modes, lines, stations, exits, platforms (when available)
- times, walking distance, transfers, fares, payment options
- alternatives + accessibility + service alerts
- traveler-aware ranking (kids, luggage, walking tolerance)

## Abstraction

`TransportProvider`:

- `getRoutes` / `getTransitRoutes` / `getDrivingRoutes` / `getWalkingRoutes` / `getCyclingRoutes`
- `getNearbyStops` / `getDepartures` / `getArrivals`
- `getFare` / `getServiceAlerts` / `getRouteDetails`

## Normalized models

- `Route` — summary (duration, cost, transfers, walking)
- `RouteSegment` — leg metadata
- `TransitStep` — station/line/platform/exit when provided by API
- `ServiceAlert` — disruptions from official/realtime feeds

## Comparison modes

Recommended · Fastest · Cheapest · Least Walking · Fewest Transfers · Most Accessible · Best With Luggage · Best For Families · Taxi/Rideshare

## Data integrity

Live schedules, platforms, and fares **must** come from reliable APIs or official GTFS/GTFS-RT / city feeds.  
Mock provider returns clearly labeled sample routes for UI development only.

## Phase 1

Interface + `MockTransportProvider` only.
