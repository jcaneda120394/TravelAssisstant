import type {
  Departure,
  NearbyStopsParams,
  PlaceStop,
  RouteRequest,
  ServiceAlert,
  TransportProvider,
} from '@/providers/transport/transport.provider';
import type { GeoPoint, Route } from '@/types/domain';
import { applyComparisonTags } from '@/utils/route-compare';
import { withFlightOption } from '@/services/transport/flight-route.service';

function isoPlusMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/** Simple curved path so mock routes still draw on the map. */
function mockGeometry(origin: GeoPoint, destination: GeoPoint): GeoPoint[] {
  const mid: GeoPoint = {
    latitude: (origin.latitude + destination.latitude) / 2 + 0.004,
    longitude: (origin.longitude + destination.longitude) / 2 - 0.003,
  };
  const q1: GeoPoint = {
    latitude: origin.latitude * 0.75 + mid.latitude * 0.25,
    longitude: origin.longitude * 0.75 + mid.longitude * 0.25,
  };
  const q3: GeoPoint = {
    latitude: mid.latitude * 0.25 + destination.latitude * 0.75,
    longitude: mid.longitude * 0.25 + destination.longitude * 0.75,
  };
  return [origin, q1, mid, q3, destination];
}

function withGeometry(route: Route, request: RouteRequest): Route {
  return {
    ...route,
    geometry: mockGeometry(request.origin, request.destination),
  };
}

function baseTransit(): Route {
  return {
    id: 'mock-route-transit-1',
    provider: 'mock',
    summary: 'Walk → Subway → Walk',
    durationSeconds: 42 * 60,
    walkingDistanceMeters: 780,
    transferCount: 1,
    departureAt: isoPlusMinutes(8),
    arrivalAt: isoPlusMinutes(50),
    estimatedCost: 2.8,
    currency: 'USD',
    comparisonTag: 'recommended',
    isMock: true,
    warnings: [
      'Mock transit data only — never treat as live schedules, platforms, or fares.',
    ],
    segments: [
      {
        id: 'seg-1',
        mode: 'walking',
        instruction: 'Walk to Sample Central Station',
        durationSeconds: 6 * 60,
        distanceMeters: 420,
        toName: 'Sample Central Station',
        entrance: 'Exit A1 (mock)',
      },
      {
        id: 'seg-2',
        mode: 'subway',
        instruction: 'Take Sample Line toward North Terminal',
        durationSeconds: 28 * 60,
        lineName: 'Sample Line',
        direction: 'North Terminal',
        fromName: 'Sample Central',
        toName: 'Harbor Bay',
        platform: 'Platform 2 (mock)',
        exit: 'Exit B3 (mock)',
      },
      {
        id: 'seg-3',
        mode: 'walking',
        instruction: 'Walk to destination entrance',
        durationSeconds: 8 * 60,
        distanceMeters: 360,
        fromName: 'Harbor Bay Station',
      },
    ],
  };
}

export class MockTransportProvider implements TransportProvider {
  readonly name = 'mock-transport';

  async getRoutes(request: RouteRequest): Promise<Route[]> {
    const transit = await this.getTransitRoutes(request);
    const walking = await this.getWalkingRoutes(request);
    const driving = await this.getDrivingRoutes(request);
    const local = applyComparisonTags([...transit, ...walking, ...driving]);
    return withFlightOption(request.origin, request.destination, local);
  }

  async getTransitRoutes(request: RouteRequest): Promise<Route[]> {
    const recommended = withGeometry(baseTransit(), request);
    const fewestTransfers = withGeometry(
      {
        ...baseTransit(),
        id: 'mock-route-transit-direct',
        summary: 'Walk → Express subway → Walk',
        transferCount: 0,
        durationSeconds: 48 * 60,
        walkingDistanceMeters: 1100,
        comparisonTag: 'fewest_transfers',
        estimatedCost: 3.2,
        arrivalAt: isoPlusMinutes(56),
      },
      request,
    );
    const leastWalking = withGeometry(
      {
        ...baseTransit(),
        id: 'mock-route-transit-least-walk',
        summary: 'Short walk → Subway → Elevator exit',
        walkingDistanceMeters: 320,
        durationSeconds: 45 * 60,
        comparisonTag: 'least_walking',
        arrivalAt: isoPlusMinutes(53),
      },
      request,
    );
    const accessible = withGeometry(
      {
        ...baseTransit(),
        id: 'mock-route-transit-accessible',
        summary: 'Elevator-friendly subway route',
        comparisonTag: 'most_accessible',
        durationSeconds: 50 * 60,
        warnings: [
          ...(baseTransit().warnings ?? []),
          'Uses elevator-equipped mock stations only.',
        ],
      },
      request,
    );
    const family = withGeometry(
      {
        ...baseTransit(),
        id: 'mock-route-transit-family',
        summary: 'Fewer stairs, simpler transfer',
        comparisonTag: 'best_for_families',
        transferCount: 0,
        durationSeconds: 52 * 60,
      },
      request,
    );
    const bus = withGeometry(
      {
        ...baseTransit(),
        id: 'mock-route-bus',
        summary: 'Walk → Bus → Walk',
        durationSeconds: 55 * 60,
        walkingDistanceMeters: 520,
        transferCount: 0,
        comparisonTag: 'bus',
        estimatedCost: 2.0,
        arrivalAt: isoPlusMinutes(63),
        segments: [
          {
            id: 'bus-walk-1',
            mode: 'walking',
            instruction: 'Walk to Sample Bus Stop',
            durationSeconds: 5 * 60,
            distanceMeters: 280,
            toName: 'Sample Bus Stop',
          },
          {
            id: 'bus-ride',
            mode: 'bus',
            instruction: 'Take Bus 42 toward Harbor',
            durationSeconds: 42 * 60,
            lineName: 'Bus 42',
            direction: 'Harbor',
            fromName: 'Sample Bus Stop',
            toName: 'Harbor Bay',
          },
          {
            id: 'bus-walk-2',
            mode: 'walking',
            instruction: 'Walk to destination',
            durationSeconds: 8 * 60,
            distanceMeters: 240,
          },
        ],
      },
      request,
    );
    const train = withGeometry(
      {
        ...baseTransit(),
        id: 'mock-route-train',
        summary: 'Walk → Train → Walk',
        durationSeconds: 38 * 60,
        walkingDistanceMeters: 640,
        transferCount: 0,
        comparisonTag: 'train',
        estimatedCost: 4.5,
        arrivalAt: isoPlusMinutes(46),
        segments: [
          {
            id: 'train-walk-1',
            mode: 'walking',
            instruction: 'Walk to Sample Central Station',
            durationSeconds: 7 * 60,
            distanceMeters: 380,
            toName: 'Sample Central Station',
          },
          {
            id: 'train-ride',
            mode: 'train',
            instruction: 'Take Sample Express toward Harbor Bay',
            durationSeconds: 24 * 60,
            lineName: 'Sample Express',
            direction: 'Harbor Bay',
            fromName: 'Sample Central',
            toName: 'Harbor Bay',
            platform: 'Platform 5 (mock)',
          },
          {
            id: 'train-walk-2',
            mode: 'walking',
            instruction: 'Walk to destination',
            durationSeconds: 7 * 60,
            distanceMeters: 260,
          },
        ],
      },
      request,
    );
    return [recommended, fewestTransfers, leastWalking, accessible, family, bus, train];
  }

