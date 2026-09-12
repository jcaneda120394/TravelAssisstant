import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { providers } from '@/providers/registry';
import {
  DEFAULT_MAP_CENTER,
  getCurrentPosition,
  useResolvedCoords,
} from '@/services/location/location.service';
import { useLocationStore } from '@/stores/location-store';
import { getErrorMessage } from '@/lib/errors/app-error';

export function MapScreen() {
  const router = useRouter();
  const coords = useResolvedCoords();
  const label = useLocationStore((state) => state.label);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const MapView = providers.maps.MapView;

  const placesQuery = useQuery({
    queryKey: ['map-places', coords],
    queryFn: () =>
      providers.places.getNearbyPlaces({
        location: coords,
        radiusMeters: 5000,
        limit: 20,
      }),
  });

  const markers = providers.maps.markersFromPlaces(placesQuery.data ?? []);

  const locate = async () => {
    try {
      await getCurrentPosition();
    } catch (error) {
      Alert.alert(
        'Location',
        `${getErrorMessage(error)}\n\nYou can keep using the app with a manual/fallback city center.`,
      );
      useLocationStore.getState().setManualLocation({
        coords: DEFAULT_MAP_CENTER,
        city: 'Shibuya',
        country: 'Japan',
        label: 'Shibuya, Japan (manual demo)',
      });
    }
  };

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-map">
        <SectionHeader
          title="Map"
          subtitle={label ?? 'Location optional — using fallback until permission granted'}
        />

        <View className="mb-4 flex-row gap-2">
          <View className="flex-1">
            <Button label="Use my location" onPress={() => void locate()} />
          </View>
          <View className="flex-1">
            <Button label="Directions" variant="secondary" onPress={() => router.push('/directions')} />
          </View>
        </View>

        <MapView
          camera={{ center: coords, zoom: 14 }}
          markers={markers}
          selectedMarkerId={selectedId}
          onMarkerPress={(id) => {
            setSelectedId(id);
            router.push(`/place/${id}`);
          }}
        />

        <Card className="mt-4">
          <AppText className="font-sans-semibold">Map provider</AppText>
          <AppText muted className="mt-1">
            Active: {providers.maps.name}. Google / Mapbox / HERE adapters can replace this without
            changing Map screens.
          </AppText>
        </Card>
      </ScrollView>
    </Screen>
  );
}
