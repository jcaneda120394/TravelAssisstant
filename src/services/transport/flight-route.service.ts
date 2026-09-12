import { fetchNominatimJson } from '@/lib/http/nominatim';
import { fetchText } from '@/lib/http/fetch-json';
import type { GeoPoint, Route, RouteSegment } from '@/types/domain';

const CROSS_BORDER_FLIGHT_KM = 400;
const LONG_HAUL_FLIGHT_KM = 800;

type AirportStop = {
  id: string;
  name: string;
  iata?: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
};

type NominatimReverse = {
  address?: {
    country_code?: string;
    country?: string;
  };
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Well-known hubs as fallback when Overpass is empty. */
const HUB_AIRPORTS: Array<Omit<AirportStop, 'distanceMeters'>> = [
  { id: 'hub-mnl', name: 'Ninoy Aquino International Airport (MNL)', iata: 'MNL', latitude: 14.5086, longitude: 121.0198 },
  { id: 'hub-crk', name: 'Clark International Airport (CRK)', iata: 'CRK', latitude: 15.186, longitude: 120.56 },
  { id: 'hub-hnd', name: 'Tokyo Haneda Airport (HND)', iata: 'HND', latitude: 35.5494, longitude: 139.7798 },
  { id: 'hub-nrt', name: 'Narita International Airport (NRT)', iata: 'NRT', latitude: 35.772, longitude: 140.3929 },
  { id: 'hub-kix', name: 'Kansai International Airport (KIX)', iata: 'KIX', latitude: 34.4347, longitude: 135.244 },
  { id: 'hub-icn', name: 'Incheon International Airport (ICN)', iata: 'ICN', latitude: 37.4602, longitude: 126.4407 },
  { id: 'hub-hkg', name: 'Hong Kong International Airport (HKG)', iata: 'HKG', latitude: 22.308, longitude: 113.9185 },
  { id: 'hub-sin', name: 'Singapore Changi Airport (SIN)', iata: 'SIN', latitude: 1.3644, longitude: 103.9915 },
  { id: 'hub-bkk', name: 'Suvarnabhumi Airport (BKK)', iata: 'BKK', latitude: 13.69, longitude: 100.7501 },
  { id: 'hub-lax', name: 'Los Angeles International Airport (LAX)', iata: 'LAX', latitude: 33.9425, longitude: -118.4081 },
  { id: 'hub-jfk', name: 'John F. Kennedy International Airport (JFK)', iata: 'JFK', latitude: 40.6413, longitude: -73.7781 },
  { id: 'hub-lhr', name: 'London Heathrow Airport (LHR)', iata: 'LHR', latitude: 51.47, longitude: -0.4543 },
  { id: 'hub-cdg', name: 'Paris Charles de Gaulle Airport (CDG)', iata: 'CDG', latitude: 49.0097, longitude: 2.5479 },
  { id: 'hub-dxb', name: 'Dubai International Airport (DXB)', iata: 'DXB', latitude: 25.2532, longitude: 55.3657 },
  { id: 'hub-syd', name: 'Sydney Kingsford Smith Airport (SYD)', iata: 'SYD', latitude: -33.9399, longitude: 151.1753 },
];

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6_371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function greatCirclePoints(a: GeoPoint, b: GeoPoint, steps = 12): GeoPoint[] {
  const points: GeoPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      latitude: a.latitude + (b.latitude - a.latitude) * t,
      longitude: a.longitude + (b.longitude - a.longitude) * t,
    });
  }
  return points;
}

