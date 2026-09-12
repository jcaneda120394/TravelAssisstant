import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { PlaceCard } from '@/components/cards/place-card';
import { ChipSelect } from '@/components/forms/chip-select';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { useEnsureLocation } from '@/hooks/use-ensure-location';
import { providers } from '@/providers/registry';
import type { PlaceCategory } from '@/types/domain';
import { cachePlaces } from '@/services/offline/offline.service';

const RADII = ['500', '1000', '2000', '3000', '5000', '10000', '25000'] as const;
const CATEGORIES = [
  'attraction',
  'restaurant',
  'hotel',
  'all',
  'hospital',
  'pharmacy',
  'police',
  'atm',
  'coworking',
  'transit_station',
] as const;

export function ExploreScreen() {
  const router = useRouter();
  const { coords, label, hasLocation, locate, isLocating } = useEnsureLocation({ auto: true });
  const [radius, setRadius] = useState<(typeof RADII)[number]>('3000');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('attraction');

  const query = useQuery({
    queryKey: ['nearby', coords?.latitude, coords?.longitude, radius, category],
    enabled: hasLocation && Boolean(coords),
    staleTime: 3 * 60_000,
    queryFn: async () => {
      const places = await providers.places.getNearbyPlaces({
        location: coords!,
        radiusMeters: Number(radius),
        category: category === 'all' ? undefined : (category as PlaceCategory),
        limit: 30,
      });
      await cachePlaces(places);
      return places;
    },
  });

  const subtitle = useMemo(() => {
    if (!hasLocation) {
      return 'Use your location to find places nearby';
    }
    return `${query.data?.length ?? 0} places near ${label ?? 'you'} · ${Number(radius) / 1000} km`;
  }, [hasLocation, label, query.data?.length, radius]);

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-explore">
        <SectionHeader title="Explore nearby" subtitle={subtitle} />

        <View className="mb-4">
          <Button
            label={hasLocation ? 'Refresh my location' : 'Use my location'}
            loading={isLocating}
            onPress={() => void locate()}
          />
        </View>

        {!hasLocation ? (
          <Card className="mb-4">
            <AppText muted>
              Allow location access to see attractions, food, and places around you. On the iOS
              Simulator, set a custom location under Features → Location.
            </AppText>
          </Card>
        ) : null}

        <AppText className="mb-2 font-sans-medium">Distance</AppText>
        <ChipSelect
          options={RADII}
          values={[radius]}
          multiple={false}
          labels={{
            '500': '500m',
            '1000': '1km',
            '2000': '2km',
            '3000': '3km',
            '5000': '5km',
            '10000': '10km',
            '25000': '25km',
          }}
          onChange={(values) => setRadius(values[0] ?? '3000')}
        />

        <AppText className="mb-2 mt-4 font-sans-medium">Category</AppText>
        <ChipSelect
          options={CATEGORIES}
          values={[category]}
          multiple={false}
          labels={{
            attraction: 'Things to do',
            restaurant: 'Food',
            hotel: 'Hotels',
            all: 'All',
            hospital: 'Hospital',
            pharmacy: 'Pharmacy',
            police: 'Police',
            atm: 'ATM',
            coworking: 'Coworking',
            transit_station: 'Transit',
          }}
          onChange={(values) => setCategory(values[0] ?? 'attraction')}
        />

        <View className="mt-4 mb-4 flex-row gap-2">
          <View className="flex-1">
            <Button label="Open map" variant="secondary" onPress={() => router.push('/map')} />
          </View>
          <View className="flex-1">
            <Button label="Search" variant="secondary" onPress={() => router.push('/search')} />
          </View>
        </View>

        {hasLocation && query.isLoading ? (
          <View className="gap-3">
            <Skeleton height={88} />
            <Skeleton height={88} />
          </View>
        ) : null}

        {hasLocation && query.data?.length
          ? query.data.map((place) => <PlaceCard key={place.id} place={place} />)
          : null}

        {hasLocation && !query.isLoading && query.data?.length === 0 ? (
          <EmptyState title="No places found" description="Try a larger radius or another category." />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
