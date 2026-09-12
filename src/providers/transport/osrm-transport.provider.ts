import { fetchJson, fetchText } from '@/lib/http/fetch-json';
import type {
  Departure,
  NearbyStopsParams,
  PlaceStop,
  RouteRequest,
  ServiceAlert,
  TransportProvider,
} from '@/providers/transport/transport.provider';
import type { GeoPoint, Route, RouteSegment, TransportMode } from '@/types/domain';
import { applyComparisonTags } from '@/utils/route-compare';
import { withFlightOption } from '@/services/transport/flight-route.service';

type OsrmStep = {
  distance: number;
  duration: number;
  name?: string;
  ref?: string;
  mode?: string;
  maneuver: {
    type: string;
    modifier?: string;
    instruction?: string;
    location?: [number, number];
    exit?: number;
  };
};

type OsrmRoute = {
  duration: number;
  distance: number;
  geometry?: {
    type: 'LineString';
    coordinates: Array<[number, number]>;
  };
  legs: Array<{
    duration: number;
    distance: number;
    summary?: string;
    steps: OsrmStep[];
  }>;
};

type OsrmRouteResponse = {
  code: string;
  routes?: OsrmRoute[];
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function profileForMode(mode: TransportMode): 'driving' | 'walking' | 'cycling' | null {
  if (mode === 'driving' || mode === 'taxi' || mode === 'rideshare') return 'driving';
  if (mode === 'bus' || mode === 'train') return 'driving';
  if (mode === 'walking') return 'walking';
  if (mode === 'cycling') return 'cycling';
  return null;
}

function modeLabel(mode: TransportMode): string {
  switch (mode) {
    case 'rideshare':
      return 'Rideshare';
    case 'driving':
      return 'Driving';
    case 'walking':
      return 'Walking';
    case 'cycling':
      return 'Cycling';
    case 'bus':
      return 'Bus';
    case 'train':
      return 'Train';
    case 'flight':
      return 'Flight';
    default:
      return mode.replace('_', ' ');
  }
}

function estimateCost(mode: TransportMode, distanceMeters: number): number | undefined {
  const km = distanceMeters / 1000;
  switch (mode) {
    case 'walking':
    case 'cycling':
      return 0;
    case 'bus':
      return Math.round(Math.max(1.5, 1.2 + km * 0.25) * 10) / 10;
    case 'train':
    case 'subway':
    case 'metro':
      return Math.round(Math.max(2.5, 2 + km * 0.4) * 10) / 10;
    case 'taxi':
    case 'rideshare':
      return Math.round(Math.max(8, 5 + km * 1.6) * 10) / 10;
    case 'driving':
      return Math.round(Math.max(4, km * 0.45) * 10) / 10;
    case 'flight':
      return Math.round(Math.max(80, 55 + km * 0.09));
    default:
      return undefined;
  }
}

function adjustDuration(mode: TransportMode, durationSeconds: number): number {
  switch (mode) {
    case 'bus':
      return Math.round(durationSeconds * 1.35);
    case 'train':
      return Math.round(durationSeconds * 0.95);
    case 'taxi':
    case 'rideshare':
      return Math.round(durationSeconds * 1.05);
    default:
      return Math.round(durationSeconds);
  }
}

/** Google Maps–style turn instructions from OSRM maneuvers. */
export function formatOsrmInstruction(step: OsrmStep): string {
  if (step.maneuver.instruction?.trim()) {
    return step.maneuver.instruction.trim();
  }

  const type = (step.maneuver.type || '').toLowerCase();
  const modifier = (step.maneuver.modifier || '').replace(/_/g, ' ').trim();
  const street = (step.name || step.ref || '').trim();
  const onto = street ? ` onto ${street}` : '';
  const on = street ? ` on ${street}` : '';
  const exitNum = step.maneuver.exit;

  switch (type) {
    case 'depart':
      return street ? `Head out on ${street}` : 'Depart from your location';
    case 'arrive':
      return street ? `Arrive at your destination on ${street}` : 'Arrive at your destination';
    case 'turn':
      return `Turn ${modifier || 'ahead'}${onto}`;
    case 'new name':
      return street ? `Continue straight on ${street}` : 'Continue straight';
    case 'end of road':
      return `At the end of the road, turn ${modifier || 'ahead'}${onto}`;
    case 'fork':
      return `Keep ${modifier || 'straight'} at the fork${onto}`;
    case 'merge':
      return `Merge ${modifier}${onto}`.replace(/\s+/g, ' ').trim();
    case 'on ramp':
      return `Take the on-ramp${onto}`;
    case 'off ramp':
      return `Take the off-ramp${onto}`;
    case 'ramp':
      return `Take the ramp${onto}`;
    case 'roundabout':
    case 'rotary':
      return exitNum
        ? `At the roundabout, take exit ${exitNum}${onto}`
        : `Enter the roundabout${onto}`;
    case 'exit roundabout':
    case 'exit rotary':
      return `Exit the roundabout${onto}`;
    case 'roundabout turn':
      return `At the roundabout, turn ${modifier || 'ahead'}${onto}`;
    case 'notification':
      return street ? `Continue on ${street}` : 'Continue along the route';
    case 'continue':
      return street ? `Continue ${modifier || 'straight'} on ${street}` : `Continue ${modifier || 'straight'}`;
    case 'use lane':
      return `Use the indicated lane${on}`;
    default: {
      const parts = [type.replace(/_/g, ' '), modifier, street ? `(${street})` : '']
        .filter(Boolean)
        .join(' ');
      return parts || 'Continue';
    }
  }
}

function viaStreetsFromSteps(steps: OsrmStep[]): string {
  const scored = new Map<string, number>();
  for (const step of steps) {
    const name = (step.name || '').trim();
    if (!name || name.length < 2) continue;
    if (/^unnamed|unknown$/i.test(name)) continue;
    scored.set(name, (scored.get(name) ?? 0) + (step.distance || 0));
  }
  const top = [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 2);
  if (top.length === 0) return '';
  if (top.length === 1) return `via ${top[0]}`;
  return `via ${top[0]} and ${top[1]}`;
}

function buildRouteFromOsrm(
  route: OsrmRoute,
  origin: GeoPoint,
  destination: GeoPoint,
  mode: TransportMode,
  tag: Route['comparisonTag'] | undefined,
  altIndex: number,
): Route {
  const geometry: GeoPoint[] = (route.geometry?.coordinates ?? []).map(([lon, lat]) => ({
    latitude: lat,
    longitude: lon,
  }));

  const durationSeconds = adjustDuration(mode, route.duration);
  const distanceMeters = Math.round(route.distance);
  const accessWalk =
    mode === 'bus' ? 420 : mode === 'train' ? 580 : mode === 'rideshare' || mode === 'taxi' ? 80 : 0;

  const segments: RouteSegment[] = [];
  if (accessWalk > 0 && (mode === 'bus' || mode === 'train')) {
    segments.push({
      id: `${mode}-access-walk-${altIndex}`,
      mode: 'walking',
      instruction:
        mode === 'bus'
          ? 'Walk to the nearest bus stop'
          : 'Walk to the nearest train / transit station',
      durationSeconds: Math.round(accessWalk / 1.3),
      distanceMeters: accessWalk,
      direction: 'Access',
    });
  }

  const allSteps: OsrmStep[] = [];
  route.legs.forEach((leg, legIndex) => {
    leg.steps.forEach((step, stepIndex) => {
      allSteps.push(step);
      const instruction = formatOsrmInstruction(step);
      const street = (step.name || step.ref || '').trim() || undefined;
      segments.push({
        id: `${mode}-${altIndex}-${legIndex}-${stepIndex}`,
        mode: mode === 'bus' || mode === 'train' ? mode : mode,
        instruction,
        durationSeconds: Math.round(step.duration),
        distanceMeters: Math.round(step.distance),
        fromName: street,
        lineName: street,
        direction: step.maneuver.modifier?.replace(/_/g, ' '),
        exit:
          step.maneuver.exit != null ? `Exit ${step.maneuver.exit}` : undefined,
      });
    });
  });

  if (accessWalk > 0 && (mode === 'bus' || mode === 'train')) {
    segments.push({
      id: `${mode}-egress-walk-${altIndex}`,
      mode: 'walking',
      instruction: 'Walk from the stop to your destination',
      durationSeconds: Math.round(accessWalk / 1.4),
      distanceMeters: Math.round(accessWalk * 0.85),
      direction: 'Egress',
    });
  }

  const via = viaStreetsFromSteps(allSteps);
  const legSummary = route.legs.map((leg) => leg.summary).filter(Boolean).join(', ');
  const viaLine = via || (legSummary ? `via ${legSummary}` : '');
  const summary = viaLine || `${modeLabel(mode)} route`;

  const warnings: string[] = [];
  if (mode === 'bus' || mode === 'train') {
    warnings.push(
      'Live transit schedules are not connected yet — this is a road-based estimate. Check boards on site.',
    );
  }
  if (mode === 'rideshare' || mode === 'taxi') {
    warnings.push('Fare is an estimate only — not a live rideshare quote.');
  }
  if (mode === 'driving' && allSteps.some((s) => /private|restricted/i.test(s.name || ''))) {
    warnings.push('This route may include restricted or private roads.');
  }

  return {
    id: `osrm-${mode}-${altIndex}-${origin.latitude.toFixed(4)}-${destination.latitude.toFixed(4)}`,
    provider: 'osrm',
    summary,
    durationSeconds,
    walkingDistanceMeters: profileForMode(mode) === 'walking' ? distanceMeters : accessWalk,
    transferCount: mode === 'bus' || mode === 'train' ? 1 : 0,
    estimatedCost: estimateCost(mode, distanceMeters),
    currency: 'USD',
    geometry: geometry.length ? geometry : [origin, destination],
    segments,
    comparisonTag: tag,
    isMock: false,
    warnings: warnings.length ? warnings : undefined,
  };
}

async function fetchOsrmRoutes(
  profile: 'driving' | 'walking' | 'cycling',
  origin: GeoPoint,
  destination: GeoPoint,
  alternatives: boolean,
): Promise<OsrmRoute[]> {
  const url =
    `https://router.project-osrm.org/route/v1/${profile}/` +
    `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
    `?overview=full&geometries=geojson&steps=true` +
    (alternatives ? '&alternatives=true' : '');

  const data = await fetchJson<OsrmRouteResponse>(url, {
    cacheTtlMs: 5 * 60_000,
    timeoutMs: 12_000,
  });
  return data.routes ?? [];
}

async function osrmRoutesForMode(
  mode: TransportMode,
  origin: GeoPoint,
  destination: GeoPoint,
  tag?: Route['comparisonTag'],
): Promise<Route[]> {
  const profile = profileForMode(mode);
  if (!profile) return [];

  const wantAlts = mode === 'driving' || mode === 'rideshare';
  const rawRoutes = await fetchOsrmRoutes(profile, origin, destination, wantAlts);
  return rawRoutes.map((route, index) =>
    buildRouteFromOsrm(route, origin, destination, mode, tag, index),
  );
}

export class OsrmTransportProvider implements TransportProvider {
  readonly name = 'osrm';

  async getRoutes(request: RouteRequest): Promise<Route[]> {
    const modes = request.modes?.length
      ? request.modes
      : ([
          'driving',
          'walking',
          'cycling',
          'rideshare',
          'bus',
          'train',
        ] as TransportMode[]);

    const settled = await Promise.all(
      modes.map(async (mode) => {
        const modeTag: Route['comparisonTag'] =
          mode === 'bus'
            ? 'bus'
            : mode === 'train'
              ? 'train'
              : mode === 'rideshare' || mode === 'taxi'
                ? 'taxi_rideshare'
                : undefined;
        try {
          return await osrmRoutesForMode(mode, request.origin, request.destination, modeTag);
        } catch {
          return [] as Route[];
        }
      }),
    );

    const routes = settled.flat().filter((route): route is Route => route != null);
    const withFlight = await withFlightOption(request.origin, request.destination, routes);
    return applyComparisonTags(withFlight);
  }

  async getTransitRoutes(request: RouteRequest): Promise<Route[]> {
    return this.getRoutes({ ...request, modes: ['walking', 'bus', 'train', 'rideshare'] });
  }

  async getDrivingRoutes(request: RouteRequest): Promise<Route[]> {
    return this.getRoutes({ ...request, modes: ['driving', 'rideshare'] });
  }

  async getWalkingRoutes(request: RouteRequest): Promise<Route[]> {
    return this.getRoutes({ ...request, modes: ['walking'] });
  }

  async getCyclingRoutes(request: RouteRequest): Promise<Route[]> {
    return this.getRoutes({ ...request, modes: ['cycling'] });
  }

  async getNearbyStops(params: NearbyStopsParams): Promise<PlaceStop[]> {
    const radius = Math.min(Math.max(params.radiusMeters, 200), 3000);
    const query = `
      [out:json][timeout:25];
      (
        node["railway"~"station|halt|tram_stop|subway_entrance"](around:${radius},${params.location.latitude},${params.location.longitude});
        node["highway"="bus_stop"](around:${radius},${params.location.latitude},${params.location.longitude});
      );
      out center 30;
    `;
    const raw = await fetchText('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `data=${encodeURIComponent(query)}`,
    });
    const parsed = JSON.parse(raw) as { elements?: OverpassElement[] };
    return (parsed.elements ?? [])
      .map((element) => {
        const lat = element.lat ?? element.center?.lat;
        const lon = element.lon ?? element.center?.lon;
        const name = element.tags?.name;
        if (lat == null || lon == null || !name) {
          return null;
        }
        const modes: TransportMode[] = [];
        if (element.tags?.highway === 'bus_stop') modes.push('bus');
        if (element.tags?.railway?.includes('subway')) modes.push('subway');
        if (element.tags?.railway?.includes('tram')) modes.push('tram');
        if (element.tags?.railway) modes.push('train');
        return {
          id: `stop-${element.type}-${element.id}`,
          name,
          latitude: lat,
          longitude: lon,
          modes: modes.length ? modes : ['other'],
        } satisfies PlaceStop;
      })
      .filter((stop): stop is PlaceStop => stop != null);
  }

  async getDepartures(_stopId: string): Promise<Departure[]> {
    return [];
  }

  async getArrivals(_stopId: string): Promise<Departure[]> {
    return [];
  }

  async getFare(_routeId: string): Promise<{ amount: number; currency: string } | null> {
    return null;
  }

  async getServiceAlerts(_location?: GeoPoint): Promise<ServiceAlert[]> {
    return [];
  }

  async getRouteDetails(routeId: string): Promise<Route | null> {
    return {
      id: routeId,
      provider: 'osrm',
      summary: 'Cached OSRM route',
      durationSeconds: 0,
      walkingDistanceMeters: 0,
      transferCount: 0,
      segments: [],
      isMock: false,
    };
  }
}
