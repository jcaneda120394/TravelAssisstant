import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { PlaceCard } from '@/components/cards/place-card';
import { PlaceGrid } from '@/components/cards/place-grid';
import { LocationPickerModal } from '@/components/location/location-picker-modal';
import { ChipSelect } from '@/components/forms/chip-select';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { useEnsureLocation } from '@/hooks/use-ensure-location';
import { useAuth } from '@/hooks/use-auth';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import type { PlaceCategory } from '@/types/domain';
import { cachePlaces } from '@/services/offline/offline.service';
import { getExploreNearbyPlaces } from '@/services/places/explore-nearby.service';
import { getErrorMessage } from '@/lib/errors/app-error';
import { companionFilterActive } from '@/utils/companion-suitability';
import { sortPlacesByCategoryPopularity } from '@/utils/place-popularity';
import { filterPlacesWithinRadius } from '@/utils/geo';

const MIN_RADIUS_METERS = 500;
const MAX_RADIUS_METERS = 200_000;

const PRESET_RADII = [
  '500',
  '1000',
  '2000',
  '3000',
  '5000',
  '10000',
  '25000',
  '50000',
  '100000',
  '150000',
  '200000',
] as const;

const DISTANCE_OPTIONS = [...PRESET_RADII, 'custom'] as const;
type DistanceOption = (typeof DISTANCE_OPTIONS)[number];

const PRESET_LABELS: Record<(typeof PRESET_RADII)[number], string> = {
  '500': '500m',
  '1000': '1km',
  '2000': '2km',
  '3000': '3km',
  '5000': '5km',
  '10000': '10km',
  '25000': '25km',
  '50000': '50km',
  '100000': '100km',
  '150000': '150km',
  '200000': '200km',
};

function formatRadiusLabel(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  const km = meters / 1000;
  return Number.isInteger(km) ? `${km}km` : `${parseFloat(km.toFixed(1))}km`;
}

/** Parse km text → clamped meters, or null if invalid. */
function parseCustomKmToMeters(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!normalized) return null;
  const km = Number(normalized);
  if (!Number.isFinite(km) || km <= 0) return null;
  const meters = Math.round(km * 1000);
  return Math.min(MAX_RADIUS_METERS, Math.max(MIN_RADIUS_METERS, meters));
}
const CATEGORIES = [
  // Discover
  'attraction',
  'restaurant',
  'cafe',
  'bakery',
  'hotel',
  // Everyday essentials
  'convenience',
  'pharmacy',
  'atm',
  'bank',
  'laundry',
  // Shopping & culture
  'shopping',
  'mall',
  'market',
  'souvenir',
  'park',
  'museum',
  'temple',
  'viewpoint',
  'zoo',
  'nightlife',
  'beach',
  'hot_spring',
  'cold_spring',
  'spring',
  'lake',
  'river',
  'resort',
  'spa',
  'gym',
  // Getting around
  'transit_station',
  'airport',
  'bicycle_rental',
  'fuel',
  'parking',
  // Travel help
  'tourist_info',
  'post_office',
  'coworking',
  'toilet',
  // Emergency
  'hospital',
  'clinic',
  'police',
  'embassy',
  'all',
] as const;

type ExploreCategory = (typeof CATEGORIES)[number];

function normalizeCategory(raw: string | string[] | undefined): ExploreCategory | null {
  // Expo Router can stack the same param into an array when navigating repeatedly.
  // Always use the newest value (last), not the first.
  const value = Array.isArray(raw) ? raw[raw.length - 1] : raw;
  if (!value) {
    return null;
  }
  return (CATEGORIES as readonly string[]).includes(value) ? (value as ExploreCategory) : null;
}

