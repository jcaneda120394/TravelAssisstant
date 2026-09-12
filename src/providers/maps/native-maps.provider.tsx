import { useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type { MapsProvider, MapMarker, MapViewProps } from '@/providers/maps/maps.provider';
import type { Place } from '@/types/domain';
import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';

function WebFallbackMap({ camera, markers = [], selectedMarkerId, onMarkerPress }: MapViewProps) {
  return (
    <View className="overflow-hidden rounded-3xl border border-brand-100 bg-brand-50 dark:border-brand-800 dark:bg-brand-900">
      <View className="px-4 py-3">
        <AppText className="font-sans-semibold">Map</AppText>
        <AppText muted className="mt-1 text-sm">
          Native maps render on iOS/Android. Center {camera.center.latitude.toFixed(4)},{' '}
          {camera.center.longitude.toFixed(4)}
        </AppText>
      </View>
      <View className="gap-2 px-4 pb-4">
        {markers.map((marker) => (
          <Pressable
            key={marker.id}
            onPress={() => onMarkerPress?.(marker.id)}
            className={`rounded-2xl border px-3 py-3 ${
              marker.id === selectedMarkerId
                ? 'border-brand-600 bg-brand-600'
                : 'border-brand-100 bg-white dark:border-brand-800 dark:bg-surface-cardDark'
            }`}
          >
            <AppText inverse={marker.id === selectedMarkerId} className="font-sans-medium">
              {marker.title}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function NativeMapView({
  camera,
  markers = [],
  selectedMarkerId,
  onMarkerPress,
  onMapPress,
}: MapViewProps) {
  const mapRef = useRef<MapView>(null);
  const latitudeDelta = Math.max(0.02, 0.35 / Math.max(camera.zoom, 1));
  const longitudeDelta = latitudeDelta;
  const region = {
    latitude: camera.center.latitude,
    longitude: camera.center.longitude,
    latitudeDelta,
    longitudeDelta,
  };

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 450);
    // Only recentre when the camera target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera.center.latitude, camera.center.longitude, camera.zoom]);

  if (Platform.OS === 'web') {
    return (
      <WebFallbackMap
        camera={camera}
        markers={markers}
        selectedMarkerId={selectedMarkerId}
        onMarkerPress={onMarkerPress}
      />
    );
  }

  return (
    <View className="overflow-hidden rounded-3xl border border-brand-100 dark:border-brand-800">
      <MapView
        key={`native-map-${region.latitude.toFixed(4)}-${region.longitude.toFixed(4)}`}
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onPress={(event) => {
          const { latitude, longitude } = event.nativeEvent.coordinate;
          onMapPress?.({ latitude, longitude });
        }}
      >
        <Marker
          coordinate={camera.center}
          title="You are here"
          pinColor="#0B726A"
          identifier="user-location"
        />
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            pinColor={marker.id === selectedMarkerId ? '#C45C26' : undefined}
            onPress={() => onMarkerPress?.(marker.id)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 360,
  },
});

export class NativeMapsProvider implements MapsProvider {
  readonly name = 'react-native-maps';
  MapView = NativeMapView;

  markersFromPlaces(places: Place[]): MapMarker[] {
    return places.map((place) => ({
      id: place.id,
      coordinate: { latitude: place.latitude, longitude: place.longitude },
      title: place.name,
      category: place.category,
    }));
  }
}
