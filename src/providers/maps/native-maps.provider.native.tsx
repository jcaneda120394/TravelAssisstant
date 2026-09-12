import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import type { MapsProvider, MapMarker, MapViewProps } from '@/providers/maps/maps.provider';
import { nativeMapTypeForStyle } from '@/providers/maps/map-style';
import type { Place } from '@/types/domain';
import { View } from '@/components/ui/primitives';
import { useLocationStore } from '@/stores/location-store';
import { useMapStyleStore } from '@/stores/map-style-store';

function NativeMapView({
  camera,
  markers = [],
  polylines = [],
  fitToCoordinates,
  userLocation: userLocationProp,
  showUserLocation = true,
  followUserLocation = false,
  mapHeight = 360,
  mapStyle: mapStyleProp,
  showTraffic: showTrafficProp,
  selectedMarkerId,
  onMarkerPress,
  onMapPress,
}: MapViewProps) {
  const mapRef = useRef<MapView>(null);
  const storeCoords = useLocationStore((state) => state.coords);
  const storeStyle = useMapStyleStore((state) => state.style);
  const storeTraffic = useMapStyleStore((state) => state.showTraffic);
  const userLocation = userLocationProp === undefined ? storeCoords : userLocationProp;
  const mapType = nativeMapTypeForStyle(mapStyleProp ?? storeStyle);
  const showsTraffic = showTrafficProp ?? storeTraffic;

  const focus = followUserLocation && userLocation ? userLocation : camera.center;
  const latitudeDelta = Math.max(0.02, 0.35 / Math.max(camera.zoom, 1));
  const longitudeDelta = latitudeDelta;
  const region = {
    latitude: focus.latitude,
    longitude: focus.longitude,
    latitudeDelta,
    longitudeDelta,
  };

  useEffect(() => {
    if (fitToCoordinates && fitToCoordinates.length >= 2) {
      const points = [...fitToCoordinates];
      if (showUserLocation && userLocation) {
        points.push(userLocation);
      }
      mapRef.current?.fitToCoordinates(
        points.map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
        })),
        { edgePadding: { top: 48, right: 48, bottom: 48, left: 48 }, animated: true },
      );
      return;
    }
    mapRef.current?.animateToRegion(region, 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- camera target only
  }, [
    focus.latitude,
    focus.longitude,
    camera.zoom,
    fitToCoordinates,
    showUserLocation,
    userLocation?.latitude,
    userLocation?.longitude,
  ]);

  return (
    <View className="overflow-hidden rounded-3xl border border-brand-100 dark:border-brand-800">
      <MapView
        ref={mapRef}
        style={[styles.map, { height: mapHeight }]}
        initialRegion={region}
        mapType={mapType}
        showsTraffic={showsTraffic}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        onPress={(event) => {
          const { latitude, longitude } = event.nativeEvent.coordinate;
          onMapPress?.({ latitude, longitude });
        }}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            pinColor={marker.id === selectedMarkerId ? '#C45C26' : marker.color ?? '#0B726A'}
            onPress={() => onMarkerPress?.(marker.id)}
          />
        ))}
        {/* Explicit pin so "You are here" is visible even when OS location UI is delayed. */}
        {showUserLocation && userLocation ? (
          <Marker
            key="__user_location__"
            coordinate={userLocation}
            title="You are here"
            pinColor="#2A9DDF"
            identifier="user-location"
          />
        ) : null}
        {polylines.map((line) =>
          line.coordinates.length >= 2 ? (
            <Polyline
              key={line.id}
              coordinates={line.coordinates}
              strokeColor={line.color ?? '#0B726A'}
              strokeWidth={line.strokeWidth ?? 5}
            />
          ) : null,
        )}
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
