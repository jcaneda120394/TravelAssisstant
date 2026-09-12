import { type ComponentType } from 'react';

import type { MapsProvider, MapMarker, MapViewProps } from '@/providers/maps/maps.provider';
import type { Place } from '@/types/domain';

// Explicit `.web` path — Metro was resolving the extensionless import to the
// native stub (`web-leaflet-map.ts`) even when bundling for web.
import { WebLeafletMapView } from '@/providers/maps/web-leaflet-map.web';

export class NativeMapsProvider implements MapsProvider {
  readonly name = 'leaflet-web';
  MapView = WebLeafletMapView as ComponentType<MapViewProps>;

  markersFromPlaces(places: Place[]): MapMarker[] {
    return places.map((place) => ({
      id: place.id,
      coordinate: { latitude: place.latitude, longitude: place.longitude },
      title: place.name,
      category: place.category,
    }));
  }
}
