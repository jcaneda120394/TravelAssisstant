import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ResponsiveScrollView } from '@/components/layout/responsive-scroll-view';
import { Button } from '@/components/ui/button';
import { DisplayPriceText } from '@/components/currency/display-price-text';
import { EmptyState } from '@/components/feedback/states';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { providers } from '@/providers/registry';

export function HotelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currency } = useDisplayCurrency();

  const query = useQuery({
    queryKey: ['hotel', id],
    enabled: Boolean(id),
    queryFn: () => providers.hotels.getHotel(String(id)),
  });

  if (!query.data) {
    return (
      <Screen className="px-5 pt-4">
        <EmptyState title="Hotel not found" description="Hotel listing unavailable." />
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const hotel = query.data;

  return (
    <Screen>
      <ResponsiveScrollView className="flex-1 px-5 pt-4">
        <SectionHeader title={hotel.name} subtitle={hotel.address} />
        <Card className="mb-4">
          <AppText muted>
            {hotel.rating ? `${hotel.rating}★ (${hotel.reviewCount ?? 0} reviews)` : 'Unrated'}
          </AppText>
          <DisplayPriceText
            amount={hotel.pricePerNight}
            sourceCurrency={hotel.currency ?? 'USD'}
            suffix="/night"
            className="mt-2 font-sans-semibold text-xl"
          />
          <AppText muted className="mt-1 text-xs">
            Shown in {currency}
            {hotel.currency && hotel.currency.toUpperCase() !== currency
              ? ` (from ${hotel.currency})`
              : ''}
          </AppText>
          <AppText muted className="mt-2">
            Amenities: {hotel.amenities?.join(', ') ?? '—'}
          </AppText>
          <AppText muted className="mt-2">
            Live OSM listing — bookable rates need a hotel partner API (Amadeus/Expedia).
          </AppText>
        </Card>
        <Button
          label="Directions"
          onPress={() =>
            router.push({
              pathname: '/directions',
              params: {
                destinationName: hotel.name,
                destinationLat: String(hotel.latitude),
                destinationLng: String(hotel.longitude),
              },
            })
          }
        />
      </ResponsiveScrollView>
    </Screen>
  );
}
