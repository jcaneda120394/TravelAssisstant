import type { MapsProvider, MapMarker, MapViewProps } from '@/providers/maps/maps.provider';
import type { Place } from '@/types/domain';
import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { formatDistanceMeters } from '@/utils/format';

function MockMapView({
  camera,
  markers = [],
  selectedMarkerId,
  onMarkerPress,
}: MapViewProps) {
  return (
    <View className="overflow-hidden rounded-3xl border border-brand-100 bg-brand-50 dark:border-brand-800 dark:bg-brand-900">
      <View className="px-4 py-3">
        <AppText className="font-sans-semibold">Map (provider-agnostic canvas)</AppText>
        <AppText muted className="mt-1 text-sm">
          Center {camera.center.latitude.toFixed(4)}, {camera.center.longitude.toFixed(4)} · zoom{' '}
          {camera.zoom}
        </AppText>
        <AppText muted className="mt-1 text-xs">
          MockMapsProvider — swap to Google/Mapbox/HERE without changing screens.
        </AppText>
      </View>
      <View className="gap-2 px-4 pb-4">
        {markers.length === 0 ? (
          <AppText muted>No markers in view.</AppText>
        ) : (
          markers.map((marker) => {
            const selected = marker.id === selectedMarkerId;
            return (
              <Pressable
                key={marker.id}
                onPress={() => onMarkerPress?.(marker.id)}
                className={`rounded-2xl border px-3 py-3 ${
                  selected
                    ? 'border-brand-600 bg-brand-600'
                    : 'border-brand-100 bg-white dark:border-brand-800 dark:bg-surface-cardDark'
                }`}
              >
                <AppText inverse={selected} className="font-sans-medium">
                  {marker.title}
                </AppText>
                <AppText inverse={selected} muted={!selected} className="text-xs">
                  {marker.category ?? 'place'} · {marker.coordinate.latitude.toFixed(3)},{' '}
                  {marker.coordinate.longitude.toFixed(3)}
                </AppText>
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

export class MockMapsProvider implements MapsProvider {
  readonly name = 'mock-maps';
  MapView = MockMapView;

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
