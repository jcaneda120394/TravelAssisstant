import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ResponsiveScrollView } from '@/components/layout/responsive-scroll-view';
import { Pressable, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { rememberPlace } from '@/services/places/place-cache';
import {
  listPublicTrips,
  listTravelSpotsFeed,
} from '@/services/travel-spots/travel-spots.service';
import { formatTripDateRange } from '@/utils/dates';
import type { Place } from '@/types/domain';

type Tab = 'spots' | 'trips';

export function TravelSpotsScreen() {
  const router = useRouter();
  const scheme = useAppColorScheme();
  const [tab, setTab] = useState<Tab>('spots');

  const feedQuery = useQuery({
    queryKey: ['travel-spots-feed'],
    queryFn: () => listTravelSpotsFeed({ limit: 40 }),
    staleTime: 60_000,
  });

  const tripsQuery = useQuery({
    queryKey: ['public-trips'],
    queryFn: () => listPublicTrips({ limit: 30 }),
    staleTime: 60_000,
  });

  const openPlace = (item: {
    placeId: string;
    placeName: string;
    latitude?: number;
    longitude?: number;
    place?: Place;
  }) => {
    if (item.place) {
      rememberPlace(item.place);
      router.push({
        pathname: '/place/[id]',
        params: {
          id: encodeURIComponent(item.place.id),
          snapshot: JSON.stringify(item.place),
        },
      });
      return;
    }
    const stub: Place = {
      id: item.placeId,
      provider: 'community',
      providerPlaceId: item.placeId,
      name: item.placeName,
      category: 'attraction',
      latitude: item.latitude ?? 0,
      longitude: item.longitude ?? 0,
    };
    rememberPlace(stub);
    router.push({
      pathname: '/place/[id]',
      params: {
        id: encodeURIComponent(item.placeId),
        snapshot: JSON.stringify(stub),
      },
    });
  };

  return (
    <Screen>
      <ResponsiveScrollView pad="tabs" className="flex-1 px-5 pt-4" testID="screen-travel-spots">
        <SectionHeader
          title="Travel Guide"
          subtitle="Public photos, reviews, and trip stories from travelers"
        />

        <View className="mb-4 flex-row gap-2">
          {([
            { id: 'spots' as const, label: 'Spots' },
            { id: 'trips' as const, label: 'Public trips' },
          ]).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              className={`flex-1 rounded-2xl border px-3 py-3 ${
                tab === item.id
                  ? 'border-brand-600 bg-brand-600'
                  : scheme === 'dark'
                    ? 'border-brand-800 bg-surface-cardDark'
                    : 'border-black/8 bg-white'
              }`}
            >
              <AppText
                className={`text-center font-sans-semibold ${
                  tab === item.id ? 'text-white' : 'text-brand-700 dark:text-brand-200'
                }`}
              >
                {item.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        {tab === 'spots' ? (
          <>
            {feedQuery.isLoading ? <Skeleton height={140} /> : null}
            {(feedQuery.data ?? []).map((item) => (
              <Pressable key={item.id} onPress={() => openPlace(item)}>
                <Card className="mb-3">
                  <AppText className="font-sans-semibold">{item.placeName}</AppText>
                  {item.rating != null ? (
                    <AppText className="mt-1 text-sm">
                      {'★'.repeat(item.rating)}
                      {'☆'.repeat(Math.max(0, 5 - item.rating))}
                    </AppText>
                  ) : null}
                  {item.body ? <AppText className="mt-2">{item.body}</AppText> : null}
                  {item.caption ? (
                    <AppText muted className="mt-1 text-sm">
                      {item.caption}
                    </AppText>
                  ) : null}
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      className="mt-3 h-40 w-full rounded-2xl"
                      resizeMode="cover"
                    />
                  ) : null}
                </Card>
              </Pressable>
            ))}
            {!feedQuery.isLoading && (feedQuery.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="No public spots yet"
                description="Visit a place, tap I’ve been here, and share a photo or review."
              />
            ) : null}
          </>
        ) : (
          <>
            {tripsQuery.isLoading ? <Skeleton height={140} /> : null}
            {(tripsQuery.data ?? []).map((trip) => (
              <Pressable key={trip.id} onPress={() => router.push(`/trip/${trip.id}`)}>
                <Card className="mb-3">
                  <AppText className="font-sans-semibold">{trip.title}</AppText>
                  <AppText muted className="mt-1 text-sm">
                    {formatTripDateRange(trip.startDate, trip.endDate, trip.openEnded)}
                    {trip.destinations.length ? ` · ${trip.destinations.join(', ')}` : ''}
                  </AppText>
                  {trip.publicSummary ? (
                    <AppText className="mt-2">{trip.publicSummary}</AppText>
                  ) : null}
                </Card>
              </Pressable>
            ))}
            {!tripsQuery.isLoading && (tripsQuery.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="No public trips yet"
                description="Trip owners can publish an itinerary from Trip details."
              />
            ) : null}
          </>
        )}

        <View className="mt-2">
          <Button label="Explore places nearby" variant="secondary" onPress={() => router.push('/(tabs)/explore')} />
        </View>
      </ResponsiveScrollView>
    </Screen>
  );
}
