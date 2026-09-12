import { type ComponentType } from 'react';

import { AppMapView } from '@/providers/maps/app-map-view';
import type { MapsProvider, MapMarker, MapViewProps } from '@/providers/maps/maps.provider';
import type { Place } from '@/types/domain';
import { formatDistanceMeters } from '@/utils/format';

export class MockMapsProvider implements MapsProvider {
  readonly name = 'mock-maps';
  MapView = AppMapView as ComponentType<MapViewProps>;

  markersFromPlaces(places: Place[]): MapMarker[] {
    return places.map((place) => ({
      id: place.id,
      coordinate: { latitude: place.latitude, longitude: place.longitude },
      title: place.name,
      category: place.category,
    }));
  }
}

export function describeMarkerDistance(meters?: number): string {
  return meters == null ? '' : formatDistanceMeters(meters);
}
