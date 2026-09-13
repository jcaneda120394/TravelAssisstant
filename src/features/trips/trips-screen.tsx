import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { SaveTripModal } from '@/components/trips/save-trip-modal';
import { DatePickerField } from '@/components/forms/date-picker-field';
import { DestinationAutocomplete } from '@/components/forms/destination-autocomplete';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { requireAuthForTrips, requireAuthToSave } from '@/features/auth/require-auth';
import { useAuth } from '@/hooks/use-auth';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { createTrip, deleteTrip, listTrips } from '@/services/trips/trips.service';
import { analytics } from '@/lib/analytics';
import { getErrorMessage } from '@/lib/errors/app-error';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { defaultTripDates, formatTripDateRange } from '@/utils/dates';
import { useLocationStore } from '@/stores/location-store';

export function TripsScreen() {
  const router = useRouter();
  const { user, preferences } = useAuth();
  const scheme = useAppColorScheme();
  const { scrollBottomPad } = useResponsiveLayout();
  const queryClient = useQueryClient();
  const label = useLocationStore((state) => state.label);
  const [showForm, setShowForm] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const defaults = useMemo(() => defaultTripDates(), []);
  const [title, setTitle] = useState('Weekend getaway');
  const [destinations, setDestinations] = useState<string[]>(
    label?.split(',')[0] ? [label.split(',')[0]!] : [],
  );
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);

  const tripsQuery = useQuery({
    queryKey: ['trips', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listTrips(user!.id),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Sign in required');
      }
      return createTrip({
        ownerId: user.id,
        title,
        startDate,
        endDate,
        destinations: destinations.map((item) => item.trim()).filter(Boolean),
        adults: preferences?.adults ?? 2,
        children: preferences?.children ?? 0,
      });
    },
    onSuccess: (trip) => {
      analytics.track('trip_created', { tripId: trip.id });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      setShowForm(false);
      router.push(`/trip/${trip.id}`);
    },
    onError: (error) => Alert.alert('Could not save trip', getErrorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (tripId: string) => deleteTrip(tripId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['trips'] }),
    onError: (error) => Alert.alert('Could not delete trip', getErrorMessage(error)),
  });

  return (
    <Screen>
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: scrollBottomPad }}
        style={{ width: '100%', maxWidth: '100%' }}
        testID="screen-trips"
      >
        <SectionHeader
          title="Trips"
          subtitle={
            user
              ? 'Save destinations and build day-by-day plans'
              : 'Browse suggestions anytime — sign in to save trips'
          }
        />

        {!user ? (
          <Card className="mb-4">
            <AppText muted className="leading-6">
              Suggestions stay open for guests. Create trip and Save trip need an account.
            </AppText>
            <View className="mt-3 flex-row" style={{ gap: 8 }}>
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
          </Card>
        ) : null}

        <View className="mb-4" style={{ gap: 12 }}>
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
                      setShowSaveModal(true);
                    }}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Live AI plan"
                    variant="secondary"
                    onPress={() => router.push('/trip-suggestion')}
                  />
                </View>
              </View>
              <Button
                label={showForm ? 'Close quick form' : 'Quick form'}
                variant="ghost"
                onPress={() => setShowForm((value) => !value)}
              />
            </>
          ) : (
            <>
              <Button
                label="Suggestions"
                variant="accent"
                onPress={() => router.push('/trip-suggestions')}
              />
              <Button
                label="Live AI plan"
                variant="secondary"
                onPress={() => router.push('/trip-suggestion')}
              />
            </>
          )}
        </View>

        {user && showForm ? (
          <Card className="mt-1 mb-4">
            <TextField label="Title" value={title} onChangeText={setTitle} autoCapitalize="words" />
            <DestinationAutocomplete
              label="Destinations"
              values={destinations}
              onChange={setDestinations}
              placeholder="Search city or country (e.g. Phi…)"
            />
            <DatePickerField
              label="Start date"
              value={startDate}
              onChange={(next) => {
                setStartDate(next);
                if (endDate < next) {
                  setEndDate(next);
                }
              }}
            />
            <DatePickerField
              label="End date"
              value={endDate}
              minimumDate={new Date(`${startDate}T12:00:00`)}
              onChange={setEndDate}
            />
            <Button
              label="Save trip"
              loading={createMutation.isPending}
              onPress={() => {
                if (!requireAuthToSave(router, { actionLabel: 'save trips' })) return;
                createMutation.mutate();
              }}
            />
          </Card>
        ) : null}

        {user && tripsQuery.isLoading ? (
          <View className="mt-4 gap-3">
            <Skeleton height={88} />
            <Skeleton height={88} />
          </View>
        ) : null}

        <View className="mt-4">
          {tripsQuery.data?.map((trip) => (
            <Pressable
              key={trip.id}
              onPress={() => router.push(`/trip/${trip.id}`)}
              onLongPress={() =>
                Alert.alert('Delete trip?', trip.title, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => removeMutation.mutate(trip.id),
                  },
                ])
              }
              className={`mb-3 rounded-2xl border p-4 ${
                scheme === 'dark'
                  ? 'border-brand-800 bg-surface-cardDark'
                  : 'border-black/8 bg-white'
              }`}
            >
              <AppText className="font-sans-semibold text-lg">{trip.title}</AppText>
              <AppText muted className="mt-1">
                {formatTripDateRange(trip.startDate, trip.endDate, trip.openEnded)}
                {trip.source && trip.source !== 'manual' ? ` · ${trip.source.replace('_', ' ')}` : ''}
              </AppText>
              <AppText muted className="mt-1">{trip.destinations.join(' · ')}</AppText>
              <AppText muted className="mt-2 text-xs">
                Tap to open · long-press to delete
              </AppText>
            </Pressable>
          ))}
        </View>

        {!user ? (
          <EmptyState
            title="My trips"
            description="Sign in to see your saved trips here. Suggestions are available without an account."
          />
        ) : null}

        {user && !tripsQuery.isLoading && (tripsQuery.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No saved trips yet"
            description="Tap Create trip or Save trip to keep a destination plan."
          />
        ) : null}
      </ScrollView>

      <SaveTripModal
        visible={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        destinationHint={label?.split(',')[0] ?? destinations[0] ?? ''}
        onSaved={(tripId) => router.push(`/trip/${tripId}`)}
      />
    </Screen>
  );
}
