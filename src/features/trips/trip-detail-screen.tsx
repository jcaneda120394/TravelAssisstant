import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { TextField } from '@/components/forms/text-field';
import { DatePickerField } from '@/components/forms/date-picker-field';
import { DestinationAutocomplete } from '@/components/forms/destination-autocomplete';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { requireAuthForTrips } from '@/features/auth/require-auth';
import { useAuth } from '@/hooks/use-auth';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { providers } from '@/providers/registry';
import {
  addItineraryItem,
  listItinerary,
  optimizeItineraryDay,
  removeItineraryItem,
} from '@/services/itinerary/itinerary.service';
import { listItineraryDays } from '@/services/trips/itinerary-days.service';
import { listTripAccommodations } from '@/services/trips/trip-accommodations.service';
import { listTransportSegments } from '@/services/trips/transport-segments.service';
import {
  deleteTrip,
  getTrip,
  inviteTripMember,
  listTripMembers,
  revokeTripInvite,
  updateTrip,
} from '@/services/trips/trips.service';
import { setTripPublic } from '@/services/travel-spots/travel-spots.service';
import { shareTrip } from '@/services/trips/share-trip.service';
import { getBudget, listExpenses, summarizeExpenses, upsertBudget } from '@/services/budget/budget.service';
import { getErrorMessage } from '@/lib/errors/app-error';
import { Skeleton } from '@/components/feedback/skeleton';
import { formatDayLabel, formatTripDateRange, tripCalendarDays } from '@/utils/dates';
import { findNextFreeSlot } from '@/utils/itinerary-time';
import type { ItineraryItem, TransportSegment, Trip } from '@/types/domain';
import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';

type TabId = 'overview' | 'itinerary' | 'map' | 'hotels' | 'budget';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'map', label: 'Map' },
  { id: 'hotels', label: 'Hotels' },
  { id: 'budget', label: 'Budget' },
];

