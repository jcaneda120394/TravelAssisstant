import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { createTrip, listTrips } from '@/services/trips/trips.service';
import { analytics } from '@/lib/analytics';
import { getErrorMessage } from '@/lib/errors/app-error';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

export function TripsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const scheme = useAppColorScheme();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('Japan 2027');
  const [destinations, setDestinations] = useState('Tokyo, Kyoto, Osaka');
  const [startDate, setStartDate] = useState('2027-03-10');
  const [endDate, setEndDate] = useState('2027-03-22');

  const tripsQuery = useQuery({
    queryKey: ['trips', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listTrips(user!.id),
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
        destinations: destinations.split(',').map((item) => item.trim()).filter(Boolean),
        adults: 2,
        children: 0,
      });
    },
    onSuccess: (trip) => {
      analytics.track('trip_created', { tripId: trip.id });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      setShowForm(false);
      router.push(`/trip/${trip.id}`);
    },
    onError: (error) => Alert.alert('Could not create trip', getErrorMessage(error)),
  });

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-trips">
        <SectionHeader title="Trips" subtitle="Plan destinations, travelers, and itineraries" />

        <Button label={showForm ? 'Close form' : 'Create trip'} onPress={() => setShowForm((v) => !v)} />

        {showForm ? (
          <Card className="mt-4">
            <TextField label="Title" value={title} onChangeText={setTitle} autoCapitalize="words" />
            <TextField
              label="Destinations (comma separated)"
              value={destinations}
              onChangeText={setDestinations}
              autoCapitalize="words"
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

        <View className="mt-4">
          {tripsQuery.data?.map((trip) => (
            <Pressable
              key={trip.id}
              onPress={() => router.push(`/trip/${trip.id}`)}
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
            </Pressable>
          ))}
        </View>

        {!tripsQuery.isLoading && (tripsQuery.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No trips yet"
            description="Create a trip to unlock itinerary, budget, and collaboration."
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