export async function reverseCountryCode(point: GeoPoint): Promise<string | null> {
  try {
    const data = await fetchNominatimJson<NominatimReverse>(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.latitude}&lon=${point.longitude}&zoom=3`,
      { cacheTtlMs: 24 * 60 * 60_000, timeoutMs: 8_000 },
    );
    const code = data.address?.country_code?.toUpperCase();
    return code && code.length === 2 ? code : null;
  } catch {
    return null;
  }
}

async function overpassAirportsNear(point: GeoPoint, radiusMeters: number): Promise<AirportStop[]> {
  const query = `
    [out:json][timeout:20];
    (
      node["aeroway"="aerodrome"](around:${radiusMeters},${point.latitude},${point.longitude});
      way["aeroway"="aerodrome"](around:${radiusMeters},${point.latitude},${point.longitude});
      relation["aeroway"="aerodrome"](around:${radiusMeters},${point.latitude},${point.longitude});
    );
    out center tags 20;
  `;
  try {
    const raw = await fetchText('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `data=${encodeURIComponent(query)}`,
      cacheTtlMs: 6 * 60 * 60_000,
      timeoutMs: 18_000,
    });
    const parsed = JSON.parse(raw) as { elements?: OverpassElement[] };
    const ranked: Array<AirportStop & { international: boolean }> = [];
    for (const el of parsed.elements ?? []) {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      const name = el.tags?.name ?? el.tags?.['name:en'];
      if (lat == null || lon == null || !name) continue;
      const iata = el.tags?.iata;
      const international =
        /international|intl/i.test(name) ||
        el.tags?.['aerodrome:type'] === 'international' ||
        Boolean(iata);
      ranked.push({
        id: `airport-${el.type}-${el.id}`,
        name: iata ? `${name} (${iata})` : name,
        iata,
        latitude: lat,
        longitude: lon,
        distanceMeters: Math.round(haversineKm(point, { latitude: lat, longitude: lon }) * 1000),
        international,
      });
    }
    return ranked
      .sort((a, b) => {
        const scoreA = a.distanceMeters - (a.international ? 40_000 : 0);
        const scoreB = b.distanceMeters - (b.international ? 40_000 : 0);
        return scoreA - scoreB;
      })
      .map(({ international: _ignored, ...rest }) => rest);
  } catch {
    return [];
  }
}

function hubAirportsNear(point: GeoPoint): AirportStop[] {
  return HUB_AIRPORTS.map((hub) => ({
    ...hub,
    distanceMeters: Math.round(haversineKm(point, hub) * 1000),
  })).sort((a, b) => a.distanceMeters - b.distanceMeters);
}

async function nearestAirport(point: GeoPoint): Promise<AirportStop> {
  const live = await overpassAirportsNear(point, 120_000);
  if (live[0]) return live[0];
  const expanded = await overpassAirportsNear(point, 250_000);
  if (expanded[0]) return expanded[0];
  return hubAirportsNear(point)[0]!;
}

function estimateFlightDurationSeconds(distanceKm: number): number {
  // Cruise ~780 km/h + climb/descent buffer
  const airHours = distanceKm / 780;
  return Math.round((airHours + 0.75) * 3600);
}

function estimateFlightCostUsd(distanceKm: number): number {
  return Math.round(Math.max(80, 55 + distanceKm * 0.09));
}

export type CrossBorderDecision = {
  shouldOfferFlight: boolean;
  originCountry: string | null;
  destinationCountry: string | null;
  distanceKm: number;
  reason: 'different_country' | 'long_distance' | 'local';
};

export async function decideCrossBorderFlight(
  origin: GeoPoint,
  destination: GeoPoint,
): Promise<CrossBorderDecision> {
  const distanceKm = haversineKm(origin, destination);
  const [originCountry, destinationCountry] = await Promise.all([
    reverseCountryCode(origin),
    reverseCountryCode(destination),
  ]);

  if (
    originCountry &&
    destinationCountry &&
    originCountry !== destinationCountry &&
    distanceKm >= CROSS_BORDER_FLIGHT_KM
  ) {
    return {
      shouldOfferFlight: true,
      originCountry,
      destinationCountry,
      distanceKm,
      reason: 'different_country',
    };
  }

  if (distanceKm >= LONG_HAUL_FLIGHT_KM) {
    return {
      shouldOfferFlight: true,
      originCountry,
      destinationCountry,
      distanceKm,
      reason: 'long_distance',
    };
  }

  return {
    shouldOfferFlight: false,
    originCountry,
    destinationCountry,
    distanceKm,
    reason: 'local',
  };
}

/**
 * Build an estimated multi-leg flight itinerary when origin & destination
 * are in different countries (or very far apart).
 */
export async function buildFlightRoute(
  origin: GeoPoint,
  destination: GeoPoint,
  decision?: CrossBorderDecision,
): Promise<Route | null> {
  const verdict = decision ?? (await decideCrossBorderFlight(origin, destination));
  if (!verdict.shouldOfferFlight) return null;

  const [originAirport, destAirport] = await Promise.all([
    nearestAirport(origin),
    nearestAirport(destination),
  ]);

  // Avoid nonsense same-airport "flights".
  const airportGapKm = haversineKm(originAirport, destAirport);
  if (airportGapKm < 250) return null;

  const toAirportKm = originAirport.distanceMeters / 1000;
  const fromAirportKm = destAirport.distanceMeters / 1000;
  const flightKm = airportGapKm;

  const groundToSec = Math.round(Math.max(25, toAirportKm * 2.2) * 60);
  const flightSec = estimateFlightDurationSeconds(flightKm);
  const groundFromSec = Math.round(Math.max(25, fromAirportKm * 2.2) * 60);
  const airportBufferSec = 2.5 * 3600; // check-in / security / immigration estimate
  const totalSec = groundToSec + airportBufferSec + flightSec + groundFromSec;

  const countryLabel =
    verdict.originCountry && verdict.destinationCountry
      ? `${verdict.originCountry} → ${verdict.destinationCountry}`
      : 'International';

  const segments: RouteSegment[] = [
    {
      id: 'flight-to-airport',
      mode: 'rideshare',
      instruction: `Travel to ${originAirport.name}`,
      durationSeconds: groundToSec,
      distanceMeters: originAirport.distanceMeters,
      fromName: 'Your location',
      toName: originAirport.name,
    },
    {
      id: 'flight-airport-process',
      mode: 'other',
      instruction: 'Airport check-in, security, and boarding buffer',
      durationSeconds: Math.round(airportBufferSec * 0.55),
      fromName: originAirport.name,
      toName: originAirport.name,
    },
    {
      id: 'flight-air',
      mode: 'flight',
      instruction: `Fly ${originAirport.iata ?? originAirport.name} → ${destAirport.iata ?? destAirport.name}`,
      durationSeconds: flightSec,
      distanceMeters: Math.round(flightKm * 1000),
      lineName: 'Flight (estimate)',
      fromName: originAirport.name,
      toName: destAirport.name,
      fareAmount: estimateFlightCostUsd(flightKm),
      fareCurrency: 'USD',
    },
    {
      id: 'flight-arrival-process',
      mode: 'other',
      instruction: 'Immigration, baggage claim, and customs buffer',
      durationSeconds: Math.round(airportBufferSec * 0.45),
      fromName: destAirport.name,
      toName: destAirport.name,
    },
    {
      id: 'flight-from-airport',
      mode: 'rideshare',
      instruction: `Travel from ${destAirport.name} to destination`,
      durationSeconds: groundFromSec,
      distanceMeters: destAirport.distanceMeters,
      fromName: destAirport.name,
      toName: 'Destination',
    },
  ];

  const geometry = [
    origin,
    { latitude: originAirport.latitude, longitude: originAirport.longitude },
    ...greatCirclePoints(
      { latitude: originAirport.latitude, longitude: originAirport.longitude },
      { latitude: destAirport.latitude, longitude: destAirport.longitude },
      16,
    ),
    { latitude: destAirport.latitude, longitude: destAirport.longitude },
    destination,
  ];

  return {
    id: `flight-${originAirport.id}-${destAirport.id}`,
    provider: 'flight-estimate',
    summary: `Flight · ${countryLabel} · via ${originAirport.iata ?? 'origin'} → ${destAirport.iata ?? 'dest'}`,
    durationSeconds: totalSec,
    walkingDistanceMeters: 800,
    transferCount: 2,
    estimatedCost: estimateFlightCostUsd(flightKm),
    currency: 'USD',
    geometry,
    segments,
    comparisonTag: 'flight',
    warnings: [
      'Estimated flight itinerary — not a live booking.',
      'Confirm airlines, schedules, visas, and airport transfer options.',
      verdict.reason === 'different_country'
        ? `Cross-border trip detected (${verdict.originCountry} → ${verdict.destinationCountry}).`
        : `Long-distance trip (~${Math.round(verdict.distanceKm)} km) — flight recommended.`,
    ],
  };
}

/** Prepend flight option when relevant; keep local modes for short legs. */
export async function withFlightOption(
  origin: GeoPoint,
  destination: GeoPoint,
  localRoutes: Route[],
): Promise<Route[]> {
  const decision = await decideCrossBorderFlight(origin, destination);
  if (!decision.shouldOfferFlight) {
    return localRoutes;
  }

  const flight = await buildFlightRoute(origin, destination, decision);
  if (!flight) {
    return localRoutes;
  }

  // For true cross-border trips, deprioritize absurd land-only OSRM routes.
  const filtered =
    decision.reason === 'different_country'
      ? localRoutes.filter((route) => {
          const km =
            route.segments.reduce((sum, s) => sum + (s.distanceMeters ?? 0), 0) / 1000 ||
            decision.distanceKm;
          // Keep only short local-looking options; drop ocean-crossing drive/walk.
          return km < decision.distanceKm * 0.35 || route.durationSeconds < 6 * 3600;
        })
      : localRoutes;

  return [flight, ...filtered];
}