export function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string | string[] }>();
  const { preferences } = useAuth();
  const { isDesktop } = useResponsiveLayout();
  const { coords, label, hasLocation } = useEnsureLocation({ auto: true });
  const [distanceOption, setDistanceOption] = useState<DistanceOption>('25000');
  const [customKmText, setCustomKmText] = useState('15');
  const [customError, setCustomError] = useState<string | undefined>();
  const [radiusMeters, setRadiusMeters] = useState(25_000);
  const routeCategory = normalizeCategory(params.category);
  const [category, setCategory] = useState<ExploreCategory>(routeCategory ?? 'attraction');
  const [pickerOpen, setPickerOpen] = useState(false);

  // Keep chip + query in sync with Home quick actions (Food → restaurant, Hotels → hotel).
  useEffect(() => {
    if (routeCategory && routeCategory !== category) {
      setCategory(routeCategory);
    }
  }, [routeCategory, category]);

  const applyCustomDistance = () => {
    const parsed = parseCustomKmToMeters(customKmText);
    if (parsed == null) {
      setCustomError('Enter a distance between 0.5 and 200 km');
      return;
    }
    setCustomError(undefined);
    setCustomKmText(String(parsed / 1000));
    setDistanceOption('custom');
    setRadiusMeters(parsed);
  };

  const selectDistance = (next: DistanceOption) => {
    setDistanceOption(next);
    setCustomError(undefined);
    if (next === 'custom') {
      const parsed = parseCustomKmToMeters(customKmText);
      if (parsed != null) {
        setRadiusMeters(parsed);
      }
      return;
    }
    setRadiusMeters(Number(next));
  };

  const query = useQuery({
    queryKey: [
      'nearby',
      'explore-v4',
      coords?.latitude,
      coords?.longitude,
      radiusMeters,
      category,
      label,
      preferences?.traveling_with_kids,
      preferences?.kids_ages?.join(','),
      preferences?.traveling_with_elderly,
      preferences?.elderly_ages?.join(','),
    ],
    enabled: hasLocation && Boolean(coords),
    staleTime: 60_000,
    retry: 1,
    // Never keep previous city's results (e.g. Shibuya) after a location change.
    queryFn: async () => {
      const places = await getExploreNearbyPlaces({
        location: coords!,
        radiusMeters,
        category: category === 'all' ? undefined : (category as PlaceCategory),
        cityLabel: label,
        limit: 100,
        companions: companionFilterActive(preferences) ? preferences : null,
      });
      await cachePlaces(places);
      return places;
    },
  });

  const places = useMemo(() => {
    const raw = query.data ?? [];
    if (!coords) return [];
    // Match the selected distance (small slack for GPS rounding only).
    const inRange = filterPlacesWithinRadius(raw, coords, radiusMeters, 200);
    return sortPlacesByCategoryPopularity(
      inRange,
      category === 'all' ? undefined : (category as PlaceCategory),
    );
  }, [query.data, radiusMeters, category, coords]);

  const subtitle = useMemo(() => {
    if (!hasLocation) {
      return 'Choose a city or use GPS to find places nearby';
    }
    if (query.isFetching && !places.length) {
      return `Searching near ${label ?? 'you'}…`;
    }
    if (query.isError) {
      return `Could not load places near ${label ?? 'you'}`;
    }
    const count = places.length;
    const updating = query.isFetching ? ' · updating…' : '';
    return `${count} places near ${label ?? 'you'} · within ${formatRadiusLabel(radiusMeters)} · sorted by popularity${updating}`;
  }, [hasLocation, label, places.length, query.isError, query.isFetching, radiusMeters]);

  const applyCategory = (next: ExploreCategory) => {
    setCategory(next);
    router.setParams({ category: next });
  };

  const customChipLabel =
    distanceOption === 'custom'
      ? `Custom · ${formatRadiusLabel(radiusMeters)}`
      : 'Custom';

  return (
    <Screen>
      <ScrollView
        className={`flex-1 pt-4 ${isDesktop ? '' : 'px-5'}`}
        contentContainerClassName="pb-10"
        testID="screen-explore"
      >
        <SectionHeader
          eyebrow="Around you"
          title="Explore nearby"
          subtitle={subtitle}
        />

        <View className="mb-4 flex-row gap-2">
          <View className="flex-1">
            <Button label="Choose city" variant="secondary" onPress={() => setPickerOpen(true)} />
          </View>
          <View className="flex-1">
            <Button label="Map" variant="ghost" onPress={() => router.push('/map')} />
          </View>
        </View>

        {!hasLocation ? (
          <Card className="mb-4">
            <AppText muted>
              Pick your city first so Food / Hotels / Things to do can load nearby results.
            </AppText>
          </Card>
        ) : null}

        <AppText className="mb-2 font-sans-medium">Distance</AppText>
        <ChipSelect
          options={DISTANCE_OPTIONS}
          values={[distanceOption]}
          multiple={false}
          labels={{
            ...PRESET_LABELS,
            custom: customChipLabel,
          }}
          onChange={(values) => selectDistance(values[0] ?? '25000')}
        />
        {distanceOption === 'custom' ? (
          <View className="mt-3">
            <TextField
              label="Custom distance (km)"
              value={customKmText}
              onChangeText={setCustomKmText}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={applyCustomDistance}
              placeholder="e.g. 7.5"
              error={customError}
              testID="explore-custom-distance"
            />
            <AppText muted className="mb-3 -mt-2 text-xs">
              Any value from 0.5 km to 200 km.
            </AppText>
            <Button label="Apply distance" variant="secondary" onPress={applyCustomDistance} />
          </View>
        ) : null}

        <AppText className="mb-2 mt-4 font-sans-medium">Category</AppText>
        <ChipSelect
          options={CATEGORIES}
          values={[category]}
          multiple={false}
          labels={{
            attraction: 'Things to do',
            restaurant: 'Food',
            cafe: 'Cafe',
            bakery: 'Bakery',
            hotel: 'Hotels',
            convenience: 'Convenience store',
            pharmacy: 'Pharmacy',
            atm: 'ATM',
            bank: 'Bank / FX',
            laundry: 'Laundry',
            shopping: 'Shopping',
            mall: 'Malls',
            market: 'Markets',
            souvenir: 'Souvenirs',
            park: 'Parks',
            museum: 'Museums',
            temple: 'Temples',
            viewpoint: 'Viewpoints',
            zoo: 'Zoo / Aquarium',
            nightlife: 'Nightlife',
            beach: 'Beaches',
            hot_spring: 'Hot springs',
            cold_spring: 'Cold springs',
            spring: 'Springs',
            lake: 'Lakes',
            river: 'Rivers / falls',
            resort: 'Resorts',
            spa: 'Spa',
            gym: 'Gym / Fitness',
            transit_station: 'Transit',
            airport: 'Airport',
            bicycle_rental: 'Bike rental',
            fuel: 'Fuel',
            parking: 'Parking',
            tourist_info: 'Tourist info',
            post_office: 'Post office',
            coworking: 'Coworking',
            toilet: 'Toilets',
            hospital: 'Hospital',
            clinic: 'Clinic',
            police: 'Police',
            embassy: 'Embassy',
            all: 'All',
          }}
          onChange={(values) => applyCategory(values[0] ?? 'attraction')}
        />

        <View className="mt-5 mb-5">
          <Button
            label="Browse hotels"
            variant="secondary"
            onPress={() => router.push('/hotels')}
          />
        </View>

        {hasLocation && query.isFetching && places.length === 0 ? (
          <View className="gap-4">
            <Skeleton height={188} />
            <Skeleton height={188} />
          </View>
        ) : null}

        {hasLocation && query.isError && places.length === 0 ? (
          <Card className="mb-4">
            <AppText className="mb-2 text-red-500">{getErrorMessage(query.error)}</AppText>
            <Button label="Try again" onPress={() => void query.refetch()} />
          </Card>
        ) : null}

        {hasLocation && places.length ? (
          <PlaceGrid>
            {places.map((place) => (
              <PlaceCard key={place.id} place={place} className="mb-0" />
            ))}
          </PlaceGrid>
        ) : null}

        {hasLocation && !query.isFetching && !query.isError && places.length === 0 ? (
          <EmptyState
            title="No places found"
            description="Try another category, a larger distance, or Choose city."
          />
        ) : null}
      </ScrollView>

      <LocationPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onChanged={() => void query.refetch()}
      />
    </Screen>
  );
}
