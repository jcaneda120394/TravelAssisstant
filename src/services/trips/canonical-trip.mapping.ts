/**
 * Canonical Trip model mapping onto persistence.
 *
 * | Domain              | Table / storage                                      |
 * |---------------------|------------------------------------------------------|
 * | Trip                | trips (+ destinations[] labels for quick display)    |
 * | TripDestination     | trip_destinations                                    |
 * | ItineraryDayMeta    | itinerary_days (title/city/summary; activities flat) |
 * | ItineraryItem       | itinerary_items (item_kind = kind)                   |
 * | TransportSegment    | transport_segments (selected_route = Route jsonb)    |
 * | TripAccommodation   | trip_accommodations                                  |
 * | Budget              | budgets                                              |
 *
 * Activities stay flat on itinerary_items. Days are calendar ISO dates;
 * itinerary_days holds optional metadata. Do not invent parallel suggestion tables.
 */

export const CANONICAL_TRIP_TABLES = [
  'trips',
  'trip_destinations',
  'itinerary_days',
  'itinerary_items',
  'transport_segments',
  'trip_accommodations',
  'budgets',
] as const;
