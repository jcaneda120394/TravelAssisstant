import type { ComponentType, ReactNode } from 'react';

import type { GeoPoint, Place } from '@/types/domain';

export type MapMarker = {
  id: string;
  coordinate: GeoPoint;
  title: string;
  category?: string;
  color?: string;
};

export type MapCamera = {
  center: GeoPoint;
  zoom: number;
};

export type MapViewProps = {
  camera: MapCamera;
  markers?: MapMarker[];
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
