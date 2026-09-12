import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView } from '@/components/ui/primitives';
import { providers } from '@/providers/registry';

export function HotelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const query = useQuery({
    queryKey: ['hotel', id],
    enabled: Boolean(id),
    queryFn: () => providers.hotels.getHotel(String(id)),
  });

  if (!query.data) {
    return (
      <Screen className="px-5 pt-14">
        <EmptyState title="Hotel not found" description="Mock hotel unavailable." />
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const hotel = query.data;

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10">
        <SectionHeader title={hotel.name} subtitle={hotel.address} />
        <Card className="mb-4">
          <AppText muted>
            {hotel.rating ? `${hotel.rating}★ (${hotel.reviewCount ?? 0} reviews)` : 'Unrated'}
          </AppText>
          <AppText className="mt-2 font-sans-semibold text-xl">
            {hotel.currency} {hotel.pricePerNight}/night
          </AppText>
          <AppText muted className="mt-2">
            Amenities: {hotel.amenities?.join(', ') ?? '—'}
          </AppText>
          <AppText muted className="mt-2">
            Mock listing only — booking requires a real AccommodationProvider / affiliate link.
          </AppText>
        </Card>
        <Button
          label="Directions"
          onPress={() =>
            router.push({
              pathname: '/directions',
              params: { destinationName: hotel.name },
            })
          }
        />
      </ScrollView>
    </Screen>
  );
}
