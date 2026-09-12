import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Modal } from 'react-native';

import { DestinationAutocomplete } from '@/components/forms/destination-autocomplete';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { analytics } from '@/lib/analytics';
import { getErrorMessage } from '@/lib/errors/app-error';
import { addPlaceToTrip } from '@/services/itinerary/itinerary.service';
import { createTrip, listTrips } from '@/services/trips/trips.service';
import type { Place } from '@/types/domain';
import { defaultTripDates } from '@/utils/dates';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Pre-fill destinations (e.g. city or place name). */
  destinationHint?: string;
  /** When set, also adds this place to the saved trip itinerary. */
  place?: Place | null;
  onSaved?: (tripId: string) => void;
};

export function SaveTripModal({
  visible,
  onClose,
  destinationHint = '',
  place = null,
  onSaved,
}: Props) {
  const { user, preferences } = useAuth();
  const queryClient = useQueryClient();
  const defaults = defaultTripDates();
  const [mode, setMode] = useState<'create' | 'existing'>('create');
  const [title, setTitle] = useState('');
  const [destinations, setDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const nextDefaults = defaultTripDates();
    setTitle(place ? `Trip · ${place.name}` : destinationHint ? `${destinationHint} trip` : 'My trip');
    const seed = destinationHint || place?.name || '';
    setDestinations(seed ? [seed] : []);
    setStartDate(nextDefaults.startDate);
    setEndDate(nextDefaults.endDate);
    setMode(place ? 'existing' : 'create');
    setSelectedTripId(null);
  }, [visible, destinationHint, place]);

  const tripsQuery = useQuery({
    queryKey: ['trips', user?.id],
    enabled: visible && Boolean(user?.id),
    queryFn: () => listTrips(user!.id),
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Sign in to save trips');
      }

      let tripId = selectedTripId;

      if (mode === 'create' || !tripId) {
        const trip = await createTrip({
          ownerId: user.id,
          title: title.trim() || 'My trip',
          startDate,
          endDate,
          destinations: destinations.map((item) => item.trim()).filter(Boolean),
          adults: preferences?.adults ?? 1,
          children: preferences?.children ?? 0,
          notes: place ? `Includes ${place.name}` : undefined,
        });
        tripId = trip.id;
      }

      if (place && tripId) {
        await addPlaceToTrip({
          tripId,
          place,
          day: startDate,
          currency: preferences?.home_currency ?? 'USD',
        });
      }

      return tripId;
    },
    onSuccess: (tripId) => {
      analytics.track('trip_saved', { tripId, withPlace: Boolean(place) });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
      Alert.alert('Trip saved', place ? 'Place added to your trip.' : 'Your trip is saved.');
      onSaved?.(tripId);
      onClose();
    },
    onError: (error) => Alert.alert('Could not save trip', getErrorMessage(error)),
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[88%] rounded-t-3xl bg-white px-5 pb-8 pt-4 dark:bg-surface-cardDark">
          <View className="mb-3 flex-row items-center justify-between">
            <SectionHeader
              title={place ? 'Save to trip' : 'Save trip'}
              subtitle={place ? `Add ${place.name} to a trip` : 'Keep this plan in Trips'}
            />
            <Pressable onPress={onClose} hitSlop={12}>
              <AppText className="font-sans-semibold text-brand-700">Close</AppText>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {place ? (
              <View className="mb-4 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label="Existing trip"
                    variant={mode === 'existing' ? 'primary' : 'secondary'}
                    onPress={() => setMode('existing')}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="New trip"
                    variant={mode === 'create' ? 'primary' : 'secondary'}
                    onPress={() => setMode('create')}
                  />
                </View>
              </View>
            ) : null}

            {mode === 'existing' && place ? (
              <Card className="mb-4">
                {(tripsQuery.data ?? []).length === 0 ? (
                  <AppText muted>No trips yet — switch to New trip.</AppText>
                ) : (
                  (tripsQuery.data ?? []).map((trip) => (
                    <Pressable
                      key={trip.id}
                      onPress={() => setSelectedTripId(trip.id)}
                      className={`mb-2 rounded-2xl border px-3 py-3 ${
                        selectedTripId === trip.id
                          ? 'border-brand-600 bg-brand-50 dark:bg-brand-900'
                          : 'border-brand-100 dark:border-brand-800'
                      }`}
                    >
                      <AppText className="font-sans-semibold">{trip.title}</AppText>
                      <AppText muted className="text-sm">
                        {trip.startDate} → {trip.endDate}
                      </AppText>
                    </Pressable>
                  ))
                )}
              </Card>
            ) : (
              <Card className="mb-4">
                <TextField label="Trip title" value={title} onChangeText={setTitle} autoCapitalize="words" />
                <DestinationAutocomplete
                  label="Destinations"
                  values={destinations}
                  onChange={setDestinations}
                  placeholder="Search city or country (e.g. Phi…)"
                />
                <TextField label="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
                <TextField label="End date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} />
              </Card>
            )}

            <Button
              label={place ? 'Save to trip' : 'Save trip'}
              loading={saveMutation.isPending}
              disabled={
                mode === 'existing' && place
                  ? !selectedTripId
                  : mode === 'create'
                    ? !title.trim()
                    : false
              }
              onPress={() => saveMutation.mutate()}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
