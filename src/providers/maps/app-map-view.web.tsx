import type { MapViewProps } from '@/providers/maps/maps.provider';
import { WebLeafletMapView } from '@/providers/maps/web-leaflet-map.web';

/** Web mock map — real Leaflet canvas. */
export function AppMapView(props: MapViewProps) {
  return <WebLeafletMapView {...props} />;
}
