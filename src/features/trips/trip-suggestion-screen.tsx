import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { CityAutocomplete } from '@/components/forms/city-autocomplete';
import { ChipSelect } from '@/components/forms/chip-select';
import { DatePickerField } from '@/components/forms/date-picker-field';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { requireAuthToSave } from '@/features/auth/require-auth';
import { useAuth } from '@/hooks/use-auth';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useEnsureLocation } from '@/hooks/use-ensure-location';
import { getErrorMessage } from '@/lib/errors/app-error';
import { analytics } from '@/lib/analytics';
import type { DestinationSuggestion } from '@/services/geo/geocode.service';
import { listTrips } from '@/services/trips/trips.service';
import {
  generateTripSuggestion,
  saveSuggestionAsNewTrip,
  saveSuggestionToTrip,
  type SuggestionStyle,
  type TripSuggestionPlan,
} from '@/services/trips/trip-suggestion.service';
import type { GeoPoint } from '@/types/domain';
import { addDaysIso, defaultTripDates, eachDayBetween, formatDayLabel } from '@/utils/dates';

const STYLES = ['balanced', 'sightseeing', 'foodie', 'relaxed'] as const satisfies SuggestionStyle[];

export function TripSuggestionScreen() {
  const router = useRouter();
  const scheme = useAppColorScheme();
  const { user, preferences } = useAuth();
  const { currency } = useDisplayCurrency();
  const queryClient = useQueryClient();
  const { coords, label, hasLocation } = useEnsureLocation({ auto: true });
  const defaults = useMemo(() => defaultTripDates(), []);

  const [city, setCity] = useState(label?.split(',')[0] ?? '');
  const [pickedLocation, setPickedLocation] = useState<GeoPoint | null>(null);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(addDaysIso(2));
  const [style, setStyle] = useState<SuggestionStyle>('balanced');
  const [plan, setPlan] = useState<TripSuggestionPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<'new' | 'existing'>('new');
  const [saveScope, setSaveScope] = useState<'all' | 'selected'>('all');
  const [existingTripId, setExistingTripId] = useState<string | null>(null);
  const [adults, setAdults] = useState(String(preferences?.adults ?? 2));
  const [children, setChildren] = useState(String(preferences?.children ?? 0));
  const [genPhase, setGenPhase] = useState<'planning' | 'travel' | 'meals' | 'done' | null>(null);

  const tripsQuery = useQuery({
    queryKey: ['trips', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listTrips(user!.id),
    staleTime: 30_000,
  });

  const selectedTrip = useMemo(
    () => (tripsQuery.data ?? []).find((trip) => trip.id === existingTripId),
    [tripsQuery.data, existingTripId],
  );

  const generateMutation = useMutation({
    mutationFn: () => {
      const destinationLabel =
        (plan?.destinationLabel || city.trim() || label || 'nearby').trim();
      const useCoords =
        plan?.location ??
        pickedLocation ??
        (hasLocation && coords && (!city.trim() || city.trim() === (label?.split(',')[0] ?? ''))
          ? coords
          : null);
      return generateTripSuggestion({
        destinationLabel,
        location: useCoords,
        startDate,
        endDate,
        currency,
        style,
        companions: preferences,
      });
    },
    onSuccess: (next) => {
      setPlan(next);
      setSelectedDay(next.days[0]?.day ?? null);
      setGenPhase('done');
      analytics.track('trip_suggestion_generated', {
        destination: next.destinationLabel,
        days: next.days.length,
        style: next.style,
      });
    },
    onError: (error) => {
      setGenPhase(null);
      Alert.alert('Could not generate plan', getErrorMessage(error));
    },
  });

  useEffect(() => {
    if (!generateMutation.isPending) {
      return;
    }
    setGenPhase('planning');
    const t1 = setTimeout(() => setGenPhase('travel'), 900);
    const t2 = setTimeout(() => setGenPhase('meals'), 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [generateMutation.isPending]);
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Sign in required');
      }
      if (!plan) {
        throw new Error('Generate a suggestion first');
      }
      const onlyDays =
        saveScope === 'selected' && selectedDay ? [selectedDay] : undefined;

      if (saveMode === 'existing') {
        if (!existingTripId || !selectedTrip) {
          throw new Error('Pick an existing trip');
        }
        const tripDays = eachDayBetween(selectedTrip.startDate, selectedTrip.endDate);
        const planDays = onlyDays
          ? plan.days.filter((day) => onlyDays.includes(day.day))
          : plan.days;
        const dayOverride = planDays.map((_, index) => tripDays[index] ?? tripDays[tripDays.length - 1]!);
        await saveSuggestionToTrip({
          tripId: existingTripId,
          plan,
          onlyDays,
          dayOverride,
        });
        return existingTripId;
      }

      const trip = await saveSuggestionAsNewTrip({
        ownerId: user.id,
        plan,
        adults: Math.max(1, Number(adults) || 1),
        children: Math.max(0, Number(children) || 0),
        onlyDays,
      });
      return trip.id;
    },
    onSuccess: (tripId) => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] });
      void queryClient.invalidateQueries({ queryKey: ['itinerary-all', tripId] });
      analytics.track('trip_suggestion_saved', {
        tripId,
        mode: saveMode,
        scope: saveScope,
      });
      Alert.alert('Saved', 'Suggestion added to your itinerary.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Open trip', onPress: () => router.replace(`/trip/${tripId}`) },
      ]);
    },
    onError: (error) => Alert.alert('Could not save', getErrorMessage(error)),
  });

  const activeDay = selectedDay ?? plan?.days[0]?.day ?? null;
  const dayPlan = plan?.days.find((d) => d.day === activeDay);

  const onSelectCity = (next: string, suggestion?: DestinationSuggestion) => {
    const bad =
      suggestion?.kind === 'place' ||
      /\b(road|highway|street|avenue|compound|cemetery)\b/i.test(next);
    if (suggestion && (suggestion.kind === 'city' || suggestion.kind === 'region' || suggestion.kind === 'country')) {
      setCity(suggestion.shortName || next);
      setPickedLocation({ latitude: suggestion.latitude, longitude: suggestion.longitude });
      return;
    }
    // Avoid locking the plan to a road/POI pin.
    setCity(bad ? next.split(/[–—,]/)[0]?.trim() || next : next);
    if (!bad && suggestion) {
      setPickedLocation({ latitude: suggestion.latitude, longitude: suggestion.longitude });
    } else {
      setPickedLocation(null);
    }
  };

  const useMyLocation = () => {
    if (!coords) {
      Alert.alert('Location needed', 'Enable location or search a city.');
      return;
    }
    const short = label?.split(',')[0] ?? 'Near me';
    setCity(short);
    setPickedLocation(coords);
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerClassName="pb-12"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        testID="screen-trip-suggestion"
      >
        <SectionHeader
          title="Trip Suggestion"
          subtitle="Full-day plans from morning to late night — generate, then save as a new or existing trip"
        />

        <Card className="mb-4">
          {plan ? (
            <View className="mb-4">
              <AppText className="mb-2 font-sans-medium text-sm">Destination</AppText>
              <View
                className={`rounded-2xl border px-4 py-3.5 ${
                  scheme === 'dark'
                    ? 'border-brand-800 bg-surface-cardDark'
                    : 'border-black/8 bg-black/[0.03]'
                }`}
                testID="trip-suggestion-destination-readonly"
              >
                <AppText className="text-base">{plan.destinationLabel}</AppText>
              </View>
              <AppText muted className="mt-1.5 text-xs">
                Locked to the destination used for this plan. Generate again to change it.
              </AppText>
            </View>
          ) : (
            <>
              <CityAutocomplete
                label="Destination city"
                value={city}
                onChange={setCity}
                onSelect={onSelectCity}
                nearLabel={label}
                placeholder="e.g. Hong Kong, Malolos, Tokyo"
              />
              <View className="mb-3">
                <Button label="Use my current location" variant="secondary" onPress={useMyLocation} />
              </View>
            </>
          )}
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

          <AppText className="mb-2 font-sans-medium">Generation style</AppText>
          <ChipSelect
            options={STYLES}
            values={[style]}
            multiple={false}
            labels={{
              balanced: 'Balanced',
              sightseeing: 'Sightseeing',
              foodie: 'Foodie',
              relaxed: 'Relaxed',
            }}
            onChange={(values) => setStyle((values[0] as SuggestionStyle) ?? 'balanced')}
          />

          <View className="mt-4">
            <Button
              label={plan ? 'Regenerate day plan' : 'Generate day plan'}
              loading={generateMutation.isPending}
              disabled={!city.trim() && !pickedLocation && !plan}
              onPress={() => generateMutation.mutate()}
            />
          </View>
        </Card>

        {generateMutation.isPending || genPhase === 'planning' || genPhase === 'travel' || genPhase === 'meals' ? (
          <Card className="mb-4">
            <SectionHeader
              title="Generating itinerary"
              subtitle={
                genPhase === 'planning'
                  ? 'Planning days and highlights…'
                  : genPhase === 'travel'
                    ? 'Estimating travel time between stops…'
                    : genPhase === 'meals'
                      ? 'Fitting meals and evening plans…'
                      : 'Wrapping up…'
              }
            />
            <Skeleton height={120} />
            <View className="mt-3">
              <Skeleton height={88} />
            </View>
          </Card>
        ) : null}

        {plan ? (
          <>
            <SectionHeader
              title={plan.destinationLabel}
              subtitle={`${plan.startDate} → ${plan.endDate} · ${plan.style} · ${plan.currency}`}
            />
            {genPhase === 'done' ? (
              <AppText muted className="mb-3 text-sm">
                Plan ready — built from popular places and restaurants near your destination.
              </AppText>
            ) : null}
            {(plan.popularDestinations?.length ?? 0) > 0 ? (
              <Card className="mb-4">
                <SectionHeader
                  title="Popular nearby"
                  subtitle="Must-see destinations included in this plan"
                />
                {plan.popularDestinations!.slice(0, 10).map((place) => (
                  <View key={place.id} className="mb-2 flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <AppText className="font-sans-semibold">{place.name}</AppText>
                      <AppText muted className="text-xs">
                        {place.category}
                        {place.distanceMeters != null
                          ? ` · ${(place.distanceMeters / 1000).toFixed(1)} km`
                          : ''}
                        {place.rating != null ? ` · ${place.rating}★` : ''}
                      </AppText>
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {plan.days.map((day) => {
                  const active = day.day === activeDay;
                  return (
                    <Pressable
                      key={day.day}
                      onPress={() => setSelectedDay(day.day)}
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
                        {formatDayLabel(day.day)}
                      </AppText>
                      <AppText
                        className={`text-xs ${active ? 'text-brand-100' : ''}`}
                        muted={!active}
                        inverse={active}
                      >
                        {day.items.length} {day.items.length === 1 ? 'stop' : 'stops'}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Card className="mb-4">
              <AppText className="mb-3 font-sans-semibold">
                {activeDay ? formatDayLabel(activeDay) : 'Day plan'}
              </AppText>
              {dayPlan?.items.map((item, index) => (
                <View key={item.id}>
                  <View className="mb-3 overflow-hidden rounded-2xl border border-black/8 dark:border-brand-800">
                    <View className="border-b border-brand-50 bg-surface-mist px-3 py-2 dark:border-brand-800 dark:bg-brand-900">
                      <AppText className="text-xs font-sans-semibold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                        {item.startTime}–{item.endTime}
                        {' · '}
                        {item.kind.replace('_', ' ')}
                      </AppText>
                    </View>
                    <View className="p-3">
                      <AppText className="font-sans-bold text-base leading-5">{item.title}</AppText>
                      {item.feeLabel ? (
                        <AppText className="mt-1 text-sm font-sans-medium text-accent-600">
                          {item.feeLabel}
                        </AppText>
                      ) : null}
                      {item.notes ? (
                        <AppText muted className="mt-1.5 text-sm leading-5">
                          {item.notes}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                  {index < (dayPlan?.items.length ?? 0) - 1 && item.kind !== 'logistics' ? (
                    <AppText muted className="mb-3 text-center text-xs">
                      ↓ Travel between stops
                    </AppText>
                  ) : null}
                </View>
              ))}
              {(dayPlan?.items.length ?? 0) === 0 ? (
                <AppText muted>No stops for this day.</AppText>
              ) : null}
            </Card>

            <Card className="mb-4">
              <SectionHeader title="Save choices" subtitle="Where and how much to save" />

              <TextField
                label="Destination"
                value={plan.destinationLabel}
                editable={false}
                selectTextOnFocus={false}
                testID="trip-suggestion-save-destination"
              />

              <AppText className="mb-2 font-sans-medium">Save to</AppText>
              <View className="mb-3 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label="New trip"
                    variant={saveMode === 'new' ? 'primary' : 'secondary'}
                    onPress={() => setSaveMode('new')}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Existing trip"
                    variant={saveMode === 'existing' ? 'primary' : 'secondary'}
                    onPress={() => setSaveMode('existing')}
                  />
                </View>
              </View>

              <AppText className="mb-2 font-sans-medium">Days to save</AppText>
              <View className="mb-3 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label="All days"
                    variant={saveScope === 'all' ? 'primary' : 'secondary'}
                    onPress={() => setSaveScope('all')}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Selected day only"
                    variant={saveScope === 'selected' ? 'primary' : 'secondary'}
                    onPress={() => setSaveScope('selected')}
                  />
                </View>
              </View>

              {saveMode === 'new' ? (
                <View className="mb-2 flex-row gap-2">
                  <View className="flex-1">
                    <TextField
                      label="Adults"
                      value={adults}
                      onChangeText={setAdults}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View className="flex-1">
                    <TextField
                      label="Children"
                      value={children}
                      onChangeText={setChildren}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              ) : (
                <View className="mb-3 gap-2">
                  {(tripsQuery.data ?? []).map((trip) => {
                    const active = trip.id === existingTripId;
                    return (
                      <Pressable
                        key={trip.id}
                        onPress={() => setExistingTripId(trip.id)}
                        className={`rounded-2xl border px-3 py-3 ${
                          active
                            ? 'border-brand-600 bg-brand-50 dark:bg-brand-900'
                            : scheme === 'dark'
                              ? 'border-brand-800'
                              : 'border-brand-100'
                        }`}
                      >
                        <AppText className="font-sans-semibold">{trip.title}</AppText>
                        <AppText muted className="text-xs">
                          {trip.startDate} → {trip.endDate}
                        </AppText>
                      </Pressable>
                    );
                  })}
                  {(tripsQuery.data?.length ?? 0) === 0 ? (
                    <AppText muted>No trips yet — save as a new trip instead.</AppText>
                  ) : null}
                </View>
              )}

              <Button
                label={
                  saveMode === 'new'
                    ? saveScope === 'selected'
                      ? 'Save selected day as new trip'
                      : 'Save as new trip'
                    : saveScope === 'selected'
                      ? 'Add selected day to trip'
                      : 'Add all days to trip'
                }
                loading={saveMutation.isPending}
                disabled={saveMode === 'existing' && !existingTripId}
                onPress={() => {
                  if (!requireAuthToSave(router, { actionLabel: 'save this itinerary' })) return;
                  saveMutation.mutate();
                }}
              />
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
