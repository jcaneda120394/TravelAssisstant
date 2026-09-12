import type { GeoPoint, Route, TransportMode } from '@/types/domain';

export type RouteRequest = {
  origin: GeoPoint;
  destination: GeoPoint;
  departureAt?: string;
  modes?: TransportMode[];
  adults?: number;
  children?: number;
  luggageCount?: number;
  accessibilityRequired?: boolean;
};

export type NearbyStopsParams = {
  location: GeoPoint;
  radiusMeters: number;
};

export type ServiceAlert = {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  affectedLines?: string[];
  startsAt?: string;
  endsAt?: string;
};

export interface TransportProvider {
  readonly name: string;
  getRoutes(request: RouteRequest): Promise<Route[]>;
  getTransitRoutes(request: RouteRequest): Promise<Route[]>;
  getDrivingRoutes(request: RouteRequest): Promise<Route[]>;
  getWalkingRoutes(request: RouteRequest): Promise<Route[]>;
  getCyclingRoutes(request: RouteRequest): Promise<Route[]>;
  getNearbyStops(params: NearbyStopsParams): Promise<PlaceStop[]>;
  getDepartures(stopId: string): Promise<Departure[]>;
  getArrivals(stopId: string): Promise<Departure[]>;
  getFare(routeId: string): Promise<{ amount: number; currency: string } | null>;
  getServiceAlerts(location?: GeoPoint): Promise<ServiceAlert[]>;
  getRouteDetails(routeId: string): Promise<Route | null>;
}

export type PlaceStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  modes: TransportMode[];
};

export type Departure = {
  id: string;
  lineName: string;
  direction: string;
  departureAt: string;
  platform?: string;
};
