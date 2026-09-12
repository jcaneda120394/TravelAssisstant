import type { ComponentType, ReactNode } from 'react';

import type { AppMapStyleId } from '@/providers/maps/map-style';
import type { GeoPoint, Place } from '@/types/domain';

export type MapMarker = {
  id: string;
  coordinate: GeoPoint;
  title: string;
  category?: string;
  color?: string;
};

export type MapPolyline = {
  id: string;
  coordinates: GeoPoint[];
  color?: string;
  strokeWidth?: number;
};

export type MapCamera = {
  center: GeoPoint;
  zoom: number;
};

export type MapViewProps = {
  camera: MapCamera;
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  /** When set, camera fits these points (e.g. route + origin/destination). */
  fitToCoordinates?: GeoPoint[];
  /**
   * Traveler's actual location ("where am I"). When omitted, MapView reads the
   * shared location store so every map can show it by default.
   */
  userLocation?: GeoPoint | null;
  /** Defaults to true — always render the current-location indicator when known. */
  showUserLocation?: boolean;
  /** When true and there is no fitToCoordinates, keep the camera on userLocation. */
  followUserLocation?: boolean;
  mapHeight?: number;
  /**
   * Basemap style. When omitted, MapView reads the persisted map-style store
   * so Map and Directions stay in sync.
   */
  mapStyle?: AppMapStyleId;
  /** Native traffic overlay; ignored on web Leaflet. Defaults to store. */
  showTraffic?: boolean;
  selectedMarkerId?: string | null;
  onMarkerPress?: (markerId: string) => void;
  onMapPress?: (coordinate: GeoPoint) => void;
  children?: ReactNode;
  className?: string;
};

export interface MapsProvider {
  readonly name: string;
  MapView: ComponentType<MapViewProps>;
  markersFromPlaces(places: Place[]): MapMarker[];
}

export type MapProviderId = 'mock' | 'google' | 'mapbox' | 'here';
