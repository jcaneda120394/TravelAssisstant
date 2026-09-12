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

type OsrmRouteResponse = {
  code: string;
  routes?: Array<{
    duration: number;
    distance: number;
    legs: Array<{
      duration: number;
      distance: number;
      steps: Array<{
        distance: number;
        duration: number;
        name?: string;
        maneuver: { type: string; modifier?: string; instruction?: string };
      }>;
    }>;
  }>;
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
  if (mode === 'walking') return 'walking';
  if (mode === 'cycling') return 'cycling';
  return null;
}

function modeLabel(mode: TransportMode): string {
  return mode.replace('_', ' ');
}

async function osrmRoute(
  profile: 'driving' | 'walking' | 'cycling',
  origin: GeoPoint,
  destination: GeoPoint,
  mode: TransportMode,
  tag?: Route['comparisonTag'],
): Promise<Route | null> {
  const url =
    `https://router.project-osrm.org/route/v1/${profile}/` +
    `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
    `?overview=false&steps=true`;

  const data = await fetchJson<OsrmRouteResponse>(url, {
    cacheTtlMs: 5 * 60_000,
    timeoutMs: 12_000,
  });
  const route = data.routes?.[0];
  if (!route) {
    return null;
  }

  const segments: RouteSegment[] = [];
  route.legs.forEach((leg, legIndex) => {
    leg.steps.forEach((step, stepIndex) => {
      const instruction =
        step.maneuver.instruction ??
        [step.maneuver.type, step.maneuver.modifier, step.name].filter(Boolean).join(' ');
      segments.push({
        id: `${profile}-${legIndex}-${stepIndex}`,
        mode,
        instruction: instruction || `${modeLabel(mode)} segment`,
        durationSeconds: Math.round(step.duration),
        distanceMeters: Math.round(step.distance),
        fromName: step.name || undefined,
      });
    });
  });

  return {
    id: `osrm-${profile}-${origin.latitude.toFixed(4)}-${destination.latitude.toFixed(4)}`,
    provider: 'osrm',
    summary: `${modeLabel(mode)} · ${Math.round(route.duration / 60)} min · ${(route.distance / 1000).toFixed(1)} km`,
    durationSeconds: Math.round(route.duration),
    walkingDistanceMeters: profile === 'walking' ? Math.round(route.distance) : 0,
    transferCount: 0,
    segments: segments.slice(0, 24),
    comparisonTag: tag,
    isMock: false,
    warnings:
      mode === 'bus' || mode === 'subway' || mode === 'metro' || mode === 'train'
        ? ['Live GTFS transit is not configured; showing OSRM road/path routing instead.']
        : undefined,
  };
}

export class OsrmTransportProvider implements TransportProvider {
  readonly name = 'osrm';

  async getRoutes(request: RouteRequest): Promise<Route[]> {
    const modes = request.modes?.length
      ? request.modes
      : (['walking', 'cycling', 'driving'] as TransportMode[]);
    const routes: Route[] = [];
    for (const mode of modes) {
      const profile = profileForMode(mode);
      if (!profile) {
        // Transit-like modes: approximate with walking + driving for comparison
        const walking = await osrmRoute(
          'walking',
          request.origin,
          request.destination,
          'walking',
          'least_walking',
        );
        const driving = await osrmRoute(
          'driving',
          request.origin,
          request.destination,
          'driving',
          'fastest',
        );
        if (walking) routes.push({ ...walking, warnings: ['Transit GTFS not configured — walking alternative.'] });
        if (driving) routes.push({ ...driving, comparisonTag: 'taxi_rideshare' });
        continue;
      }
      const route = await osrmRoute(profile, request.origin, request.destination, mode);
      if (route) {
        routes.push(route);
      }
    }

    if (routes.length) {
      const fastest = [...routes].sort((a, b) => a.durationSeconds - b.durationSeconds)[0];
      if (fastest && !fastest.comparisonTag) {
        fastest.comparisonTag = 'recommended';
      }
    }
    return routes;
  }

  async getTransitRoutes(request: RouteRequest): Promise<Route[]> {
    return this.getRoutes({ ...request, modes: ['walking', 'driving'] });
  }

  async getDrivingRoutes(request: RouteRequest): Promise<Route[]> {
    return this.getRoutes({ ...request, modes: ['driving'] });
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
