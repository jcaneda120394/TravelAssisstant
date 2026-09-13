import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { PlaceCard } from '@/components/cards/place-card';
import { PlaceGrid } from '@/components/cards/place-grid';
import { CurrencyPickerModal } from '@/components/currency/currency-picker-modal';
import { LocationPickerModal } from '@/components/location/location-picker-modal';
import { PageContainer } from '@/components/layout/page-container';
import { SaveTripModal } from '@/components/trips/save-trip-modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { env } from '@/config/env';
import { formatCurrencyWithSymbol } from '@/constants/fx-currencies';
import { requireAuthForTrips, requireAuthToSave } from '@/features/auth/require-auth';
import { useAuth } from '@/hooks/use-auth';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { useEnsureLocation } from '@/hooks/use-ensure-location';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { providers } from '@/providers/registry';
import { getHomeNearbyPlaces } from '@/services/places/home-nearby.service';
import { listTrips } from '@/services/trips/trips.service';
import { looksLikeSanFrancisco } from '@/services/location/location.service';
import { getDestinationTravelGradient } from '@/utils/destination-theme';

const HOME_NEARBY_LIMIT = 16;
/** Initial search ring — service may expand further in sparse areas. */
const HOME_ATTRACTION_RADIUS_M = 60_000;
const HOME_FOOD_RADIUS_M = 35_000;

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const HOME_ACTIONS = [
  { id: 'nearby', label: 'Nearby', href: '/explore', category: 'all' },
  { id: 'food', label: 'Food', href: '/explore', category: 'restaurant' },
  { id: 'hotels', label: 'Hotels', href: '/hotels' },
  { id: 'map', label: 'Map', href: '/(tabs)/map' },
  { id: 'suggest', label: 'Suggest', href: '/trip-suggestion' },
  { id: 'ai', label: 'AI', href: '/(tabs)/assistant' },
] as const;

/** Expo Go floating menu sits top-right — keep hero copy clear of it (native only). */
const EXPO_MENU_GUTTER_IOS = 56;
const EXPO_MENU_GUTTER_ANDROID = 24;

