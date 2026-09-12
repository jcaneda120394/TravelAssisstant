import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/forms/chip-select';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { providers } from '@/providers/registry';
import { useResolvedCoords } from '@/services/location/location.service';
import { cacheRoute } from '@/services/offline/offline.service';
import { formatDistanceMeters, formatDuration } from '@/utils/format';
import { analytics } from '@/lib/analytics';
import { labelize } from '@/constants/preferences';
import type { Route } from '@/types/domain';

const FILTERS = [
  'all',
  'recommended',
  'fastest',
  'cheapest',
  'least_walking',
  'fewest_transfers',
  'most_accessible',
  'best_for_families',
  'taxi_rideshare',
] as const;

export function DirectionsScreen() {
  const params = useLocalSearchParams<{ destinationName?: string }>();
  const origin = useResolvedCoords();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['routes', origin],
    queryFn: async () => {
      analytics.track('route_requested');
      const routes = await providers.transport.getRoutes({
        origin,
        destination: {
          latitude: origin.latitude + 0.035,
          longitude: origin.longitude + 0.02,
        },
      });
      for (const route of routes) {
        await cacheRoute(route);
      }
      return routes;
    },
  });

  const routes = useMemo(() => {
    const data = query.data ?? [];
    if (filter === 'all') {
      return data;
    }
    return data.filter((route) => route.comparisonTag === filter);
  }, [filter, query.data]);

  const selected: Route | undefined =
    routes.find((route) => route.id === selectedId) ?? routes[0];

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-directions">
        <SectionHeader
          title="Directions"
          subtitle={`To ${params.destinationName ?? 'selected destination'} · mock transit engine`}
        />

        <AppText className="mb-2 font-sans-medium">Compare</AppText>
        <ChipSelect
          options={FILTERS}
          values={[filter]}
          multiple={false}
          labels={Object.fromEntries(FILTERS.map((item) => [item, labelize(item)]))}
          onChange={(values) => setFilter(values[0] ?? 'all')}
        />

        {query.isLoading ? <Skeleton height={120} className="mt-4" /> : null}

        <View className="mt-4 gap-3">
          {routes.map((route) => (
            <Card key={route.id} className={selected?.id === route.id ? 'border-brand-500' : ''}>
              <AppText className="font-sans-semibold">{route.summary}</AppText>
              <AppText muted className="mt-1">
                {formatDuration(route.durationSeconds)} · {route.transferCount} transfers ·{' '}
                {formatDistanceMeters(route.walkingDistanceMeters)} walk
                {route.estimatedCost != null
                  ? ` · ${route.currency} ${route.estimatedCost}`
                  : ''}
              </AppText>
              {route.comparisonTag ? (
                <AppText className="mt-1 text-sm text-brand-600">
                  {labelize(route.comparisonTag)}
                </AppText>
              ) : null}
              <View className="mt-3">
                <Button
                  label={selected?.id === route.id ? 'Selected' : 'View steps'}
                  variant={selected?.id === route.id ? 'primary' : 'secondary'}
                  onPress={() => setSelectedId(route.id)}
                />
              </View>
            </Card>
          ))}
        </View>

        {selected ? (
          <Card className="mt-4">
            <SectionHeader title="Step by step" subtitle="Mock provider data — not live schedules" />
            {selected.segments.map((segment, index) => (
              <View key={segment.id} className="mb-3">
                <AppText className="font-sans-semibold">
                  {index + 1}. {segment.instruction}
                </AppText>
                <AppText muted className="text-sm">
                  {segment.mode}
                  {segment.lineName ? ` · ${segment.lineName}` : ''}
                  {segment.direction ? ` · ${segment.direction}` : ''}
                  {segment.entrance ? ` · Enter ${segment.entrance}` : ''}
                  {segment.exit ? ` · Exit ${segment.exit}` : ''}
                  {segment.platform ? ` · ${segment.platform}` : ''}
                  {` · ${formatDuration(segment.durationSeconds)}`}
                </AppText>
              </View>
            ))}
            {selected.warnings?.map((warning) => (
              <AppText key={warning} className="mt-1 text-sm text-accent-600">
                {warning}
              </AppText>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
