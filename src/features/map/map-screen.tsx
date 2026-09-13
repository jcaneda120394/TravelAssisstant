import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { PlaceCard } from '@/components/cards/place-card';
import { MapLayersControl } from '@/components/maps/map-layers-control';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { useEnsureLocation } from '@/hooks/use-ensure-location';
import { providers } from '@/providers/registry';
import { theme } from '@/config/theme';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { rememberPlace } from '@/services/places/place-cache';
import { getExploreNearbyPlaces } from '@/services/places/explore-nearby.service';

const ZOOM_MIN = 5;
const ZOOM_MAX = 20;
const ZOOM_STEP = 1.5;
const DEFAULT_ZOOM = 12;
const MAP_ATTRACTIONS_LIMIT = 20;
/** Match Explore’s practical ring — 4km was too tight for city hubs / catalog landmarks. */
const MAP_RADIUS_METERS = 25_000;

export function MapScreen() {
  const router = useRouter();
  const scheme = useAppColorScheme();
  const { isDesktop, isWeb, scrollBottomPad } = useResponsiveLayout();
  const { coords, label, hasLocation, hasHydrated, locate, error, mode } = useEnsureLocation({
    auto: true,
    refresh: true,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const MapView = providers.maps.MapView;
  const mapHeight = isDesktop ? 560 : isWeb ? 320 : 360;

  // Re-check GPS whenever the Map tab is focused (skip manual city overrides).
  useFocusEffect(
    useCallback(() => {
      if (mode === 'manual') {
        return;
      }
      void locate();
    }, [locate, mode]),
  );

  const placesQuery = useQuery({
    queryKey: ['map-places', 'v3-nearness', coords?.latitude, coords?.longitude, label],
    enabled: Boolean(coords),
    staleTime: 3 * 60_000,
    queryFn: () =>
      getExploreNearbyPlaces({
        location: coords!,
        category: 'attraction',
        cityLabel: label,
        radiusMeters: MAP_RADIUS_METERS,
        limit: MAP_ATTRACTIONS_LIMIT,
      }),
  });

  const attractions = useMemo(
    () => (placesQuery.data ?? []).slice(0, MAP_ATTRACTIONS_LIMIT),
    [placesQuery.data],
  );
  const markers = providers.maps.markersFromPlaces(attractions);

  const zoomIn = () => setZoom((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP));
  const zoomOut = () => setZoom((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP));

  const zoomBtnClass = (disabled: boolean) =>
    `h-11 w-11 items-center justify-center rounded-2xl border ${
      scheme === 'dark'
        ? 'border-brand-700 bg-surface-cardDark'
        : 'border-brand-200 bg-white'
    } ${disabled ? 'opacity-40' : ''}`;

  const openAttraction = (placeId: string) => {
    const place = attractions.find((item) => item.id === placeId);
    if (place) {
      rememberPlace(place);
    }
    setSelectedId(placeId);
    router.push({
      pathname: '/place/[id]',
      params: {
        id: placeId,
        ...(place ? { snapshot: JSON.stringify(place) } : {}),
      },
    });
  };

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
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: scrollBottomPad }}
        style={{ width: '100%', maxWidth: '100%' }}
        testID="screen-map"
      >
        <SectionHeader
          title="Map"
          subtitle={
            hasLocation
              ? label ?? 'Your location'
              : 'Allow location to center the map on you'
          }
        />

        <View className="mb-4">
          <Button
            label="Directions"
            variant="secondary"
            onPress={() => {
              const place = attractions.find((item) => item.id === selectedId);
              if (place) {
                router.push({
                  pathname: '/directions',
                  params: {
                    destinationId: place.id,
                    destinationName: place.name,
                    destinationLat: String(place.latitude),
                    destinationLng: String(place.longitude),
                  },
                });
                return;
              }
              router.push('/directions');
            }}
          />
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
              Allow location so we can show attractions near you on the map.
            </AppText>
          </Card>
        ) : null}

        {coords ? (
          <View className="relative">
            <MapView
              key={`map-${coords.latitude.toFixed(4)}-${coords.longitude.toFixed(4)}`}
              camera={{ center: coords, zoom }}
              markers={markers}
              userLocation={coords}
              showUserLocation
              followUserLocation
              selectedMarkerId={selectedId}
              onMarkerPress={(id) => openAttraction(id)}
              mapHeight={mapHeight}
            />
            <MapLayersControl testID="map-layers-control" />
            <View pointerEvents="box-none" className="absolute bottom-4 left-4 gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zoom in"
                testID="map-zoom-in"
                onPress={zoomIn}
                disabled={zoom >= ZOOM_MAX}
                className={zoomBtnClass(zoom >= ZOOM_MAX)}
              >
                <AppText className="font-sans-bold text-2xl leading-7 text-brand-700 dark:text-brand-200">
                  +
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zoom out"
                testID="map-zoom-out"
                onPress={zoomOut}
                disabled={zoom <= ZOOM_MIN}
                className={zoomBtnClass(zoom <= ZOOM_MIN)}
              >
                <AppText className="font-sans-bold text-2xl leading-7 text-brand-700 dark:text-brand-200">
                  −
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : (
          <Card className="mb-4 items-center py-10">
            <ActivityIndicator color={theme[scheme].primary} />
            <AppText muted className="mt-3">
              Waiting for GPS…
            </AppText>
          </Card>
        )}

        <View className="mt-5">
          <SectionHeader
            eyebrow="Near you"
            title="Attractions near me"
            subtitle={
              coords
                ? placesQuery.isLoading || placesQuery.isFetching
                  ? 'Loading attractions nearby…'
                  : `${attractions.length} of ${MAP_ATTRACTIONS_LIMIT} attractions near you`
                : 'Enable location to load attractions'
            }
          />
        </View>

        {coords &&
        (placesQuery.isLoading || placesQuery.isFetching) &&
        attractions.length === 0 ? (
          <View className="mb-4 gap-3">
            <Skeleton height={84} />
            <Skeleton height={84} />
            <Skeleton height={84} />
          </View>
        ) : null}

        {coords &&
        !placesQuery.isLoading &&
        !placesQuery.isFetching &&
        attractions.length === 0 ? (
          <Card className="mb-4">
            <AppText muted className="mb-3">
              No attractions found nearby. Try Explore with a wider distance.
            </AppText>
            <Button
              label="Open Explore"
              variant="secondary"
              onPress={() => {
                router.replace({
                  pathname: '/(tabs)/explore',
                  params: { category: 'attraction' },
                });
              }}
            />
          </Card>
        ) : null}

        {attractions.map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}

        {coords && attractions.length > 0 ? (
          <View className="mt-2 mb-2">
            <Button
              label="See more nearby"
              variant="secondary"
              onPress={() => {
                router.replace({
                  pathname: '/(tabs)/explore',
                  params: { category: 'attraction' },
                });
              }}
            />
          </View>
        ) : null}

        {coords ? (
          <AppText muted className="mt-2 text-center text-xs">
            {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
          </AppText>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
