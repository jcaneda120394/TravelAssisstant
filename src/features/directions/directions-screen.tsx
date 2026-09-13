import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ResponsiveScrollView } from '@/components/layout/responsive-scroll-view';
import { CityAutocomplete } from '@/components/forms/city-autocomplete';
import { MapLayersControl } from '@/components/maps/map-layers-control';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { useEnsureLocation } from '@/hooks/use-ensure-location';
import { providers } from '@/providers/registry';
import type { DestinationSuggestion } from '@/services/geo/geocode.service';
import { DEFAULT_MAP_CENTER } from '@/services/location/location.service';
import { cacheRoute } from '@/services/offline/offline.service';
import { formatDistanceMeters, formatDuration } from '@/utils/format';
import { analytics } from '@/lib/analytics';
import { labelize } from '@/constants/preferences';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import type { GeoPoint, Route, TransportMode } from '@/types/domain';

type ModeTab = 'best' | 'flight' | 'driving' | 'walking' | 'cycling' | 'bus' | 'train' | 'rideshare';

const MODE_TABS: { id: ModeTab; label: string }[] = [
  { id: 'best', label: 'Best' },
  { id: 'flight', label: 'Flight' },
  { id: 'driving', label: 'Drive' },
  { id: 'walking', label: 'Walk' },
  { id: 'cycling', label: 'Cycle' },
  { id: 'bus', label: 'Bus' },
  { id: 'train', label: 'Train' },
  { id: 'rideshare', label: 'Rideshare' },
];

const ZOOM_MIN = 5;
const ZOOM_MAX = 20;
const ZOOM_STEP = 1.5;
const DEFAULT_ZOOM = 13;
const NAV_ZOOM = 15;

