import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { PlaceCard } from '@/components/cards/place-card';
import { ChipSelect } from '@/components/forms/chip-select';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { providers } from '@/providers/registry';
import { useResolvedCoords } from '@/services/location/location.service';
import type { PlaceCategory } from '@/types/domain';
import { cachePlaces } from '@/services/offline/offline.service';

const RADII = ['500', '1000', '2000', '5000', '10000', '25000'] as const;
const CATEGORIES = [
  'all',
  'restaurant',
  'attraction',
  'hospital',
  'pharmacy',
  'police',
  'atm',
  'coworking',
  'transit_station',
  'hotel',
] as const;

export function ExploreScreen() {
  const router = useRouter();
  const coords = useResolvedCoords();
  const [radius, setRadius] = useState<(typeof RADII)[number]>('2000');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('all');

  const query = useQuery({
    queryKey: ['nearby', coords, radius, category],
    queryFn: async () => {
      const places = await providers.places.getNearbyPlaces({
        location: coords,
        radiusMeters: Number(radius),
        category: category === 'all' ? undefined : (category as PlaceCategory),
      });
      await cachePlaces(places);
      return places;
    },
  });

  const subtitle = useMemo(
    () => `${query.data?.length ?? 0} places · ${Number(radius) / 1000} km radius`,
    [query.data?.length, radius],
  );

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-explore">
        <SectionHeader title="Explore nearby" subtitle={subtitle} />

        <AppText className="mb-2 font-sans-medium">Distance</AppText>
        <ChipSelect
          options={RADII}
          values={[radius]}
          multiple={false}
          labels={{
            '500': '500m',
            '1000': '1km',
            '2000': '2km',
            '5000': '5km',
            '10000': '10km',
            '25000': '25km',
          }}
          onChange={(values) => setRadius(values[0] ?? '2000')}
        />

        <AppText className="mb-2 mt-4 font-sans-medium">Category</AppText>
        <ChipSelect
          options={CATEGORIES}
          values={[category]}
          multiple={false}
          onChange={(values) => setCategory(values[0] ?? 'all')}
        />

        <View className="mt-4 mb-4 flex-row gap-2">
          <View className="flex-1">
            <Button label="Open map" variant="secondary" onPress={() => router.push('/map')} />
          </View>
          <View className="flex-1">
            <Button label="Search" variant="secondary" onPress={() => router.push('/search')} />
          </View>
        </View>

        {query.isLoading ? (
          <View className="gap-3">
            <Skeleton height={88} />
            <Skeleton height={88} />
          </View>
        ) : null}

        {query.data?.length ? query.data.map((place) => <PlaceCard key={place.id} place={place} />) : null}

        {!query.isLoading && query.data?.length === 0 ? (
          <EmptyState title="No places found" description="Try a larger radius or another category." />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