export function HomeScreen() {
  // Budget/alert chip removed — weather-only Today card.
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useAppColorScheme();
  const { isDesktop, isWeb, scrollBottomPad } = useResponsiveLayout();
  const queryClient = useQueryClient();
  const { profile, preferences, user } = useAuth();
  const { currency, setCurrency } = useDisplayCurrency();
  const { coords, label, country, mode, hasLocation, locate, isLocating, status, error } =
    useEnsureLocation({
      auto: true,
    });
  const [saveOpen, setSaveOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const stuckOnSf = looksLikeSanFrancisco(coords) && mode !== 'manual';
  const topPad = isDesktop
    ? 40
    : Math.max(insets.top || 0, isWeb ? 16 : Platform.OS === 'ios' ? 58 : 24) + 8;
  const expoMenuGutter = isDesktop
    ? 0
    : Platform.OS === 'ios'
      ? EXPO_MENU_GUTTER_IOS
      : isWeb
        ? 0
        : EXPO_MENU_GUTTER_ANDROID;
  const destinationHint = country || label || '';
  const gradient = useMemo(
    () =>
      // Web always uses the casual (default) hero gradient.
      getDestinationTravelGradient(scheme, isWeb ? null : destinationHint, isWeb ? null : label),
    [scheme, isWeb, destinationHint, label],
  );

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
      providers.weather.getCurrentWeather(coords ?? label ?? 'Current location'),
    staleTime: 10 * 60_000,
  });

  const attractionsQuery = useQuery({
    queryKey: [
      'home-attractions',
      'v3-google',
      coords?.latitude,
      coords?.longitude,
      label,
      preferences?.traveling_with_kids,
      preferences?.kids_ages?.join(','),
      preferences?.traveling_with_elderly,
      preferences?.elderly_ages?.join(','),
    ],
    enabled: hasLocation && Boolean(coords),
    queryFn: () =>
      getHomeNearbyPlaces({
        location: coords!,
        category: 'attraction',
        cityLabel: label,
        radiusMeters: HOME_ATTRACTION_RADIUS_M,
        limit: HOME_NEARBY_LIMIT,
        companions: preferences,
      }),
    staleTime: 5 * 60_000,
  });

  const foodQuery = useQuery({
    queryKey: [
      'home-food',
      'v3-google',
      coords?.latitude,
      coords?.longitude,
      label,
      preferences?.traveling_with_kids,
      preferences?.kids_ages?.join(','),
      preferences?.traveling_with_elderly,
      preferences?.elderly_ages?.join(','),
    ],
    enabled: hasLocation && Boolean(coords),
    queryFn: () =>
      getHomeNearbyPlaces({
        location: coords!,
        category: 'restaurant',
        cityLabel: label,
        radiusMeters: HOME_FOOD_RADIUS_M,
        limit: HOME_NEARBY_LIMIT,
        companions: preferences,
      }),
    staleTime: 5 * 60_000,
  });

  // Trust the nearby service (it already radius-filters and may expand in sparse areas).
  // Re-clamping to the initial ring was dropping most Discover results.
  const attractions = useMemo(
    () => (attractionsQuery.data ?? []).slice(0, HOME_NEARBY_LIMIT),
    [attractionsQuery.data],
  );

  const foodPlaces = useMemo(
    () => (foodQuery.data ?? []).slice(0, HOME_NEARBY_LIMIT),
    [foodQuery.data],
  );

  const openExplore = (category: 'attraction' | 'restaurant') => {
    router.replace({
      pathname: '/(tabs)/explore',
      params: { category },
    });
  };

  const tripsQuery = useQuery({
    queryKey: ['trips', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listTrips(user!.id),
    staleTime: 30_000,
  });

  const nextTrip = tripsQuery.data?.[0];
  const firstName = profile?.full_name?.split(' ')[0];
  const locationLine = hasLocation
    ? `${label ?? 'Current location'}${
        weatherQuery.data?.temperatureC != null ? ` · ${weatherQuery.data.temperatureC}°C` : ''
      }`
    : isLocating
      ? 'Getting your location…'
      : 'Choose a city to personalize nearby places';

  return (
    <Screen testID="screen-home" unsafe>
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: scrollBottomPad }}
        style={{ width: '100%', maxWidth: '100%' }}
      >
        <LinearGradient
          colors={[...gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: topPad,
            paddingBottom: 36,
            paddingLeft: isDesktop ? 0 : 20,
            paddingRight: isDesktop ? 0 : 20 + expoMenuGutter,
          }}
        >
          <PageContainer>
            <View className="flex-row items-start justify-between gap-3">
              <AppText
                inverse
                className="flex-1 font-display-bold text-3xl leading-9 tracking-tight text-white"
              >
                {env.appName}
              </AppText>
              <Pressable
                onPress={() => setCurrencyPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Change display currency"
                className="mt-1 flex-row items-center gap-1 rounded-full border border-white/30 bg-white/15 px-2.5 py-1"
                testID="home-change-currency"
              >
                <AppText inverse className="text-xs font-sans-semibold text-white">
                  {formatCurrencyWithSymbol(currency)}
                </AppText>
                <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.9)" />
              </Pressable>
            </View>
            <AppText inverse className="mt-3 font-sans-semibold text-lg leading-6 text-white/95">
              {greetingForNow()}
              {firstName ? `, ${firstName}` : ''}
            </AppText>
            <AppText inverse className="mt-2 text-[15px] leading-6 text-white/85">
              Discover places around you.
            </AppText>

            <AppText inverse className="mt-4 text-sm font-sans-medium leading-5 text-white">
              {locationLine}
            </AppText>

            <View
              className={`mt-5 gap-2 ${isDesktop ? 'max-w-md flex-row' : ''}`}
              style={expoMenuGutter ? { marginRight: -expoMenuGutter } : undefined}
            >
              <View className={isDesktop ? 'flex-1' : undefined}>
                <Button
                  label="Choose city"
                  variant="secondary"
                  onPress={() => setLocationPickerOpen(true)}
                />
              </View>
            </View>
          </PageContainer>
        </LinearGradient>

        <PageContainer className={isDesktop ? 'mt-[-20px]' : 'mt-[-20px] px-5'}>
          {!hasLocation && !stuckOnSf ? (
            <Card className="mb-5">
              <SectionHeader
                eyebrow="Get started"
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
                <Button
                  label="Choose city"
                  variant="ghost"
                  onPress={() => setLocationPickerOpen(true)}
                />
              </View>
            </Card>
          ) : null}

          {stuckOnSf ? (
            <Card className="mb-5">
              <SectionHeader
                eyebrow="Simulator"
                title="GPS is San Francisco"
                subtitle="Your device GPS isn’t your real city yet"
              />
              <AppText muted className="mb-3">
                Tap Choose city to search for your city, or set a custom simulator location in
                Settings.
              </AppText>
              <Button label="Choose city" onPress={() => setLocationPickerOpen(true)} />
            </Card>
          ) : null}

          <Card className="mb-5">
            <SectionHeader
              eyebrow="Plan"
              title="Your trips"
              subtitle={
                user
                  ? 'Save a plan and open it anytime'
                  : 'Browse suggestions anytime — sign in to create or save trips'
              }
            />
            <AppText muted>
              {user
                ? nextTrip
                  ? `Next: ${nextTrip.title} · ${nextTrip.startDate}`
                  : 'No saved trips yet — create one in a few taps.'
                : 'Suggestions stay open for guests.'}
            </AppText>

            <View className="mt-4" style={{ gap: 12 }}>
              {user ? (
                <>
                  <View className="flex-row" style={{ gap: 8 }}>
                    <View className="flex-1">
                      <Button
                        label="Create trip"
                        onPress={() => {
                          if (!requireAuthForTrips(router, 'create trips')) return;
                          router.push('/create-trip');
                        }}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        label="Suggestions"
                        variant="accent"
                        onPress={() => router.push('/trip-suggestions')}
                      />
                    </View>
                  </View>
                  <View className="flex-row" style={{ gap: 8 }}>
                    <View className="flex-1">
                      <Button
                        label="Save trip"
                        variant="secondary"
                        onPress={() => {
                          if (!requireAuthToSave(router, { actionLabel: 'save trips' })) return;
                          setSaveOpen(true);
                        }}
                      />
                    </View>
                    <View className="flex-1">
                      <Button
                        label="My trips"
                        variant="secondary"
                        onPress={() => router.push('/(tabs)/trips')}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Button
                    label="Suggestions"
                    variant="accent"
                    onPress={() => router.push('/trip-suggestions')}
                  />
                  <View className="flex-row" style={{ gap: 8 }}>
                    <View className="flex-1">
                      <Button label="Sign up" onPress={() => router.push('/(auth)/signup')} />
                    </View>
                    <View className="flex-1">
                      <Button
                        label="Log in"
                        variant="secondary"
                        onPress={() => router.push('/(auth)/login')}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          </Card>

          {hasLocation ? (
            <Card className="mb-5">
              <SectionHeader eyebrow="Now" title="Today" subtitle={label ?? 'Near you'} />
              <View
                className={`rounded-2xl px-3 py-3 ${
                  scheme === 'dark' ? 'bg-brand-800' : 'bg-surface-mist'
                }`}
              >
                <AppText
                  className={`text-xs font-sans-semibold uppercase tracking-wide ${
                    scheme === 'dark' ? 'text-brand-200' : 'text-brand-600'
                  }`}
                >
                  Weather
                </AppText>
                <AppText className="mt-1 font-sans-semibold">
                  {weatherQuery.data?.condition ??
                    (weatherQuery.isLoading ? 'Loading…' : '—')}
                  {weatherQuery.data?.temperatureC != null
                    ? ` · ${weatherQuery.data.temperatureC}°C`
                    : ''}
                </AppText>
              </View>
            </Card>
          ) : null}

          <SectionHeader
            eyebrow="Discover"
            title="Things to do near you"
            subtitle={
              !hasLocation
                ? 'Enable location to load this'
                : preferences?.traveling_with_kids || preferences?.traveling_with_elderly
                  ? [
                      preferences.traveling_with_kids
                        ? `Kids${preferences.kids_ages?.length ? ` (${preferences.kids_ages.join(', ')})` : ''}`
                        : null,
                      preferences.traveling_with_elderly
                        ? `Elderly${preferences.elderly_ages?.length ? ` (${preferences.elderly_ages.join(', ')})` : ''}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') + ' — matched nearby'
                  : 'Popular attractions near your location'
            }
          />
          {hasLocation && attractionsQuery.isLoading && attractions.length === 0 ? (
            <View className="mb-4 gap-4">
              <Skeleton height={188} />
              <Skeleton height={188} />
            </View>
          ) : null}
          {hasLocation
            ? (
                <PlaceGrid>
                  {attractions.map((place) => (
                    <PlaceCard key={place.id} place={place} className="mb-0" />
                  ))}
                </PlaceGrid>
              )
            : null}
          {hasLocation && !attractionsQuery.isLoading && attractions.length === 0 ? (
            <AppText muted className="mb-4">
              No attractions found nearby. Try Explore with a wider distance.
            </AppText>
          ) : null}
          {hasLocation && attractions.length > 0 ? (
            <View className="mb-5">
              <Button
                label="See more nearby"
                variant="secondary"
                onPress={() => openExplore('attraction')}
              />
            </View>
          ) : null}

          <SectionHeader
            eyebrow="Taste"
            title="Restaurant Near Me"
            subtitle={
              !hasLocation
                ? undefined
                : preferences?.traveling_with_kids || preferences?.traveling_with_elderly
                  ? 'Family-friendly dining matched to your companions'
                  : 'Popular restaurants & cafes near your location'
            }
          />
          {hasLocation && foodQuery.isLoading && foodPlaces.length === 0 ? (
            <View className="mb-4 gap-4">
              <Skeleton height={188} />
              <Skeleton height={188} />
            </View>
          ) : null}
          {hasLocation
            ? (
                <PlaceGrid>
                  {foodPlaces.map((place) => (
                    <PlaceCard key={place.id} place={place} className="mb-0" />
                  ))}
                </PlaceGrid>
              )
            : null}
          {hasLocation && !foodQuery.isLoading && foodPlaces.length === 0 ? (
            <AppText muted className="mb-4">
              No restaurants found nearby. Try Explore for a wider search.
            </AppText>
          ) : null}
          {hasLocation && foodPlaces.length > 0 ? (
            <View className="mb-5">
              <Button
                label="See more nearby"
                variant="secondary"
                onPress={() => openExplore('restaurant')}
              />
            </View>
          ) : null}

          <SectionHeader eyebrow="Shortcuts" title="Quick actions" />
          <View className="mb-6 flex-row flex-wrap gap-2">
            {HOME_ACTIONS.map((action) => (
              <Pressable
                key={action.id}
                testID={`quick-action-${action.id}`}
                onPress={() => {
                  if ('category' in action && action.category) {
                    router.replace({
                      pathname: '/(tabs)/explore',
                      params: { category: action.category },
                    });
                    return;
                  }
                  router.push(action.href as Href);
                }}
                className={`rounded-xl border px-3.5 py-2.5 ${
                  scheme === 'dark'
                    ? 'border-brand-800 bg-transparent'
                    : 'border-black/8 bg-white'
                }`}
              >
                <AppText className="font-sans-medium text-sm">{action.label}</AppText>
              </Pressable>
            ))}
          </View>
        </PageContainer>
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

      <CurrencyPickerModal
        visible={currencyPickerOpen}
        currency={currency}
        onClose={() => setCurrencyPickerOpen(false)}
        onSelect={(next) => {
          void setCurrency(next);
        }}
      />
    </Screen>
  );
}
