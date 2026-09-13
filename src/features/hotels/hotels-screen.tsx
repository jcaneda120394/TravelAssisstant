import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { CityAutocomplete } from '@/components/forms/city-autocomplete';
import { TextField } from '@/components/forms/text-field';
import { DisplayPriceText } from '@/components/currency/display-price-text';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { providers } from '@/providers/registry';
import { analytics } from '@/lib/analytics';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { useLocationStore } from '@/stores/location-store';
import { getErrorMessage } from '@/lib/errors/app-error';
import type { GeoPoint } from '@/types/domain';

export function HotelsScreen() {
  const router = useRouter();
  const scheme = useAppColorScheme();
  const { currency } = useDisplayCurrency();
  const locationLabel = useLocationStore((state) => state.label);
  const coords = useLocationStore((state) => state.coords);
  const defaultCity = locationLabel?.split(',')[0] ?? 'Nearby';
  const [city, setCity] = useState(defaultCity);
  const [checkIn, setCheckIn] = useState(new Date().toISOString().slice(0, 10));
  const [checkOut, setCheckOut] = useState(
    new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
  );
  const [submittedCity, setSubmittedCity] = useState(defaultCity);
  const [searchPoint, setSearchPoint] = useState<GeoPoint | null>(coords);

  // Keep in sync when user sets location elsewhere (Home / Choose city).
  useEffect(() => {
    if (!locationLabel) {
      return;
    }
    const next = locationLabel.split(',')[0] ?? locationLabel;
    setCity(next);
    setSubmittedCity(next);
    setSearchPoint(coords);
  }, [locationLabel, coords]);

  const query = useQuery({
    queryKey: [
      'hotels',
      submittedCity,
      checkIn,
      checkOut,
      searchPoint?.latitude,
      searchPoint?.longitude,
    ],
    enabled: submittedCity.trim().length >= 2 || Boolean(searchPoint),
    staleTime: 3 * 60_000,
    retry: 1,
    queryFn: async () => {
      analytics.track('hotel_searched', { city: submittedCity });
      return providers.hotels.searchHotels({
        location: searchPoint ?? submittedCity.trim(),
        checkIn,
        checkOut,
        adults: 2,
        children: 1,
        rooms: 1,
      });
    },
  });

  const runSearch = (nextCity: string, point?: GeoPoint | null) => {
    const cleaned = nextCity.trim();
    if (cleaned.length < 2 && !point) {
      return;
    }
    setCity(cleaned);
    setSubmittedCity(cleaned || submittedCity);
    setSearchPoint(point ?? null);
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerClassName="pb-10"
        keyboardShouldPersistTaps="handled"
        testID="screen-hotels"
      >
        <SectionHeader
          title="Hotels"
          subtitle={`Prices in ${currency} · search by location or city`}
        />
        <Card className="mb-4">
          <CityAutocomplete
            label="City"
            value={city}
            nearLabel={locationLabel}
            placeholder="e.g. San Jose del Monte, Manila…"
            onChange={setCity}
            onSelect={(next, suggestion) => {
              runSearch(
                next,
                suggestion
                  ? { latitude: suggestion.latitude, longitude: suggestion.longitude }
                  : coords,
              );
            }}
          />
          <TextField label="Check-in" value={checkIn} onChangeText={setCheckIn} />
          <TextField label="Check-out" value={checkOut} onChangeText={setCheckOut} />
          <Button
            label="Search hotels"
            loading={query.isFetching}
            onPress={() => runSearch(city, searchPoint)}
          />
        </Card>

        {query.isError ? (
          <Card className="mb-4">
            <AppText className="mb-2 text-red-500">{getErrorMessage(query.error)}</AppText>
            <Button label="Try again" onPress={() => void query.refetch()} />
          </Card>
        ) : null}

        {query.isFetching ? (
          <AppText muted className="mb-3 text-center">
            Searching hotels near {submittedCity}…
          </AppText>
        ) : null}

        {!query.isFetching && !query.isError && query.data?.length === 0 ? (
          <EmptyState
            title="No hotels found"
            description="Try another city suggestion, or Use my location above."
          />
        ) : null}

        {query.data?.map((hotel) => (
          <Pressable
            key={hotel.id}
            onPress={() => router.push(`/hotels/${hotel.id}`)}
            className={`mb-3 rounded-2xl border p-4 ${
              scheme === 'dark'
                ? 'border-brand-800 bg-surface-cardDark'
                : 'border-black/8 bg-white'
            }`}
          >
            <AppText className="font-sans-semibold text-lg">{hotel.name}</AppText>
            <View className="mt-1 flex-row flex-wrap items-center gap-1">
              {hotel.rating ? (
                <AppText muted>{hotel.rating}★ · </AppText>
              ) : null}
              {hotel.pricePerNight != null ? (
                <DisplayPriceText
                  amount={hotel.pricePerNight}
                  sourceCurrency={hotel.currency ?? 'USD'}
                  suffix="/night"
                  muted
                />
              ) : (
                <AppText muted>Rate unavailable (OSM listing)</AppText>
              )}
            </View>
            <AppText muted className="mt-1">
              {hotel.address}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
