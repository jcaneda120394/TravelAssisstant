import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { PlaceCard } from '@/components/cards/place-card';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { providers } from '@/providers/registry';
import { listTrips } from '@/services/trips/trips.service';
import { useAuth } from '@/hooks/use-auth';

export function SearchScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState('museum');

  const placesQuery = useQuery({
    queryKey: ['search-places', query],
    enabled: query.trim().length > 1,
    queryFn: () => providers.places.searchPlaces({ query, limit: 20 }),
  });

  const tripsQuery = useQuery({
    queryKey: ['search-trips', user?.id, query],
    enabled: Boolean(user?.id) && query.trim().length > 1,
    queryFn: async () => {
      const trips = await listTrips(user!.id);
      return trips.filter((trip) =>
        `${trip.title} ${trip.destinations.join(' ')}`.toLowerCase().includes(query.toLowerCase()),
      );
    },
  });

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-search">
        <SectionHeader title="Universal search" subtitle="Places, trips, and more" />
        <TextField label="Search" value={query} onChangeText={setQuery} autoCapitalize="none" />
        <Button label="Search" onPress={() => void placesQuery.refetch()} />

        <Card className="mt-4 mb-4">
          <AppText className="font-sans-semibold">Trips</AppText>
          {tripsQuery.data?.map((trip) => (
            <AppText key={trip.id} muted className="mt-2">
              {trip.title} · {trip.destinations.join(', ')}
            </AppText>
          ))}
          {(tripsQuery.data?.length ?? 0) === 0 ? <AppText muted className="mt-2">No trip matches</AppText> : null}
        </Card>

        <AppText className="mb-2 font-sans-semibold">Places</AppText>
        <View>
          {placesQuery.data?.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
