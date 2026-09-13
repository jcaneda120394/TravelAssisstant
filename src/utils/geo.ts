import type { GeoPoint, Place } from '@/types/domain';

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in meters between two WGS84 points. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Always recompute distance from the user's origin coordinates.
 * Never trust provider-supplied distanceMeters (mocks used fixed Tokyo values).
 */
export function withDistanceFromOrigin(places: Place[], origin: GeoPoint): Place[] {
  return places.map((place) => ({
    ...place,
    distanceMeters: Math.round(
      haversineMeters(origin, {
        latitude: place.latitude,
        longitude: place.longitude,
      }),
    ),
  }));
}

/**
 * Keep only places whose coordinates are actually within radius of origin.
 */
export function filterPlacesWithinRadius(
  places: Place[],
  origin: GeoPoint,
  radiusMeters: number,
  slackMeters = 150,
): Place[] {
  const max = Math.max(0, radiusMeters) + Math.max(0, slackMeters);
  return withDistanceFromOrigin(places, origin).filter(
    (place) => (place.distanceMeters ?? Number.POSITIVE_INFINITY) <= max,
  );
}