function daysUntil(startDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function groupWeeks(days: string[]): Array<{ label: string; days: string[]; offset: number }> {
  if (days.length <= 7) {
    return [{ label: 'All days', days, offset: 0 }];
  }
  const weeks: Array<{ label: string; days: string[]; offset: number }> = [];
  for (let w = 0; w * 7 < days.length; w++) {
    const slice = days.slice(w * 7, w * 7 + 7);
    weeks.push({
      label: `Week ${w + 1} · Days ${w * 7 + 1}–${w * 7 + slice.length}`,
      days: slice,
      offset: w * 7,
    });
  }
  return weeks;
}

export function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useAppColorScheme();
  const { user } = useAuth();
  const { currency } = useDisplayCurrency();
  const queryClient = useQueryClient();
  const MapView = providers.maps.MapView;

  const [tab, setTab] = useState<TabId>('overview');
  const [inviteEmail, setInviteEmail] = useState('');
  const [activityTitle, setActivityTitle] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editDestinations, setEditDestinations] = useState<string[]>([]);
  const [editAdults, setEditAdults] = useState('2');
  const [editChildren, setEditChildren] = useState('0');

  const tripQuery = useQuery({
    queryKey: ['trip', id],
    enabled: Boolean(id),
    queryFn: () => getTrip(String(id)),
  });

  useFocusEffect(
    useCallback(() => {
      if (user) return;
      if (tripQuery.data?.isPublic) return;
      if (tripQuery.isLoading || tripQuery.isFetching) return;
      requireAuthForTrips(router, 'open saved trips');
      router.replace('/(tabs)');
    }, [router, user, tripQuery.data?.isPublic, tripQuery.isLoading, tripQuery.isFetching]),
  );

  const allDaysQuery = useQuery({
    queryKey: ['itinerary-all', id],
    enabled: Boolean(id),
    queryFn: () => listItinerary(String(id)),
    staleTime: 15_000,
  });

  const dayMetaQuery = useQuery({
    queryKey: ['itinerary-days', id],
    enabled: Boolean(id),
    queryFn: () => listItineraryDays(String(id)),
  });

  const staysQuery = useQuery({
    queryKey: ['trip-stays', id],
    enabled: Boolean(id),
    queryFn: () => listTripAccommodations(String(id)),
  });

  const tripDays = useMemo(() => {
    if (!tripQuery.data) return [];
    const base = tripCalendarDays({
      startDate: tripQuery.data.startDate,
      endDate: tripQuery.data.endDate,
      openEnded: tripQuery.data.openEnded,
      durationDays: tripQuery.data.openEnded ? 7 : undefined,
    });
    if (!tripQuery.data.openEnded) return base;
    const itemDays = [...new Set((allDaysQuery.data ?? []).map((item) => item.day))].sort();
    const merged = [...new Set([...base, ...itemDays])].sort();
    return merged.length ? merged : base;
  }, [tripQuery.data, allDaysQuery.data]);

  useEffect(() => {
    if (!tripQuery.data) return;
    setEditTitle(tripQuery.data.title);
    setEditStartDate(tripQuery.data.startDate);
    setEditEndDate(tripQuery.data.endDate ?? tripQuery.data.startDate);
    setEditDestinations(tripQuery.data.destinations ?? []);
    setEditAdults(String(tripQuery.data.adults));
    setEditChildren(String(tripQuery.data.children));
  }, [tripQuery.data]);

  useEffect(() => {
    if (!selectedDay && tripDays[0]) setSelectedDay(tripDays[0]);
  }, [tripDays, selectedDay]);

  useEffect(() => {
    if (selectedDay && tripDays.length && !tripDays.includes(selectedDay)) {
      setSelectedDay(tripDays[0] ?? null);
    }
  }, [tripDays, selectedDay]);

  const day = selectedDay ?? tripDays[0] ?? new Date().toISOString().slice(0, 10);

  const itineraryQuery = useQuery({
    queryKey: ['itinerary', id, day],
    enabled: Boolean(id) && Boolean(day),
    queryFn: () => listItinerary(String(id), day),
  });

  const segmentsQuery = useQuery({
    queryKey: ['transport-segments', id, day],
    enabled: Boolean(id) && Boolean(day),
    queryFn: () => listTransportSegments(String(id), day),
  });

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of allDaysQuery.data ?? []) {
      map.set(item.day, (map.get(item.day) ?? 0) + 1);
    }
    return map;
  }, [allDaysQuery.data]);

  const budgetQuery = useQuery({
    queryKey: ['budget', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const budget = await getBudget(String(id));
      const expenses = await listExpenses(String(id));
      return { budget, expenses, summary: summarizeExpenses(expenses, budget) };
    },
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const current = tripQuery.data;
      if (!user?.id || !current?.ownerId || current.ownerId !== user.id) {
        throw new Error('Shared trips are view-only.');
      }
      if (current.isPublic) {
        throw new Error('Make the trip private before editing the itinerary.');
      }
      if (!activityTitle.trim()) throw new Error('Enter an activity title');
      const slot = findNextFreeSlot(itineraryQuery.data ?? [], 120);
      if (!slot) {
        throw new Error('No free time left on this day. Remove a stop or pick another day.');
      }
      return addItineraryItem({
        tripId: String(id),
        day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        title: activityTitle.trim(),
        kind: 'custom',
        estimatedCost: 20,
        currency,
        notes: 'Added from trip planner',
      });
    },
    onSuccess: () => {
      setActivityTitle('');
      void queryClient.invalidateQueries({ queryKey: ['itinerary', id] });
      void queryClient.invalidateQueries({ queryKey: ['itinerary-all', id] });
    },
    onError: (error) => Alert.alert('Could not add stop', getErrorMessage(error)),
  });

  const optimize = useMutation({
    mutationFn: () => optimizeItineraryDay(String(id), day),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['itinerary', id] });
      void queryClient.invalidateQueries({ queryKey: ['itinerary-all', id] });
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in required');
      return inviteTripMember({
        tripId: String(id),
        email: inviteEmail,
        role: 'editor',
        invitedByUserId: user.id,
      });
    },
    onSuccess: async (member) => {
      setInviteEmail('');
      void queryClient.invalidateQueries({ queryKey: ['trip-members', id] });
      const token = member.inviteToken;
      if (token) {
        const link =
          Platform.OS === 'web'
            ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${token}`
            : `travelassistant://invite/${token}`;
        await Clipboard.setStringAsync(link).catch(() => undefined);
        Alert.alert(
          'Invite created',
          `A secure invite link was copied to the clipboard. It expires in 14 days and is single-use after acceptance.`,
        );
      } else {
        Alert.alert('Invite saved', 'Collaboration invite stored.');
      }
    },
    onError: (error) => Alert.alert('Invite failed', getErrorMessage(error)),
  });

  const membersQuery = useQuery({
    queryKey: ['trip-members', id],
    queryFn: () => listTripMembers(String(id)),
    enabled: Boolean(id) && Boolean(user),
  });

  const revokeInvite = useMutation({
    mutationFn: (memberId: string) => revokeTripInvite(memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trip-members', id] });
      Alert.alert('Invite revoked', 'That collaborator can no longer use the invite.');
    },
    onError: (error) => Alert.alert('Revoke failed', getErrorMessage(error)),
  });

  const ensureBudget = useMutation({
    mutationFn: () => upsertBudget({ tripId: String(id), total: 2000, currency }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['budget', id] }),
  });

  const saveTripDetails = useMutation({
    mutationFn: async () => {
      const current = tripQuery.data;
      if (!user?.id || !current?.ownerId || current.ownerId !== user.id) {
        throw new Error('Only the trip owner can edit these details.');
      }
      if (current.isPublic) {
        throw new Error('Make the trip private before editing shared details.');
      }
      const title = editTitle.trim();
      if (!title) throw new Error('Enter a trip name');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(editStartDate) || !/^\d{4}-\d{2}-\d{2}$/.test(editEndDate)) {
        throw new Error('Use dates as YYYY-MM-DD');
      }
      if (editEndDate < editStartDate) throw new Error('End date must be on or after start date');
      return updateTrip(String(id), {
        title,
        startDate: editStartDate,
        endDate: editEndDate,
        destinations: editDestinations.map((item) => item.trim()).filter(Boolean),
        adults: Math.max(1, Number(editAdults) || 1),
        children: Math.max(0, Number(editChildren) || 0),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trip', id] });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['itinerary', id] });
      void queryClient.invalidateQueries({ queryKey: ['itinerary-all', id] });
      Alert.alert('Trip updated', 'Details saved.');
    },
    onError: (error) => Alert.alert('Could not update trip', getErrorMessage(error)),
  });

  const removeTrip = useMutation({
    mutationFn: () => deleteTrip(String(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.removeQueries({ queryKey: ['trip', id] });
      void queryClient.removeQueries({ queryKey: ['itinerary', id] });
      void queryClient.removeQueries({ queryKey: ['itinerary-all', id] });
      void queryClient.removeQueries({ queryKey: ['budget', id] });
      router.replace('/(tabs)/trips');
    },
    onError: (error) => Alert.alert('Could not delete trip', getErrorMessage(error)),
  });

  const publishTrip = useMutation({
    mutationFn: (isPublic: boolean) => setTripPublic(String(id), isPublic),
    onSuccess: (trip) => {
      void queryClient.invalidateQueries({ queryKey: ['trip', id] });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['public-trips'] });
      Alert.alert(
        trip.isPublic ? 'Trip published' : 'Trip private again',
        trip.isPublic
          ? 'Guests can browse this trip from Travel Guide.'
          : 'This trip is only visible to you.',
      );
    },
    onError: (error) => Alert.alert('Could not update visibility', getErrorMessage(error)),
  });

  const openShareSheet = async (trip: Trip) => {
    try {
      await shareTrip(trip);
    } catch (error) {
      Alert.alert('Could not share trip', getErrorMessage(error));
    }
  };

  const handleShareTrip = (trip: Trip) => {
    if (trip.isPublic) {
      void openShareSheet(trip);
      return;
    }
    Alert.alert(
      'Share this trip?',
      'Make it public so people who open your link can view it in Travel Guide, or share the link privately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share link only',
          onPress: () => {
            void openShareSheet(trip);
          },
        },
        {
          text: 'Make public & share',
          onPress: () => {
            void (async () => {
              try {
                const published = await setTripPublic(String(id), true);
                void queryClient.invalidateQueries({ queryKey: ['trip', id] });
                void queryClient.invalidateQueries({ queryKey: ['trips'] });
                void queryClient.invalidateQueries({ queryKey: ['public-trips'] });
                await openShareSheet(published);
              } catch (error) {
                Alert.alert('Could not publish trip', getErrorMessage(error));
              }
            })();
          },
        },
      ],
    );
  };

  const confirmDelete = () => {
    const title = tripQuery.data?.title ?? 'this trip';
    Alert.alert('Delete trip?', title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeTrip.mutate() },
    ]);
  };

  if (tripQuery.isLoading) {
    return (
      <Screen className="px-5 pt-4">
        <Skeleton height={160} />
      </Screen>
    );
  }

  if (!tripQuery.data) {
    return (
      <Screen className="px-5 pt-4">
        <EmptyState title="Trip not found" description="Create a trip from the Trips tab." />
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const trip = tripQuery.data;
  const summary = budgetQuery.data?.summary;
  // Strict ownership — shared viewers (guest or signed-in non-owner) stay view-only.
  const isOwner = Boolean(user?.id && trip.ownerId && trip.ownerId === user.id);
  // While a trip is public/shared, recipients and the public link are view-only.
  // Owners can still manage share settings; trip content edits require making it private first.
  const canEdit = isOwner && !trip.isPublic;
  const isViewOnly = !canEdit;
  const isSharedPublic = Boolean(trip.isPublic) && !isOwner;
  const countdown = daysUntil(trip.startDate);
  const nextActivity = (allDaysQuery.data ?? [])
    .slice()
    .sort((a, b) => a.day.localeCompare(b.day) || a.startTime.localeCompare(b.startTime))[0];
  const weeks = groupWeeks(tripDays);
  const dayMeta = (dayMetaQuery.data ?? []).find((meta) => meta.day === day);
  const segmentsByFrom = new Map<string, TransportSegment>();
  for (const segment of segmentsQuery.data ?? []) {
    if (segment.fromItemId) segmentsByFrom.set(segment.fromItemId, segment);
  }

  const dayItems = itineraryQuery.data ?? [];
  const mapMarkers = dayItems
    .filter((item) => item.latitude != null && item.longitude != null)
    .map((item, index) => ({
      id: item.id,
      coordinate: { latitude: item.latitude!, longitude: item.longitude! },
      title: `${index + 1}. ${item.title}`,
      category: item.kind,
    }));
  const mapCenter = mapMarkers[0]?.coordinate ?? {
    latitude: 22.3193,
    longitude: 114.1694,
  };

  const renderActivity = (item: ItineraryItem, index: number) => {
    const segment = segmentsByFrom.get(item.id);
    return (
      <View key={item.id}>
        <View className="mb-2 rounded-xl border border-black/8 p-3 dark:border-brand-800">
          <AppText className="font-sans-semibold">
            {item.startTime}–{item.endTime} · {item.title}
          </AppText>
          <AppText muted className="mt-1 text-xs">
            {item.kind ?? 'custom'}
          </AppText>
          {item.notes ? (
            <AppText muted className="mt-1 text-sm">
              {item.notes.replace(/\s*live_data_required[^.]*\.?/gi, '').trim()}
            </AppText>
          ) : null}
          {item.placeId ? (
            <View className="mt-2">
              <Button
                label="Open place"
                variant="ghost"
                onPress={() =>
                  router.push({
                    pathname: '/place/[id]',
                    params: { id: item.placeId! },
                  })
                }
              />
            </View>
          ) : null}
          {canEdit ? (
            <View className="mt-1">
              <Button
                label="Remove"
                variant="ghost"
                onPress={() =>
                  void removeItineraryItem(item.id).then(() => {
                    void queryClient.invalidateQueries({ queryKey: ['itinerary', id] });
                    void queryClient.invalidateQueries({ queryKey: ['itinerary-all', id] });
                    void queryClient.invalidateQueries({ queryKey: ['transport-segments', id] });
                  })
                }
              />
            </View>
          ) : null}
        </View>
        {segment && index < dayItems.length - 1 ? (
          <AppText muted className="mb-2 text-center text-xs">
            ↓ {segment.summary ?? 'Travel'}
          </AppText>
        ) : index < dayItems.length - 1 && !segment ? (
          <AppText muted className="mb-2 text-center text-xs">
            ↓
          </AppText>
        ) : null}
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerClassName="pb-12" testID="screen-trip">
        <SectionHeader
          title={trip.title}
          subtitle={`${formatTripDateRange(trip.startDate, trip.endDate, trip.openEnded)} · ${trip.destinations.join(', ') || 'No destinations'}`}
        />
        {isViewOnly ? (
          <View
            className={`mb-4 rounded-2xl border px-3 py-2 ${
              scheme === 'dark' ? 'border-brand-700 bg-brand-900' : 'border-brand-200 bg-brand-50'
            }`}
            testID="trip-view-only-banner"
          >
            <AppText className="text-sm font-sans-semibold text-brand-700 dark:text-brand-200">
              {trip.isPublic
                ? isOwner
                  ? 'Shared trip · View only while public'
                  : 'Shared trip · View only'
                : 'View only'}
            </AppText>
            <AppText muted className="mt-0.5 text-xs">
              {trip.isPublic && isOwner
                ? 'Make the trip private to edit dates and details.'
                : `Dates and details are read-only${isSharedPublic ? ' for this public link' : ''}.`}
            </AppText>
          </View>
        ) : null}

        <View className="mb-4 flex-row flex-wrap gap-2">
          {TABS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              className={`rounded-2xl border px-3 py-2 ${
                tab === item.id
                  ? 'border-brand-600 bg-brand-600'
                  : scheme === 'dark'
                    ? 'border-brand-800 bg-surface-cardDark'
                    : 'border-black/8 bg-white'
              }`}
            >
              <AppText className={tab === item.id ? 'text-white' : undefined}>{item.label}</AppText>
            </Pressable>
          ))}
        </View>

        {tab === 'overview' ? (
          <>
            <Card className="mb-4">
              <AppText className="font-sans-semibold">
                {countdown > 0
                  ? `${countdown} day${countdown === 1 ? '' : 's'} until departure`
                  : countdown === 0
                    ? 'Trip starts today'
                    : 'Trip already underway / past'}
              </AppText>
              <AppText muted className="mt-2">
                Dates: {formatTripDateRange(trip.startDate, trip.endDate, trip.openEnded)}
              </AppText>
              <AppText muted className="mt-1">
                Travelers: {trip.adults} adults, {trip.children} children
              </AppText>
              <AppText muted className="mt-1">
                Cities: {trip.destinations.join(' → ') || 'Not set'}
              </AppText>
              {(staysQuery.data?.length ?? 0) > 0 ? (
                <AppText muted className="mt-1">
                  Hotel: {staysQuery.data![0]!.name}
                </AppText>
              ) : null}
              <AppText muted className="mt-1">
                Budget:{' '}
                {budgetQuery.data?.budget
                  ? `${budgetQuery.data.budget.currency} ${budgetQuery.data.budget.total}`
                  : 'Not set'}
              </AppText>
              {trip.publicSummary && isViewOnly ? (
                <AppText className="mt-3">{trip.publicSummary}</AppText>
              ) : null}
              {nextActivity ? (
                <AppText className="mt-3">
                  Next: {nextActivity.day} {nextActivity.startTime} · {nextActivity.title}
                </AppText>
              ) : null}
            </Card>

            {isSharedPublic && !user ? (
              <Card className="mb-4">
                <AppText muted>
                  Public trip story
                  {trip.publicSummary ? ` — ${trip.publicSummary}` : ''}. Sign in to create your own
                  trips.
                </AppText>
              </Card>
            ) : null}

            {isOwner ? (
              <Card className="mb-4">
                <SectionHeader
                  title="Share trip"
                  subtitle={
                    trip.isPublic
                      ? 'Public on Travel Guide — share a link with friends'
                      : 'Keep private, publish to Travel Guide, or share a link'
                  }
                />
                <View className="gap-2">
                  <Button
                    label="Share trip"
                    variant="primary"
                    onPress={() => handleShareTrip(trip)}
                    testID="trip-share"
                  />
                  <Button
                    label={trip.isPublic ? 'Make trip private' : 'Make trip public'}
                    variant="secondary"
                    loading={publishTrip.isPending}
                    onPress={() => publishTrip.mutate(!trip.isPublic)}
                  />
                </View>
              </Card>
            ) : null}

            {canEdit ? (
              <Card className="mb-4">
                <SectionHeader title="Edit trip" subtitle="Name, dates, destinations, travelers" />
                <TextField
                  label="Trip name"
                  value={editTitle}
                  onChangeText={setEditTitle}
                  autoCapitalize="words"
                  testID="trip-edit-title"
                />
                <DatePickerField
                  label="Start date"
                  value={editStartDate}
                  onChange={(next) => {
                    setEditStartDate(next);
                    if (editEndDate < next) setEditEndDate(next);
                  }}
                />
                <DatePickerField
                  label="End date"
                  value={editEndDate}
                  minimumDate={new Date(`${editStartDate}T12:00:00`)}
                  onChange={setEditEndDate}
                />
                <DestinationAutocomplete
                  label="Destinations"
                  values={editDestinations}
                  onChange={setEditDestinations}
                  placeholder="Add city or country"
                />
                <View className="mb-2 flex-row gap-2">
                  <View className="flex-1">
                    <TextField
                      label="Adults"
                      value={editAdults}
                      onChangeText={setEditAdults}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View className="flex-1">
                    <TextField
                      label="Children"
                      value={editChildren}
                      onChangeText={setEditChildren}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <View className="mb-2 flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label="Save changes"
                      loading={saveTripDetails.isPending}
                      onPress={() => saveTripDetails.mutate()}
                      testID="trip-save-details"
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Delete trip"
                      variant="secondary"
                      loading={removeTrip.isPending}
                      onPress={confirmDelete}
                      testID="trip-delete"
                    />
                  </View>
                </View>
              </Card>
            ) : (
              <Card className="mb-4">
                <SectionHeader
                  title="Trip details"
                  subtitle={
                    trip.isPublic
                      ? 'Shared itinerary details (read-only)'
                      : 'Trip details (read-only)'
                  }
                />
                <AppText muted className="mb-1 text-xs font-sans-semibold uppercase tracking-wide">
                  Start date
                </AppText>
                <AppText className="mb-3 font-sans-semibold">
                  {formatDayLabel(trip.startDate)}
                </AppText>
                <AppText muted className="mb-1 text-xs font-sans-semibold uppercase tracking-wide">
                  End date
                </AppText>
                <AppText className="mb-3 font-sans-semibold">
                  {trip.endDate ? formatDayLabel(trip.endDate) : trip.openEnded ? 'Open-ended' : '—'}
                </AppText>
                <AppText muted className="mb-1 text-xs font-sans-semibold uppercase tracking-wide">
                  Destinations
                </AppText>
                <AppText className="mb-3 font-sans-semibold">
                  {trip.destinations.join(' → ') || 'Not set'}
                </AppText>
                <AppText muted className="mb-1 text-xs font-sans-semibold uppercase tracking-wide">
                  Travelers
                </AppText>
                <AppText className="font-sans-semibold">
                  {trip.adults} adults, {trip.children} children
                </AppText>
                {isOwner && trip.isPublic ? (
                  <View className="mt-4">
                    <Button
                      label="Make private to edit"
                      variant="secondary"
                      loading={publishTrip.isPending}
                      onPress={() => publishTrip.mutate(false)}
                    />
                  </View>
                ) : null}
              </Card>
            )}

            {canEdit ? (
              <Card className="mb-4">
                <SectionHeader
                  title="Collaborate"
                  subtitle="Invite by email — link expires in 14 days"
                />
                <TextField
                  label="Invite email"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Button
                  label="Create invite link"
                  loading={invite.isPending}
                  disabled={!inviteEmail.includes('@')}
                  onPress={() => invite.mutate()}
                />
                {(membersQuery.data ?? [])
                  .filter((m) => m.role !== 'owner')
                  .map((member) => (
                    <View
                      key={member.id}
                      className="mt-3 flex-row items-center justify-between gap-2 border-t border-black/8 pt-3"
                    >
                      <View className="flex-1">
                        <AppText className="font-sans-semibold">{member.email}</AppText>
                        <AppText muted className="text-xs">
                          {member.role} · {member.status}
                          {member.expiresAt
                            ? ` · expires ${new Date(member.expiresAt).toLocaleDateString()}`
                            : ''}
                        </AppText>
                      </View>
                      {member.status !== 'revoked' ? (
                        <Button
                          label="Revoke"
                          variant="secondary"
                          loading={revokeInvite.isPending}
                          onPress={() => revokeInvite.mutate(member.id)}
                        />
                      ) : null}
                    </View>
                  ))}
              </Card>
            ) : null}
          </>
        ) : null}

        {tab === 'itinerary' ? (
          <Card className="mb-4">
            <SectionHeader
              title="Day planner"
              subtitle={dayMeta?.title ? `${dayMeta.title}${dayMeta.city ? ` · ${dayMeta.city}` : ''}` : 'Pick a day, then add activities'}
            />
            {weeks.map((week) => (
              <View key={week.label} className="mb-3">
                {weeks.length > 1 ? (
                  <AppText muted className="mb-2 text-xs font-sans-semibold uppercase">
                    {week.label}
                  </AppText>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {week.days.map((item) => {
                      const active = item === day;
                      const count = countsByDay.get(item) ?? 0;
                      return (
                        <Pressable
                          key={item}
                          onPress={() => setSelectedDay(item)}
                          className={`rounded-2xl border px-3 py-2 ${
                            active
                              ? 'border-brand-600 bg-brand-600'
                              : scheme === 'dark'
                                ? 'border-brand-700 bg-brand-900'
                                : 'border-brand-200 bg-brand-50'
                          }`}
                        >
                          <AppText
                            className={`text-sm font-sans-semibold ${active ? 'text-white' : ''}`}
                            inverse={active}
                          >
                            {formatDayLabel(item)}
                          </AppText>
                          <AppText
                            className={`text-xs ${active ? 'text-brand-100' : ''}`}
                            muted={!active}
                            inverse={active}
                          >
                            {count} stop{count === 1 ? '' : 's'}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ))}

            <AppText className="mb-2 font-sans-semibold">{formatDayLabel(day)}</AppText>
            {canEdit ? (
              <>
                <TextField
                  label="Add activity title"
                  value={activityTitle}
                  onChangeText={setActivityTitle}
                  autoCapitalize="sentences"
                  placeholder="e.g. Lunch at Kubo sa Bayan"
                />
                <View className="mb-3 flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label="Add to this day"
                      loading={addItem.isPending}
                      disabled={!activityTitle.trim()}
                      onPress={() => addItem.mutate()}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Sort by time"
                      variant="secondary"
                      loading={optimize.isPending}
                      onPress={() => optimize.mutate()}
                    />
                  </View>
                </View>
              </>
            ) : null}

            {dayItems.map((item, index) => renderActivity(item, index))}
            {dayItems.length === 0 ? (
              <AppText muted>
                {canEdit
                  ? 'No stops on this day yet. Add one above, or save a place from Explore / Home.'
                  : 'No stops on this day in the shared itinerary.'}
              </AppText>
            ) : null}
          </Card>
        ) : null}

        {tab === 'map' ? (
          <Card className="mb-4 overflow-hidden p-0">
            <View className="p-4">
              <SectionHeader
                title="Day map"
                subtitle={`${formatDayLabel(day)} · ${mapMarkers.length} pinned stops`}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row gap-2">
                  {tripDays.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => setSelectedDay(item)}
                      className={`rounded-2xl border px-3 py-2 ${
                        item === day
                          ? 'border-brand-600 bg-brand-600'
                          : scheme === 'dark'
                            ? 'border-brand-800 bg-surface-cardDark'
                            : 'border-black/8 bg-white'
                      }`}
                    >
                      <AppText className={item === day ? 'text-white' : undefined}>
                        {formatDayLabel(item)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
            {mapMarkers.length ? (
              <MapView
                camera={{ center: mapCenter, zoom: 13 }}
                markers={mapMarkers}
                showUserLocation
                fitToCoordinates={mapMarkers.map((marker) => marker.coordinate)}
                mapHeight={280}
              />
            ) : (
              <View className="px-4 pb-4">
                <EmptyState
                  title="No map pins for this day"
                  description="Add places with coordinates from Explore or Trip Suggestion."
                />
              </View>
            )}
          </Card>
        ) : null}

        {tab === 'hotels' ? (
          <Card className="mb-4">
            <SectionHeader title="Hotels & stays" subtitle="Saved accommodations for this trip" />
            {(staysQuery.data ?? []).map((stay) => (
              <View
                key={stay.id}
                className="mb-3 rounded-xl border border-black/8 p-3 dark:border-brand-800"
              >
                <AppText className="font-sans-semibold">{stay.name}</AppText>
                {stay.address || stay.city ? (
                  <AppText muted className="mt-1 text-sm">
                    {[stay.address, stay.city].filter(Boolean).join(' · ')}
                  </AppText>
                ) : null}
                <AppText muted className="mt-1 text-sm">
                  {[stay.checkIn ? `In ${stay.checkIn}` : null, stay.checkOut ? `Out ${stay.checkOut}` : null]
                    .filter(Boolean)
                    .join(' · ') || 'Dates not set'}
                </AppText>
                {stay.notes ? (
                  <AppText muted className="mt-1 text-xs">
                    {stay.notes}
                  </AppText>
                ) : null}
              </View>
            ))}
            {(staysQuery.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="No stays yet"
                description="Hotels from Create Trip, templates, or AI suggestions show up here."
              />
            ) : null}
          </Card>
        ) : null}

        {tab === 'budget' ? (
          <Card className="mb-4">
            <SectionHeader title="Budget snapshot" />
            <AppText muted>
              Spent: {summary?.spent?.toFixed(2) ?? '0'} · Remaining:{' '}
              {summary?.remaining == null ? 'Set a budget' : summary.remaining.toFixed(2)}
            </AppText>
            {budgetQuery.data?.budget ? (
              <AppText className="mt-2">
                Total budget: {budgetQuery.data.budget.currency} {budgetQuery.data.budget.total}
              </AppText>
            ) : null}
            <View className="mt-3 gap-2">
              {canEdit ? (
                <Button
                  label="Set $2000 budget"
                  variant="secondary"
                  loading={ensureBudget.isPending}
                  onPress={() => ensureBudget.mutate()}
                />
              ) : null}
              {canEdit ? (
                <Button
                  label="Open budget screen"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: '/budget',
                      params: { tripId: trip.id },
                    })
                  }
                />
              ) : (
                <AppText muted className="text-sm">
                  Budget details are view-only on shared trips.
                </AppText>
              )}
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
