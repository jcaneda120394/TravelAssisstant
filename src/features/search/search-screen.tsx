import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ResponsiveScrollView } from '@/components/layout/responsive-scroll-view';
import { PlaceCard } from '@/components/cards/place-card';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAuth } from '@/hooks/use-auth';
import { useEnsureLocation } from '@/hooks/use-ensure-location';
import { providers } from '@/providers/registry';
import { listTrips } from '@/services/trips/trips.service';

export function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { coords } = useEnsureLocation({ auto: true });
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 400);

  const placesQuery = useQuery({
    queryKey: [
      'search-places',
      'google-v1',
      debounced,
      coords?.latitude,
      coords?.longitude,
    ],
    enabled: debounced.trim().length > 1,
    queryFn: () =>
      providers.places.searchPlaces({
        query: debounced,
        limit: 12,
        location: coords ?? undefined,
      }),
    staleTime: 60_000,
  });

  const tripsQuery = useQuery({
    queryKey: ['trips', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listTrips(user!.id),
    staleTime: 30_000,
    select: (trips) =>
      trips.filter((trip) =>
        `${trip.title} ${trip.destinations.join(' ')}`
          .toLowerCase()
          .includes(debounced.toLowerCase()),
      ),
  });

  return (
    <Screen>
      <ResponsiveScrollView className="flex-1 px-5 pt-4" testID="screen-search">
        <SectionHeader title="Search" subtitle="Places and saved trips" />
        <TextField
          label="Search"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          placeholder="Kyoto, museum, ramen…"
        />
        <Button
          label="Search places"
          loading={placesQuery.isFetching}
          disabled={query.trim().length < 2}
          onPress={() => void placesQuery.refetch()}
        />

        {debounced.trim().length > 1 ? (
          <Card className="mt-4 mb-4">
            <AppText className="font-sans-semibold">Saved trips</AppText>
            {tripsQuery.data?.map((trip) => (
              <Pressable key={trip.id} onPress={() => router.push(`/trip/${trip.id}`)} className="mt-2">
                <AppText className="font-sans-medium">{trip.title}</AppText>
                <AppText muted className="text-sm">
                  {trip.destinations.join(', ')}
                </AppText>
              </Pressable>
            ))}
            {(tripsQuery.data?.length ?? 0) === 0 ? (
              <AppText muted className="mt-2">
                No trip matches
              </AppText>
            ) : null}
          </Card>
        ) : null}

        <AppText className="mb-2 font-sans-semibold">Places</AppText>
        <View>
          {placesQuery.data?.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </View>
      </ResponsiveScrollView>
    </Screen>
  );
}
