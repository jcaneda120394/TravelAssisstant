import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { useEnsureLocation } from '@/hooks/use-ensure-location';
import { providers } from '@/providers/registry';
import { theme } from '@/config/theme';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

export function MapScreen() {
  const router = useRouter();
  const scheme = useAppColorScheme();
  const { coords, label, hasLocation, hasHydrated, locate, isLocating, error } = useEnsureLocation({
    auto: true,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const MapView = providers.maps.MapView;

  const placesQuery = useQuery({
    queryKey: ['map-places', coords?.latitude, coords?.longitude],
    enabled: Boolean(coords),
    staleTime: 3 * 60_000,
    queryFn: () =>
      providers.places.getNearbyPlaces({
        location: coords!,
        radiusMeters: 4000,
        category: 'attraction',
        limit: 20,
      }),
  });

  const markers = providers.maps.markersFromPlaces(placesQuery.data ?? []);

  if (!hasHydrated) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator color={theme[scheme].primary} size="large" />
        <AppText muted className="mt-3">
          Preparing map…
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-map">
        <SectionHeader
          title="Map"
          subtitle={
            hasLocation
              ? label ?? 'Your location'
              : 'Allow location to center the map on you'
          }
        />

        <View className="mb-4 flex-row gap-2">
          <View className="flex-1">
            <Button
              label={isLocating ? 'Locating…' : hasLocation ? 'Refresh location' : 'Use my location'}
              loading={isLocating}
              onPress={() => void locate()}
            />
          </View>
          <View className="flex-1">
            <Button label="Directions" variant="secondary" onPress={() => router.push('/directions')} />
          </View>
        </View>

        {error ? (
          <Card className="mb-4">
            <AppText muted>{error}</AppText>
            <AppText muted className="mt-2 text-sm">
              On iOS Simulator: Features → Location → Custom Location (or Apple).
            </AppText>
          </Card>
        ) : null}

        {!hasLocation ? (
          <Card className="mb-4">
            <AppText muted>
              Tap Use my location so we can show attractions near you on the map.
            </AppText>
          </Card>
        ) : null}

        {coords ? (
          <MapView
            key={`map-${coords.latitude.toFixed(4)}-${coords.longitude.toFixed(4)}`}
            camera={{ center: coords, zoom: 14 }}
            markers={markers}
            selectedMarkerId={selectedId}
            onMarkerPress={(id) => {
              setSelectedId(id);
              router.push(`/place/${id}`);
            }}
          />
        ) : (
          <Card className="mb-4 items-center py-10">
            <ActivityIndicator color={theme[scheme].primary} />
            <AppText muted className="mt-3">
              Waiting for GPS…
            </AppText>
          </Card>
        )}

        <Card className="mt-4">
          <AppText className="font-sans-semibold">Nearby attractions</AppText>
          <AppText muted className="mt-1">
            {coords
              ? placesQuery.isLoading
                ? 'Loading sights…'
                : `${placesQuery.data?.length ?? 0} sights pinned near you`
              : 'Waiting for location…'}
          </AppText>
          {coords ? (
            <AppText muted className="mt-1 text-xs">
              {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
            </AppText>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}
