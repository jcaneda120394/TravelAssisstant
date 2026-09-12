import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useState } from 'react';

import { PlaceCard } from '@/components/cards/place-card';
import { LocationPickerModal } from '@/components/location/location-picker-modal';
import { SaveTripModal } from '@/components/trips/save-trip-modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { env } from '@/config/env';
import { QUICK_ACTIONS } from '@/constants/app';
import { useAuth } from '@/hooks/use-auth';
import { useEnsureLocation } from '@/hooks/use-ensure-location';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { providers } from '@/providers/registry';
import { listTrips } from '@/services/trips/trips.service';
import { seedProactiveNotifications } from '@/services/notifications/notifications.service';
import { looksLikeSanFrancisco } from '@/services/location/location.service';

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const HOME_ACTIONS = [
  ...QUICK_ACTIONS,
  { id: 'trips', label: 'Trips', href: '/trips' },
  { id: 'search', label: 'Search', href: '/search' },
  { id: 'weather', label: 'Weather', href: '/weather' },
  { id: 'favorites', label: 'Saved', href: '/favorites' },
] as const;

export function HomeScreen() {
  const router = useRouter();
  const scheme = useAppColorScheme();
  const queryClient = useQueryClient();
  const { profile, preferences, user } = useAuth();
  const { coords, label, hasLocation, locate, isLocating, status, error } = useEnsureLocation({
    auto: true,
  });
  const heroBg = scheme === 'dark' ? 'bg-brand-900' : 'bg-brand-600';
  const [saveOpen, setSaveOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const stuckOnSf = looksLikeSanFrancisco(coords);

  const refreshNearby = () => {
    void queryClient.invalidateQueries({ queryKey: ['home-weather'] });
    void queryClient.invalidateQueries({ queryKey: ['home-attractions'] });
    void queryClient.invalidateQueries({ queryKey: ['home-food'] });
    void queryClient.invalidateQueries({ queryKey: ['nearby'] });
    void queryClient.invalidateQueries({ queryKey: ['map-places'] });
  };

  const weatherQuery = useQuery({
    queryKey: ['home-weather', coords?.latitude, coords?.longitude, label],
    enabled: hasLocation,
    queryFn: () =>
      providers.weather.getCurrentWeather(
        coords ?? label ?? 'Current location',
      ),
    staleTime: 10 * 60_000,
  });

  const attractionsQuery = useQuery({
    queryKey: ['home-attractions', coords?.latitude, coords?.longitude],
    enabled: hasLocation && Boolean(coords),
    queryFn: () =>
      providers.places.getNearbyPlaces({
        location: coords!,
        radiusMeters: 3000,
        category: 'attraction',
        limit: 6,
      }),
    staleTime: 5 * 60_000,
  });

  const foodQuery = useQuery({
    queryKey: ['home-food', coords?.latitude, coords?.longitude],
    enabled: hasLocation && Boolean(coords),
    queryFn: () =>
      providers.places.getNearbyPlaces({
        location: coords!,
        radiusMeters: 1500,
        category: 'restaurant',
        limit: 4,
      }),
    staleTime: 5 * 60_000,
  });

  const tripsQuery = useQuery({
    queryKey: ['trips', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listTrips(user!.id),
    staleTime: 30_000,
  });

  const alertsQuery = useQuery({
    queryKey: ['home-alerts'],
    queryFn: () => seedProactiveNotifications(),
    staleTime: 15 * 60_000,
  });

  const nextTrip = tripsQuery.data?.[0];
  const locationLine = hasLocation
    ? `${label ?? 'Current location'} · ${weatherQuery.data?.temperatureC ?? '—'}°C`
    : isLocating
      ? 'Getting your location…'
      : 'Location needed for nearby places';

  return (
    <Screen testID="screen-home">
      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        <View className={`${heroBg} px-5 pb-8 pt-14`}>
          <AppText inverse className="font-sans-medium text-sm uppercase tracking-widest text-brand-100">
            {env.appName}
          </AppText>
          <AppText inverse className="mt-3 font-sans-bold text-3xl">
            {greetingForNow()}
            {profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </AppText>
          <AppText inverse className="mt-2 text-brand-100">
            {locationLine}
          </AppText>
          {coords ? (
            <AppText inverse className="mt-1 text-xs text-brand-100">
              {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
            </AppText>
          ) : null}
          <AppText inverse className="mt-1 text-brand-100">
            Budget style: {preferences?.budget_tier ?? 'not set'} ·{' '}
            {providers.usingMocks ? 'Mock' : 'Live'} data
          </AppText>
          <View className="mt-4 gap-2">
            <Button
              label={hasLocation ? 'Refresh GPS' : 'Use my location'}
              variant="secondary"
              loading={isLocating}
              onPress={() => void locate().then(refreshNearby)}
            />
            <Button
              label="Choose city (Bulacan, Manila…)"
              variant="secondary"
              onPress={() => setLocationPickerOpen(true)}
            />
          </View>
        </View>

        <View className="mt-[-20px] px-5">
          {!hasLocation && !stuckOnSf ? (
            <Card className="mb-5">
              <SectionHeader
                title="Share your location"
                subtitle="We’ll show attractions and places near you"
              />
              <AppText muted className="mb-3">
                {status === 'denied'
                  ? 'Location is off. Enable it in Settings, or choose a city manually.'
                  : error ??
                    'Allow GPS or choose your city (e.g. Bulacan) to load nearby places.'}
              </AppText>
              <Button label="Get my location" loading={isLocating} onPress={() => void locate()} />
              <View className="mt-2">
                <Button label="Choose city" variant="ghost" onPress={() => setLocationPickerOpen(true)} />
              </View>
            </Card>
          ) : null}

          {stuckOnSf ? (
            <Card className="mb-5">
              <SectionHeader
                title="Simulator GPS is San Francisco"
                subtitle="Your device GPS isn’t Bulacan yet"
              />
              <AppText muted className="mb-3">
                iOS Simulator defaults to San Francisco. Tap Choose city and pick Malolos / Bulacan,
                or in the Simulator menu set Features → Location → Custom Location
                (14.7943, 120.8799).
              </AppText>
              <Button label="Choose Bulacan / city" onPress={() => setLocationPickerOpen(true)} />
            </Card>
          ) : null}

          <Card className="mb-5">
            <SectionHeader title="Your trips" subtitle="Save a plan and open it anytime" />
            <AppText muted>
              {nextTrip
                ? `Next: ${nextTrip.title} · ${nextTrip.startDate}`
                : 'No saved trips yet — create one in a few taps.'}
            </AppText>
            <View className="mt-3 flex-row gap-2">
              <View className="flex-1">
                <Button label="Save trip" onPress={() => setSaveOpen(true)} />
              </View>
              <View className="flex-1">
                <Button
                  label="My trips"
                  variant="secondary"
                  onPress={() => router.push('/(tabs)/trips')}
                />
              </View>
            </View>
          </Card>

          {hasLocation ? (
            <Card className="mb-5">
              <SectionHeader title="Today" subtitle={label ?? 'Near you'} />
              <AppText muted>
                Weather: {weatherQuery.data?.condition ?? (weatherQuery.isLoading ? 'Loading…' : '—')}
              </AppText>
              <AppText muted className="mt-2">
                Alert: {alertsQuery.data?.[0]?.title ?? 'No alerts'}
              </AppText>
            </Card>
          ) : null}

          <SectionHeader
            title="Things to do near you"
            subtitle={hasLocation ? 'Attractions & sights nearby' : 'Enable location to load this'}
          />
          {hasLocation && attractionsQuery.isLoading ? (
            <View className="mb-4 gap-3">
              <Skeleton height={84} />
              <Skeleton height={84} />
            </View>
          ) : null}
          {hasLocation
            ? attractionsQuery.data?.map((place) => <PlaceCard key={place.id} place={place} />)
            : null}
          {hasLocation && !attractionsQuery.isLoading && (attractionsQuery.data?.length ?? 0) === 0 ? (
            <AppText muted className="mb-4">
              No attractions found within 3 km. Try Explore for a wider search.
            </AppText>
          ) : null}
          {hasLocation ? (
            <View className="mb-4">
              <Button
                label="See more nearby"
                variant="secondary"
                onPress={() => router.push('/(tabs)/explore')}
              />
            </View>
          ) : null}

          <SectionHeader
            title="Eat nearby"
            subtitle={hasLocation ? 'Restaurants & cafes' : undefined}
          />
          {hasLocation && foodQuery.isLoading ? (
            <View className="mb-4 gap-3">
              <Skeleton height={84} />
            </View>
          ) : null}
          {hasLocation
            ? foodQuery.data?.map((place) => <PlaceCard key={place.id} place={place} />)
            : null}

          <SectionHeader title="Quick actions" />
          <View className="mb-6 flex-row flex-wrap gap-3">
            {HOME_ACTIONS.map((action) => (
              <Pressable
                key={action.id}
                testID={`quick-action-${action.id}`}
                onPress={() => router.push(action.href as Href)}
                className={`rounded-2xl px-4 py-3 ${
                  scheme === 'dark' ? 'bg-surface-cardDark' : 'bg-white'
                } border ${scheme === 'dark' ? 'border-brand-800' : 'border-brand-100'}`}
              >
                <AppText className="font-sans-medium">{action.label}</AppText>
              </Pressable>
            ))}
          </View>

          <Card>
            <SectionHeader title="Ask TravelAssistant AI" subtitle="Tool-calling assistant" />
            <Button label="Open AI Assistant" onPress={() => router.push('/assistant')} />
          </Card>
        </View>
      </ScrollView>

      <SaveTripModal
        visible={saveOpen}
        onClose={() => setSaveOpen(false)}
        destinationHint={label?.split(',')[0] ?? ''}
        onSaved={(tripId) => router.push(`/trip/${tripId}`)}
      />

      <LocationPickerModal
        visible={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onChanged={refreshNearby}
      />
    </Screen>
  );
}
