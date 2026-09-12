import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';

import { PlaceCard } from '@/components/cards/place-card';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { env } from '@/config/env';
import { QUICK_ACTIONS } from '@/constants/app';
import { useAuth } from '@/hooks/use-auth';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { providers } from '@/providers/registry';
import { useLocationStore } from '@/stores/location-store';
import { useResolvedCoords } from '@/services/location/location.service';
import { listTrips } from '@/services/trips/trips.service';
import { seedProactiveNotifications } from '@/services/notifications/notifications.service';

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const HOME_ACTIONS = [
  ...QUICK_ACTIONS,
  { id: 'search', label: 'Search', href: '/search' },
  { id: 'weather', label: 'Weather', href: '/weather' },
  { id: 'favorites', label: 'Saved', href: '/favorites' },
  { id: 'alerts', label: 'Alerts', href: '/notifications' },
] as const;

export function HomeScreen() {
  const router = useRouter();
  const scheme = useAppColorScheme();
  const { user, profile, preferences } = useAuth();
  const label = useLocationStore((state) => state.label);
  const coords = useResolvedCoords();
  const heroBg = scheme === 'dark' ? 'bg-brand-900' : 'bg-brand-600';

  const weatherQuery = useQuery({
    queryKey: ['home-weather', label],
    queryFn: () => providers.weather.getCurrentWeather(label ?? 'Tokyo'),
  });

  const breakfastQuery = useQuery({
    queryKey: ['home-breakfast', coords],
    queryFn: () =>
      providers.places.getNearbyPlaces({
        location: coords,
        radiusMeters: 1500,
        category: 'restaurant',
        limit: 3,
      }),
  });

  const tripsQuery = useQuery({
    queryKey: ['home-trips', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listTrips(user!.id),
  });

  const alertsQuery = useQuery({
    queryKey: ['home-alerts'],
    queryFn: () => seedProactiveNotifications(),
  });

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
            {label ?? 'Set your location from Map'} · {weatherQuery.data?.temperatureC ?? '—'}°C
          </AppText>
          <AppText inverse className="mt-1 text-brand-100">
            Budget style: {preferences?.budget_tier ?? 'not set'} · Providers:{' '}
            {providers.usingMocks ? 'Mock' : 'Live'}
          </AppText>
        </View>

        <View className="mt-[-20px] px-5">
          <Card className="mb-5">
            <SectionHeader title="Today" subtitle="Context-aware home cards" />
            <AppText muted>
              Next trip: {tripsQuery.data?.[0]?.title ?? 'Create a trip to personalize today'}
            </AppText>
            <AppText muted className="mt-2">
              Weather: {weatherQuery.data?.condition ?? 'Loading…'}
            </AppText>
            <AppText muted className="mt-2">
              Alert: {alertsQuery.data?.[0]?.title ?? 'No alerts'}
            </AppText>
          </Card>

          <SectionHeader title="Breakfast near you" />
          {breakfastQuery.data?.slice(0, 2).map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}

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
    </Screen>
  );
}
