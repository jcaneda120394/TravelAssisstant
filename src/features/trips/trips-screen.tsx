import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { SaveTripModal } from '@/components/trips/save-trip-modal';
import { DestinationAutocomplete } from '@/components/forms/destination-autocomplete';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { createTrip, deleteTrip, listTrips } from '@/services/trips/trips.service';
import { analytics } from '@/lib/analytics';
import { getErrorMessage } from '@/lib/errors/app-error';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { defaultTripDates } from '@/utils/dates';
import { useLocationStore } from '@/stores/location-store';

export function TripsScreen() {
  const router = useRouter();
  const { user, preferences } = useAuth();
  const scheme = useAppColorScheme();
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
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-trips">
        <SectionHeader title="Trips" subtitle="Save destinations and build day-by-day plans" />

        <View className="mb-3 flex-row gap-2">
          <View className="flex-1">
            <Button label="Save trip" onPress={() => setShowSaveModal(true)} />
          </View>
          <View className="flex-1">
            <Button
              label={showForm ? 'Close' : 'Quick form'}
              variant="secondary"
              onPress={() => setShowForm((value) => !value)}
            />
          </View>
        </View>

        {showForm ? (
          <Card className="mt-1 mb-4">
            <TextField label="Title" value={title} onChangeText={setTitle} autoCapitalize="words" />
            <DestinationAutocomplete
              label="Destinations"
              values={destinations}
              onChange={setDestinations}
              placeholder="Search city or country (e.g. Phi…)"
            />
            <TextField label="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
            <TextField label="End date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} />
            <Button
              label="Save trip"
              loading={createMutation.isPending}
              onPress={() => createMutation.mutate()}
            />
          </Card>
        ) : null}

        {tripsQuery.isLoading ? (
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
                  : 'border-brand-100 bg-white'
              }`}
            >
              <AppText className="font-sans-semibold text-lg">{trip.title}</AppText>
              <AppText muted className="mt-1">
                {trip.startDate} → {trip.endDate}
              </AppText>
              <AppText muted className="mt-1">{trip.destinations.join(' · ')}</AppText>
              <AppText muted className="mt-2 text-xs">
                Tap to open · long-press to delete
              </AppText>
            </Pressable>
          ))}
        </View>

        {!tripsQuery.isLoading && (tripsQuery.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No saved trips yet"
            description="Tap Save trip to keep a destination plan — it syncs when you’re signed in with Supabase."
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
