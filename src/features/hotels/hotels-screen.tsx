import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { providers } from '@/providers/registry';
import { analytics } from '@/lib/analytics';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

export function HotelsScreen() {
  const router = useRouter();
  const scheme = useAppColorScheme();
  const [city, setCity] = useState('Tokyo');
  const [checkIn, setCheckIn] = useState(new Date().toISOString().slice(0, 10));
  const [checkOut, setCheckOut] = useState(
    new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
  );

  const query = useQuery({
    queryKey: ['hotels', city, checkIn, checkOut],
    queryFn: async () => {
      analytics.track('hotel_searched', { city });
      return providers.hotels.searchHotels({
        location: city,
        checkIn,
        checkOut,
        adults: 2,
        children: 1,
        rooms: 1,
      });
    },
  });

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-hotels">
        <SectionHeader title="Hotels" subtitle="AccommodationProvider (mock rates — never invented live prices in AI)" />
        <Card className="mb-4">
          <TextField label="City" value={city} onChangeText={setCity} autoCapitalize="words" />
          <TextField label="Check-in" value={checkIn} onChangeText={setCheckIn} />
          <TextField label="Check-out" value={checkOut} onChangeText={setCheckOut} />
          <Button label="Search hotels" onPress={() => void query.refetch()} loading={query.isFetching} />
        </Card>

        {query.data?.map((hotel) => (
          <Pressable
            key={hotel.id}
            onPress={() => router.push(`/hotels/${hotel.id}`)}
            className={`mb-3 rounded-2xl border p-4 ${
              scheme === 'dark'
                ? 'border-brand-800 bg-surface-cardDark'
                : 'border-brand-100 bg-white'
            }`}
          >
            <AppText className="font-sans-semibold text-lg">{hotel.name}</AppText>
            <AppText muted className="mt-1">
              {hotel.rating ? `${hotel.rating}★ · ` : ''}
              {hotel.pricePerNight != null
                ? `${hotel.currency} ${hotel.pricePerNight}/night`
                : 'Rate unavailable'}
            </AppText>
            <AppText muted className="mt-1">{hotel.address}</AppText>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