function parseCoord(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[raw.length - 1] : raw;
  if (value == null || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function midpoint(a: GeoPoint, b: GeoPoint): GeoPoint {
  return {
    latitude: (a.latitude + b.latitude) / 2,
    longitude: (a.longitude + b.longitude) / 2,
  };
}

function primaryMode(route: Route): TransportMode {
  const counts = new Map<TransportMode, number>();
  for (const segment of route.segments) {
    if (segment.mode === 'walking' && route.segments.length > 2) continue;
    counts.set(segment.mode, (counts.get(segment.mode) ?? 0) + (segment.distanceMeters ?? 1));
  }
  let best: TransportMode = route.segments[0]?.mode ?? 'other';
  let bestScore = -1;
  for (const [mode, score] of counts) {
    if (score > bestScore) {
      best = mode;
      bestScore = score;
    }
  }
  return best;
}

function routeDistanceMeters(route: Route): number {
  const fromSegments = route.segments.reduce((sum, s) => sum + (s.distanceMeters ?? 0), 0);
  if (fromSegments > 0) return fromSegments;
  return route.walkingDistanceMeters;
}

function modeHint(route: Route): string {
  const mode = primaryMode(route);
  if (route.comparisonTag === 'fastest') return 'Fastest route';
  if (route.comparisonTag === 'recommended') return 'Recommended';
  if (route.comparisonTag === 'cheapest') return 'Lowest estimated cost';
  if (route.comparisonTag === 'least_walking') return 'Least walking';
  if (mode === 'walking') return 'Walking route';
  if (mode === 'cycling') return 'Cycling route';
  if (mode === 'driving') return 'Usual traffic conditions may vary';
  if (mode === 'flight' || route.comparisonTag === 'flight') {
    return 'Cross-border / long-distance flight estimate';
  }
  if (mode === 'bus' || mode === 'train') return 'Road-based transit estimate';
  if (mode === 'rideshare' || mode === 'taxi') return 'Rideshare / taxi estimate';
  return labelize(mode);
}

export function DirectionsScreen() {
  const scheme = useAppColorScheme();
  const params = useLocalSearchParams<{
    destinationName?: string | string[];
    destinationId?: string | string[];
    destinationLat?: string | string[];
    destinationLng?: string | string[];
  }>();
  const { coords, locate, mode: locationMode } = useEnsureLocation({
    auto: true,
    refresh: true,
  });
  const origin = coords ?? DEFAULT_MAP_CENTER;
  const MapView = providers.maps.MapView;

  useFocusEffect(
    useCallback(() => {
      if (locationMode === 'manual') {
        return;
      }
      void locate();
    }, [locate, locationMode]),
  );

  const paramDestinationName = useMemo(() => {
    const raw = params.destinationName;
    const value = Array.isArray(raw) ? raw[raw.length - 1] : raw;
    return value?.trim() || '';
  }, [params.destinationName]);

  const destinationFromParams = useMemo((): GeoPoint | null => {
    const lat = parseCoord(params.destinationLat);
    const lng = parseCoord(params.destinationLng);
    if (lat == null || lng == null) {
      return null;
    }
    return { latitude: lat, longitude: lng };
  }, [params.destinationLat, params.destinationLng]);

  const [destinationName, setDestinationName] = useState(paramDestinationName || '');
  const [destinationPoint, setDestinationPoint] = useState<GeoPoint | null>(destinationFromParams);
  const [modeTab, setModeTab] = useState<ModeTab>('best');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [userAdjustedZoom, setUserAdjustedZoom] = useState(false);

  useEffect(() => {
    if (paramDestinationName) {
      setDestinationName(paramDestinationName);
    }
    if (destinationFromParams) {
      setDestinationPoint(destinationFromParams);
    }
  }, [paramDestinationName, destinationFromParams]);

  const destination = useMemo((): GeoPoint => {
    if (destinationPoint) {
      return destinationPoint;
    }
    // Soft fallback near origin until the user picks a place.
    return {
      latitude: origin.latitude + 0.012,
      longitude: origin.longitude + 0.008,
    };
  }, [destinationPoint, origin.latitude, origin.longitude]);

  const hasExactDestination = Boolean(destinationPoint);

  const onSelectDestination = (next: string, suggestion?: DestinationSuggestion) => {
    setDestinationName(next);
    if (suggestion) {
      setDestinationPoint({
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
      });
      setSelectedId(null);
      setUserAdjustedZoom(false);
      setNavigating(false);
      analytics.track('directions_destination_selected', {
        name: next,
        kind: suggestion.kind,
      });
    }
  };

  const query = useQuery({
    queryKey: [
      'routes',
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
      destinationName,
    ],
    enabled: hasExactDestination,
    queryFn: async () => {
      analytics.track('route_requested', {
        hasExactDestination: true,
        destinationName,
      });
      const routes = await providers.transport.getRoutes({
        origin,
        destination,
      });
      for (const route of routes) {
        await cacheRoute(route);
      }
      return routes;
    },
  });

  const modeDurations = useMemo(() => {
    const map = new Map<ModeTab, number>();
    for (const route of query.data ?? []) {
      const mode = primaryMode(route);
      const tab: ModeTab =
        mode === 'flight' || route.comparisonTag === 'flight'
          ? 'flight'
          : mode === 'driving'
            ? 'driving'
            : mode === 'walking'
              ? 'walking'
              : mode === 'cycling'
                ? 'cycling'
                : mode === 'bus'
                  ? 'bus'
                  : mode === 'train'
                    ? 'train'
                    : mode === 'rideshare' || mode === 'taxi'
                      ? 'rideshare'
                      : 'best';
      const prev = map.get(tab);
      if (prev == null || route.durationSeconds < prev) {
        map.set(tab, route.durationSeconds);
      }
    }
    const all = query.data ?? [];
    if (all.length) {
      map.set(
        'best',
        Math.min(...all.map((route) => route.durationSeconds)),
      );
    }
    return map;
  }, [query.data]);

  const routes = useMemo(() => {
    const all = [...(query.data ?? [])].sort(
      (a, b) => a.durationSeconds - b.durationSeconds,
    );
    if (modeTab === 'best') {
      return all.slice(0, 6);
    }
    return all.filter((route) => {
      const mode = primaryMode(route);
      if (modeTab === 'rideshare') return mode === 'rideshare' || mode === 'taxi';
      if (modeTab === 'flight') return mode === 'flight' || route.comparisonTag === 'flight';
      return mode === modeTab;
    });
  }, [modeTab, query.data]);

  const hasFlight = useMemo(
    () =>
      (query.data ?? []).some(
        (route) => primaryMode(route) === 'flight' || route.comparisonTag === 'flight',
      ),
    [query.data],
  );

  const visibleModeTabs = useMemo(
    () => MODE_TABS.filter((tab) => tab.id !== 'flight' || hasFlight),
    [hasFlight],
  );

  useEffect(() => {
    if (hasFlight) {
      setModeTab('flight');
    }
  }, [hasFlight]);

  useEffect(() => {
    setSelectedId(routes[0]?.id ?? null);
    setDetailsOpen(true);
  }, [modeTab, routes]);

  const selected: Route | undefined =
    routes.find((route) => route.id === selectedId) ?? routes[0];

  const path = useMemo(() => {
    if (selected?.geometry?.length) {
      return selected.geometry;
    }
    return [origin, destination];
  }, [selected?.geometry, origin, destination]);

  const isFlightRoute =
    selected != null &&
    (primaryMode(selected) === 'flight' || selected.comparisonTag === 'flight');

  const markers = useMemo(() => {
    const base = [
      {
        id: 'origin',
        coordinate: origin,
        title: 'You',
        category: 'origin',
        color: '#0B726A',
      },
      {
        id: 'destination',
        coordinate: destination,
        title: destinationName,
        category: 'destination',
        color: '#C45C26',
      },
    ];
    if (!isFlightRoute || !selected?.geometry || selected.geometry.length < 4) {
      return base;
    }
    const flightSeg = selected.segments.find((s) => s.mode === 'flight');
    const geo = selected.geometry;
    return [
      ...base,
      {
        id: 'origin-airport',
        coordinate: geo[1]!,
        title: flightSeg?.fromName ?? 'Departure airport',
        category: 'airport',
        color: '#0369A1',
      },
      {
        id: 'dest-airport',
        coordinate: geo[geo.length - 2]!,
        title: flightSeg?.toName ?? 'Arrival airport',
        category: 'airport',
        color: '#0369A1',
      },
    ];
  }, [origin, destination, destinationName, selected, isFlightRoute]);

  const cameraCenter = useMemo(
    () => (navigating ? origin : midpoint(origin, destination)),
    [navigating, origin, destination],
  );

  useEffect(() => {
    setUserAdjustedZoom(false);
    setZoom(navigating ? NAV_ZOOM : DEFAULT_ZOOM);
  }, [selected?.id, navigating, path.length]);

  const zoomIn = () => {
    setUserAdjustedZoom(true);
    setZoom((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP));
  };
  const zoomOut = () => {
    setUserAdjustedZoom(true);
    setZoom((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP));
  };

  const zoomBtnClass = (disabled: boolean) =>
    `h-11 w-11 items-center justify-center rounded-2xl border ${
      scheme === 'dark'
        ? 'border-brand-700 bg-surface-cardDark'
        : 'border-brand-200 bg-white'
    } ${disabled ? 'opacity-40' : ''}`;

  const chipClass = (active: boolean) =>
    `mr-2 min-w-[72px] items-center rounded-full border px-3 py-2 ${
      active
        ? scheme === 'dark'
          ? 'border-brand-500 bg-brand-700'
          : 'border-brand-600 bg-brand-600'
        : scheme === 'dark'
          ? 'border-brand-800 bg-surface-cardDark'
          : 'border-black/8 bg-white'
    }`;

  return (
    <Screen>
      <ResponsiveScrollView
        className="flex-1 px-5 pt-4"
        testID="screen-directions"
      >
        <SectionHeader
          title={navigating ? 'Navigation' : 'Directions'}
          subtitle={
            navigating
              ? `To ${destinationName}`
              : 'Routes, alternatives, and turn-by-turn detail'
          }
        />

        {/* Origin / destination — Google-style */}
        <Card className="mb-4 overflow-visible">
          <View className="flex-row items-start gap-3">
            <View className="mt-1.5 h-3 w-3 rounded-full border-2 border-brand-600" />
            <View className="flex-1">
              <AppText muted className="text-xs uppercase tracking-wide">
                From
              </AppText>
              <AppText className="font-sans-semibold">Your location</AppText>
            </View>
          </View>
          <View className="my-2 ml-1.5 h-6 w-px bg-brand-200 dark:bg-brand-800" />
          <View className="flex-row items-start gap-3">
            <View
              className="mt-1.5 h-3 w-3 rounded-sm"
              style={{ backgroundColor: '#C45C26' }}
            />
            <View className="flex-1">
              <CityAutocomplete
                label="To"
                value={destinationName}
                onChange={(next) => {
                  setDestinationName(next);
                  if (destinationPoint) {
                    setDestinationPoint(null);
                    setSelectedId(null);
                    setNavigating(false);
                  }
                }}
                onSelect={onSelectDestination}
                placeholder="Search place or city…"
                includePlaces
                near={origin}
                compact
                testID="directions-to-search"
              />
              {!hasExactDestination ? (
                <AppText muted className="mt-1 text-xs">
                  Search and pick a place to load live routes.
                </AppText>
              ) : null}
            </View>
          </View>
        </Card>

        <View className="relative mb-4">
          <MapView
            camera={{ center: cameraCenter, zoom }}
            markers={markers}
            userLocation={coords}
            showUserLocation
            followUserLocation={navigating || path.length < 2}
            selectedMarkerId="destination"
            mapHeight={navigating ? 420 : 280}
            polylines={
              path.length >= 2
                ? [
                    {
                      id: selected?.id ?? 'route',
                      coordinates: path,
                      color: '#0B726A',
                      strokeWidth: 5,
                    },
                  ]
                : []
            }
            fitToCoordinates={userAdjustedZoom ? undefined : path}
          />
          <MapLayersControl testID="directions-layers-control" />
          <View pointerEvents="box-none" className="absolute bottom-4 left-4 gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
              testID="directions-zoom-in"
              onPress={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              className={zoomBtnClass(zoom >= ZOOM_MAX)}
            >
              <AppText className="font-sans-bold text-2xl leading-7 text-brand-700 dark:text-brand-200">
                +
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
              testID="directions-zoom-out"
              onPress={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              className={zoomBtnClass(zoom <= ZOOM_MIN)}
            >
              <AppText className="font-sans-bold text-2xl leading-7 text-brand-700 dark:text-brand-200">
                −
              </AppText>
            </Pressable>
          </View>
        </View>

        {navigating && selected ? (
          <Card className="mb-4">
            <AppText className="font-sans-semibold text-lg text-brand-700 dark:text-brand-200">
              {formatDuration(selected.durationSeconds)}
            </AppText>
            <AppText className="mt-1 font-sans-semibold">{selected.summary}</AppText>
            <AppText muted className="mt-1">
              {formatDistanceMeters(routeDistanceMeters(selected))} · follow steps below
            </AppText>
            <View className="mt-3">
              <Button
                label="End navigation"
                variant="secondary"
                onPress={() => setNavigating(false)}
              />
            </View>
          </Card>
        ) : null}

        {!navigating ? (
          <>
            {/* Mode strip with times */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ paddingRight: 20 }}
            >
              <View className="flex-row">
                {visibleModeTabs.map((tab) => {
                  const duration = modeDurations.get(tab.id);
                  const active = modeTab === tab.id;
                  const disabled = tab.id !== 'best' && duration == null && !query.isLoading;
                  return (
                    <Pressable
                      key={tab.id}
                      disabled={disabled}
                      onPress={() => setModeTab(tab.id)}
                      className={chipClass(active)}
                      style={{ opacity: disabled ? 0.4 : 1 }}
                    >
                      <AppText
                        className={`text-sm font-sans-semibold ${active ? 'text-white' : ''}`}
                      >
                        {tab.label}
                      </AppText>
                      <AppText
                        className={`text-xs ${active ? 'text-white/90' : ''}`}
                        muted={!active}
                      >
                        {duration != null ? formatDuration(duration) : query.isLoading ? '…' : '—'}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {query.isLoading ? <Skeleton height={120} className="mb-4" /> : null}
            {query.isError ? (
              <Card className="mb-4">
                <AppText className="text-red-500">Could not load routes. Try again.</AppText>
                <View className="mt-3">
                  <Button label="Retry" onPress={() => void query.refetch()} />
                </View>
              </Card>
            ) : null}

            <View className="gap-3">
              {!query.isLoading && !query.isError && routes.length === 0 ? (
                <Card>
                  <AppText muted>
                    No routes for this mode. Try Best, Drive, or Walk.
                  </AppText>
                </Card>
              ) : null}

              {routes.map((route, index) => {
                const active = selected?.id === route.id;
                const distance = routeDistanceMeters(route);
                return (
                  <Card
                    key={route.id}
                    className={active ? 'border-brand-500' : ''}
                  >
                    <Pressable
                      onPress={() => {
                        setSelectedId(route.id);
                        setDetailsOpen(true);
                      }}
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <AppText className="font-sans-semibold text-base">
                            {route.summary}
                          </AppText>
                          <AppText className="mt-1 text-lg font-sans-bold text-brand-700 dark:text-brand-200">
                            {formatDuration(route.durationSeconds)}
                          </AppText>
                          <AppText muted className="mt-0.5">
                            {formatDistanceMeters(distance)}
                            {route.estimatedCost != null
                              ? ` · ~${route.currency ?? ''} ${route.estimatedCost}`
                              : ''}
                            {route.walkingDistanceMeters > 0 &&
                            primaryMode(route) !== 'walking'
                              ? ` · ${formatDistanceMeters(route.walkingDistanceMeters)} walk`
                              : ''}
                          </AppText>
                          <AppText muted className="mt-1 text-sm">
                            {index === 0 && modeTab === 'best'
                              ? 'Fastest overall option'
                              : modeHint(route)}
                            {route.transferCount
                              ? ` · ${route.transferCount} transfer(s)`
                              : ''}
                          </AppText>
                        </View>
                        <AppText muted className="text-xs">
                          {labelize(primaryMode(route))}
                        </AppText>
                      </View>

                      {route.warnings?.map((warning) => (
                        <AppText
                          key={warning}
                          className="mt-2 text-sm text-amber-700 dark:text-amber-300"
                        >
                          ⚠ {warning}
                        </AppText>
                      ))}
                    </Pressable>

                    <View className="mt-3 flex-row gap-2">
                      <View className="flex-1">
                        <Button
                          label={active && detailsOpen ? 'Hide details' : 'Details'}
                          variant="secondary"
                          onPress={() => {
                            setSelectedId(route.id);
                            setDetailsOpen((open) => (active ? !open : true));
                          }}
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label="Preview"
                          variant="secondary"
                          onPress={() => {
                            setSelectedId(route.id);
                            setNavigating(false);
                          }}
                        />
                      </View>
                      <View className="flex-1">
                        <Button
                          label="Start"
                          onPress={() => {
                            setSelectedId(route.id);
                            setNavigating(true);
                            setDetailsOpen(true);
                            analytics.track('navigation_started', { routeId: route.id });
                          }}
                        />
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </>
        ) : null}

        {selected && detailsOpen ? (
          <Card className="mt-4">
            <SectionHeader
              title={navigating ? 'Turn by turn' : 'Step by step'}
              subtitle={
                selected.isMock
                  ? 'Demo route data'
                  : `${selected.segments.length} steps · ${formatDistanceMeters(routeDistanceMeters(selected))} · ${formatDuration(selected.durationSeconds)}`
              }
            />

            {selected.segments.map((segment, index) => {
              const isArrive = /arrive/i.test(segment.instruction);
              const isDepart = /depart|head out/i.test(segment.instruction);
              return (
                <View
                  key={segment.id}
                  className={`mb-3 border-l-2 pl-3 ${
                    scheme === 'dark' ? 'border-brand-700' : 'border-brand-200'
                  }`}
                >
                  <AppText muted className="text-xs">
                    Step {index + 1}
                    {isDepart ? ' · Start' : ''}
                    {isArrive ? ' · Destination' : ''}
                  </AppText>
                  <AppText className="font-sans-semibold text-base">
                    {segment.instruction}
                  </AppText>
                  <AppText muted className="mt-0.5 text-sm">
                    {[
                      labelize(segment.mode),
                      segment.lineName && segment.lineName !== segment.instruction
                        ? segment.lineName
                        : null,
                      segment.direction,
                      segment.entrance ? `Enter ${segment.entrance}` : null,
                      segment.exit,
                      segment.platform,
                      formatDuration(segment.durationSeconds),
                      segment.distanceMeters != null
                        ? formatDistanceMeters(segment.distanceMeters)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </AppText>
                </View>
              );
            })}

            {selected.warnings?.map((warning) => (
              <AppText key={warning} className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                ⚠ {warning}
              </AppText>
            ))}
          </Card>
        ) : null}

        {!navigating && selected ? (
          <View className="mt-4">
            <Button
              label={`Start navigation · ${formatDuration(selected.durationSeconds)}`}
              onPress={() => {
                setNavigating(true);
                setDetailsOpen(true);
                analytics.track('navigation_started', { routeId: selected.id });
              }}
            />
          </View>
        ) : null}
      </ResponsiveScrollView>
    </Screen>
  );
}
