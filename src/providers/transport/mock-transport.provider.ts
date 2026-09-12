import type {
  Departure,
  NearbyStopsParams,
  PlaceStop,
  RouteRequest,
  ServiceAlert,
  TransportProvider,
} from '@/providers/transport/transport.provider';
import type { Route } from '@/types/domain';

function isoPlusMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
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
    return [...transit, ...walking, ...driving];
  }

  async getTransitRoutes(_request: RouteRequest): Promise<Route[]> {
    const recommended = baseTransit();
    const fewestTransfers: Route = {
      ...recommended,
      id: 'mock-route-transit-direct',
      summary: 'Walk → Express subway → Walk',
      transferCount: 0,
      durationSeconds: 48 * 60,
      walkingDistanceMeters: 1100,
      comparisonTag: 'fewest_transfers',
      estimatedCost: 3.2,
      arrivalAt: isoPlusMinutes(56),
    };
    const leastWalking: Route = {
      ...recommended,
      id: 'mock-route-transit-least-walk',
      summary: 'Short walk → Subway → Elevator exit',
      walkingDistanceMeters: 320,
      durationSeconds: 45 * 60,
      comparisonTag: 'least_walking',
      arrivalAt: isoPlusMinutes(53),
    };
    const accessible: Route = {
      ...recommended,
      id: 'mock-route-transit-accessible',
      summary: 'Elevator-friendly subway route',
      comparisonTag: 'most_accessible',
      durationSeconds: 50 * 60,
      warnings: [
        ...(recommended.warnings ?? []),
        'Uses elevator-equipped mock stations only.',
      ],
    };
    const family: Route = {
      ...recommended,
      id: 'mock-route-transit-family',
      summary: 'Fewer stairs, simpler transfer',
      comparisonTag: 'best_for_families',
      transferCount: 0,
      durationSeconds: 52 * 60,
    };
    return [recommended, fewestTransfers, leastWalking, accessible, family];
  }

  async getDrivingRoutes(_request: RouteRequest): Promise<Route[]> {
    return [
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
    ];
  }

  async getWalkingRoutes(_request: RouteRequest): Promise<Route[]> {
    return [
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
