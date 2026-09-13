import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal } from 'react-native';

import { DatePickerField } from '@/components/forms/date-picker-field';
import { DestinationAutocomplete } from '@/components/forms/destination-autocomplete';
import { TextField } from '@/components/forms/text-field';
import { TimePickerField } from '@/components/forms/time-picker-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { requireAuthToSave } from '@/features/auth/require-auth';
import { useAuth } from '@/hooks/use-auth';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { analytics } from '@/lib/analytics';
import { getErrorMessage } from '@/lib/errors/app-error';
import { addPlaceToTrip } from '@/services/itinerary/itinerary.service';
import { createTrip, listTrips } from '@/services/trips/trips.service';
import type { Place, Trip } from '@/types/domain';
import { defaultTripDates, eachDayBetween, formatDayLabel, formatTripDateRange } from '@/utils/dates';

type Props = {
  visible: boolean;
  onClose: () => void;
  destinationHint?: string;
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
  const router = useRouter();
  const scheme = useAppColorScheme();
  const { user, preferences } = useAuth();
  const { currency } = useDisplayCurrency();
  const queryClient = useQueryClient();
  const defaults = defaultTripDates();
  const [mode, setMode] = useState<'create' | 'existing'>('create');
  const [title, setTitle] = useState('');
  const [destinations, setDestinations] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(defaults.startDate);
  const [startTime, setStartTime] = useState('11:00');

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
    setSelectedDay(nextDefaults.startDate);
    setStartTime('11:00');
    setMode(place ? 'existing' : 'create');
    setSelectedTripId(null);
  }, [visible, destinationHint, place]);

  const tripsQuery = useQuery({
    queryKey: ['trips', user?.id],
    enabled: visible && Boolean(user?.id),
    queryFn: () => listTrips(user!.id),
    staleTime: 30_000,
  });

  const selectedTrip: Trip | undefined = useMemo(
    () => (tripsQuery.data ?? []).find((trip) => trip.id === selectedTripId),
    [selectedTripId, tripsQuery.data],
  );

  const dayOptions = useMemo(() => {
    if (mode === 'existing' && selectedTrip) {
      return eachDayBetween(selectedTrip.startDate, selectedTrip.endDate);
    }
    return eachDayBetween(startDate, endDate);
  }, [mode, selectedTrip, startDate, endDate]);

  useEffect(() => {
    if (!dayOptions.includes(selectedDay) && dayOptions[0]) {
      setSelectedDay(dayOptions[0]);
    }
  }, [dayOptions, selectedDay]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Sign in to save trips');
      }

      let tripId = selectedTripId;
      let dayForPlace = selectedDay;

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
        dayForPlace = selectedDay;
      }

      if (place && tripId) {
        const [hourRaw, minuteRaw = '00'] = startTime.split(':');
        const hour = Number(hourRaw);
        const endHour = Math.min(hour + 2, 23);
        await addPlaceToTrip({
          tripId,
          place,
          day: dayForPlace,
          startTime,
          endTime: `${String(endHour).padStart(2, '0')}:${minuteRaw.padStart(2, '0')}`,
          currency,
        });
      }

      return tripId!;
    },
    onSuccess: (tripId) => {
      analytics.track('trip_saved', { tripId, withPlace: Boolean(place), day: selectedDay });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
      Alert.alert(
        'Saved to trip planner',
        place
          ? `${place.name} added on ${formatDayLabel(selectedDay)} at ${startTime}.`
          : 'Your trip is saved.',
      );
      onSaved?.(tripId);
      onClose();
    },
    onError: (error) => Alert.alert('Could not save trip', getErrorMessage(error)),
  });

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-2 ${
      active
        ? 'border-brand-600 bg-brand-600'
        : scheme === 'dark'
          ? 'border-brand-700 bg-brand-900'
          : 'border-brand-200 bg-brand-50'
    }`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[92%] rounded-t-3xl bg-white px-5 pb-8 pt-4 dark:bg-surface-cardDark">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="min-w-0 flex-1">
              <SectionHeader
                title={place ? 'Add to trip planner' : 'Save trip'}
                subtitle={
                  place
                    ? `Save ${place.name} and pick which day`
                    : 'Keep this plan in Trips'
                }
              />
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <AppText className="font-sans-semibold text-brand-700">Close</AppText>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {place ? (
              <Card className="mb-4">
                <AppText className="font-sans-semibold">{place.name}</AppText>
                {place.address ? (
                  <AppText muted className="mt-1 text-sm">
                    {place.address}
                  </AppText>
                ) : null}
              </Card>
            ) : null}

            {place ? (
              <View className="mb-4 flex-row gap-2">
                <View className="min-w-0 flex-1">
                  <Button
                    label="Existing trip"
                    variant={mode === 'existing' ? 'primary' : 'secondary'}
                    onPress={() => setMode('existing')}
                  />
                </View>
                <View className="min-w-0 flex-1">
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
                <AppText className="mb-2 font-sans-semibold">Choose trip</AppText>
                {(tripsQuery.data ?? []).length === 0 ? (
                  <AppText muted>No trips yet — switch to New trip.</AppText>
                ) : (
                  (tripsQuery.data ?? []).map((trip) => (
                    <Pressable
                      key={trip.id}
                      onPress={() => {
                        setSelectedTripId(trip.id);
                        setSelectedDay(trip.startDate);
                      }}
                      className={`mb-2 rounded-2xl border px-3 py-3 ${
                        selectedTripId === trip.id
                          ? 'border-brand-600 bg-brand-50 dark:bg-brand-900'
                          : 'border-brand-100 dark:border-brand-800'
                      }`}
                    >
                      <AppText className="font-sans-semibold">{trip.title}</AppText>
                      <AppText muted className="text-sm">
                        {formatTripDateRange(trip.startDate, trip.endDate, trip.openEnded)}
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
                  placeholder="Search city or country"
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
              </Card>
            )}

            {place ? (
              <Card className="mb-4">
                <AppText className="mb-2 font-sans-semibold">Which day?</AppText>
                <AppText muted className="mb-3 text-sm">
                  Add this place to a specific day in your itinerary.
                </AppText>
                <View className="flex-row flex-wrap gap-2">
                  {dayOptions.map((day) => (
                    <Pressable
                      key={day}
                      onPress={() => setSelectedDay(day)}
                      className={chipClass(selectedDay === day)}
                    >
                      <AppText
                        className={`text-sm ${selectedDay === day ? 'text-white' : ''}`}
                        inverse={selectedDay === day}
                      >
                        {formatDayLabel(day)}
                      </AppText>
                    </Pressable>
                  ))}
                </View>

                <View className="mt-4">
                  <TimePickerField label="Start time" value={startTime} onChange={setStartTime} />
                </View>
              </Card>
            ) : null}

            <Button
              label={place ? 'Add to day plan' : 'Save trip'}
              loading={saveMutation.isPending}
              disabled={
                mode === 'existing' && place
                  ? !selectedTripId
                  : mode === 'create'
                    ? !title.trim()
                    : false
              }
              onPress={() => {
                if (
                  !requireAuthToSave(router, {
                    actionLabel: place ? 'add places to your trip planner' : 'save trips',
                  })
                ) {
                  return;
                }
                saveMutation.mutate();
              }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