  async getDrivingRoutes(request: RouteRequest): Promise<Route[]> {
    return [
      withGeometry(
        {
          id: 'mock-route-driving-1',
          provider: 'mock',
          summary: 'Taxi / rideshare',
          durationSeconds: 22 * 60,
          walkingDistanceMeters: 80,
          transferCount: 0,
          departureAt: isoPlusMinutes(3),
          arrivalAt: isoPlusMinutes(25),
          estimatedCost: 18,
          currency: 'USD',
          comparisonTag: 'taxi_rideshare',
          isMock: true,
          warnings: ['Mock estimate only — not a live fare quote.'],
          segments: [
            {
              id: 'drive-1',
              mode: 'rideshare',
              instruction: 'Ride to destination',
              durationSeconds: 22 * 60,
              distanceMeters: 9800,
            },
          ],
        },
        request,
      ),
      withGeometry(
        {
          id: 'mock-route-driving-fast',
          provider: 'mock',
          summary: 'Drive via expressway',
          durationSeconds: 18 * 60,
          walkingDistanceMeters: 0,
          transferCount: 0,
          estimatedCost: 12,
          currency: 'USD',
          comparisonTag: 'fastest',
          isMock: true,
          segments: [
            {
              id: 'drive-2',
              mode: 'driving',
              instruction: 'Drive via Sample Expressway',
              durationSeconds: 18 * 60,
              distanceMeters: 11200,
            },
          ],
        },
        request,
      ),
    ];
  }

  async getWalkingRoutes(request: RouteRequest): Promise<Route[]> {
    return [
      withGeometry(
        {
          id: 'mock-route-walk-1',
          provider: 'mock',
          summary: 'Walk only',
          durationSeconds: 40 * 60,
          walkingDistanceMeters: 3200,
          transferCount: 0,
          estimatedCost: 0,
          currency: 'USD',
          comparisonTag: 'cheapest',
          isMock: true,
          segments: [
            {
              id: 'walk-1',
              mode: 'walking',
              instruction: 'Walk to destination',
              durationSeconds: 40 * 60,
              distanceMeters: 3200,
            },
          ],
        },
        request,
      ),
    ];
  }

  async getCyclingRoutes(_request: RouteRequest): Promise<Route[]> {
    return [];
  }

  async getNearbyStops(_params: NearbyStopsParams): Promise<PlaceStop[]> {
    return [
      {
        id: 'mock-stop-1',
        name: 'Sample Central Station',
        latitude: 35.6812,
        longitude: 139.7671,
        modes: ['subway', 'train', 'bus'],
      },
    ];
  }

  async getDepartures(_stopId: string): Promise<Departure[]> {
    return [
      {
        id: 'dep-1',
        lineName: 'Sample Line',
        direction: 'North Terminal',
        departureAt: isoPlusMinutes(8),
        platform: '2',
      },
    ];
  }

  async getArrivals(stopId: string): Promise<Departure[]> {
    return this.getDepartures(stopId);
  }

  async getFare(routeId: string): Promise<{ amount: number; currency: string } | null> {
    if (routeId.startsWith('mock-route')) {
      return { amount: 2.8, currency: 'USD' };
    }
    return null;
  }

  async getServiceAlerts(): Promise<ServiceAlert[]> {
    return [
      {
        id: 'alert-1',
        title: 'Mock service notice',
        description: 'No live alerts configured. Placeholder only.',
        severity: 'info',
      },
    ];
  }

  async getRouteDetails(routeId: string): Promise<Route | null> {
    const routes = await this.getRoutes({
      origin: { latitude: 0, longitude: 0 },
      destination: { latitude: 1, longitude: 1 },
    });
    return routes.find((route) => route.id === routeId) ?? null;
  }
}
