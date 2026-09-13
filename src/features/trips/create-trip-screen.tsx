import { useMutation } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { DatePickerField } from '@/components/forms/date-picker-field';
import { DestinationAutocomplete } from '@/components/forms/destination-autocomplete';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { requireAuthForTrips, requireAuthToSave } from '@/features/auth/require-auth';
import { analytics } from '@/lib/analytics';
import { getErrorMessage } from '@/lib/errors/app-error';
import { finalizeCreateTripDraft } from '@/services/trips/create-trip.service';
import {
  BUDGET_LEVELS,
  CREATE_TRIP_STEPS,
  DURATION_PRESETS,
  INTEREST_OPTIONS,
  PACE_OPTIONS,
  TRANSPORT_OPTIONS,
  TRAVEL_STYLES,
  useCreateTripStore,
} from '@/stores/create-trip-store';
import { addDaysIso } from '@/utils/dates';

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const scheme = useAppColorScheme();
  return (
    <Pressable
      onPress={onPress}
      className={`mb-2 mr-2 rounded-2xl border px-3 py-2 ${
        selected
          ? 'border-brand-600 bg-brand-600'
          : scheme === 'dark'
            ? 'border-brand-700 bg-surface-cardDark'
            : 'border-black/8 bg-white'
      }`}
    >
      <AppText className={selected ? 'text-white' : undefined}>{label}</AppText>
    </Pressable>
  );
}

function StepperBar({ index, total }: { index: number; total: number }) {
  const pct = Math.round(((index + 1) / total) * 100);
  return (
    <View className="mb-4">
      <AppText muted className="mb-2 text-xs">
        Step {index + 1} of {total}
      </AppText>
      <View className="h-2 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-800">
        <View className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}

export function CreateTripScreen() {
  const router = useRouter();
  const { user, preferences } = useAuth();
  const scheme = useAppColorScheme();
  const draft = useCreateTripStore();
  const step = CREATE_TRIP_STEPS[draft.stepIndex] ?? 'destination';

  useFocusEffect(
    useCallback(() => {
      if (user) return;
      requireAuthForTrips(router, 'create trips');
      router.replace('/(tabs)');
    }, [router, user]),
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in required');
      return finalizeCreateTripDraft({ ownerId: user.id, draft });
    },
    onSuccess: (trip) => {
      analytics.track('trip_created', { tripId: trip.id, source: trip.source });
      draft.reset();
      router.replace(`/trip/${trip.id}`);
    },
    onError: (error) => Alert.alert('Could not create trip', getErrorMessage(error)),
  });

  const canContinue = useMemo(() => {
    switch (step) {
      case 'destination':
        return draft.destinations.some((d) => d.trim().length > 0);
      case 'dates':
        return Boolean(draft.startDate) && (draft.openEnded || Boolean(draft.endDate));
      case 'travelers':
        return draft.adults >= 1;
      case 'style':
        return Boolean(draft.travelStyle);
      case 'pace':
        return Boolean(draft.pace);
      case 'interests':
        return true;
      case 'budget':
        return Boolean(draft.budgetLevel);
      case 'transport':
        return draft.transportPreferences.length > 0;
      case 'hotel':
        return draft.hotelChoice !== 'have' || draft.hotelName.trim().length > 0;
      case 'build':
        return Boolean(draft.planningMode);
      default:
        return true;
    }
  }, [draft, step]);

  const titles: Record<(typeof CREATE_TRIP_STEPS)[number], { title: string; subtitle: string }> = {
    destination: { title: 'Where are you going?', subtitle: 'Country, city, or multiple destinations' },
    dates: { title: 'When are you traveling?', subtitle: 'Open-ended trips are supported' },
    travelers: { title: 'Who is going?', subtitle: 'Adults, children, and rooms' },
    style: { title: 'Travel style', subtitle: 'How do you usually travel?' },
    pace: { title: 'Travel pace', subtitle: 'How busy should days feel?' },
    interests: { title: 'Interests', subtitle: 'Pick as many as you like' },
    budget: { title: 'Budget', subtitle: 'Level and optional totals' },
    transport: { title: 'Transportation', subtitle: 'Preferred ways to get around' },
    hotel: { title: 'Accommodation', subtitle: 'Already booked, or decide later' },
    build: { title: 'How should we build it?', subtitle: 'AI, suggestion, or manual' },
  };

  const header = titles[step];

  if (!user) {
    return (
      <Screen>
        <View />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerClassName="pb-28" keyboardShouldPersistTaps="handled">
        <SectionHeader title="Create Trip" subtitle="Guided planner · resume anytime" />
        <StepperBar index={draft.stepIndex} total={CREATE_TRIP_STEPS.length} />
        <Card className="mb-4">
          <SectionHeader title={header.title} subtitle={header.subtitle} />

          {step === 'destination' ? (
            <DestinationAutocomplete
              label="Destinations"
              values={draft.destinations}
              onChange={(values) => draft.setField('destinations', values)}
              placeholder="Tokyo, Kyoto, Osaka…"
            />
          ) : null}

          {step === 'dates' ? (
            <View>
              <DatePickerField
                label="Start date"
                value={draft.startDate}
                onChange={(next) => {
                  draft.patch({
                    startDate: next,
                    endDate:
                      draft.openEnded || !draft.endDate || draft.endDate < next ? next : draft.endDate,
                    hotelCheckIn: next,
                  });
                }}
              />
              {!draft.openEnded ? (
                <DatePickerField
                  label="End date"
                  value={draft.endDate ?? draft.startDate}
                  minimumDate={new Date(`${draft.startDate}T12:00:00`)}
                  onChange={(next) => draft.patch({ endDate: next, hotelCheckOut: next })}
                />
              ) : (
                <AppText muted className="mb-3">
                  End date left open — you can add days later.
                </AppText>
              )}
              <Chip
                label={draft.openEnded ? '✓ I don’t know my end date yet' : 'I don’t know my end date yet'}
                selected={draft.openEnded}
                onPress={() =>
                  draft.patch({
                    openEnded: !draft.openEnded,
                    endDate: !draft.openEnded ? null : draft.endDate ?? addDaysIso(4),
                  })
                }
              />
              <AppText muted className="mb-2 mt-3 text-xs">
                Duration shortcuts
              </AppText>
              <View className="flex-row flex-wrap">
                {DURATION_PRESETS.map((n) => (
                  <Chip
                    key={n}
                    label={`${n}d`}
                    selected={
                      !draft.openEnded &&
                      draft.endDate === addDaysIso(n - 1, new Date(`${draft.startDate}T12:00:00`))
                    }
                    onPress={() =>
                      draft.patch({
                        openEnded: false,
                        endDate: addDaysIso(n - 1, new Date(`${draft.startDate}T12:00:00`)),
                      })
                    }
                  />
                ))}
              </View>
            </View>
          ) : null}

          {step === 'travelers' ? (
            <View className="gap-2">
              {[
                { key: 'adults' as const, label: 'Adults', min: 1 },
                { key: 'children' as const, label: 'Children', min: 0 },
                { key: 'infants' as const, label: 'Infants', min: 0 },
                { key: 'rooms' as const, label: 'Rooms', min: 1 },
              ].map((row) => (
                <View key={row.key} className="flex-row items-center justify-between py-2">
                  <AppText className="font-sans-semibold">{row.label}</AppText>
                  <View className="flex-row items-center gap-3">
                    <Button
                      label="−"
                      variant="secondary"
                      onPress={() =>
                        draft.setField(row.key, Math.max(row.min, (draft[row.key] as number) - 1))
                      }
                    />
                    <AppText className="min-w-[24px] text-center">{draft[row.key]}</AppText>
                    <Button
                      label="+"
                      variant="secondary"
                      onPress={() => draft.setField(row.key, (draft[row.key] as number) + 1)}
                    />
                  </View>
                </View>
              ))}
              <Button
                label="Use profile defaults"
                variant="ghost"
                onPress={() =>
                  draft.patch({
                    adults: preferences?.adults ?? 2,
                    children: preferences?.children ?? 0,
                  })
                }
              />
            </View>
          ) : null}

          {step === 'style' ? (
            <View className="flex-row flex-wrap">
              {TRAVEL_STYLES.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  selected={draft.travelStyle === s.id}
                  onPress={() => draft.setField('travelStyle', s.id)}
                />
              ))}
            </View>
          ) : null}

          {step === 'pace' ? (
            <View className="gap-3">
              {PACE_OPTIONS.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => draft.setField('pace', p.id)}
                  className={`rounded-2xl border p-4 ${
                    draft.pace === p.id
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-900'
                      : scheme === 'dark'
                        ? 'border-brand-700'
                        : 'border-brand-100'
                  }`}
                >
                  <AppText className="font-sans-semibold">{p.label}</AppText>
                  <AppText muted className="mt-1">
                    {p.hint}
                  </AppText>
                </Pressable>
              ))}
            </View>
          ) : null}

          {step === 'interests' ? (
            <View className="flex-row flex-wrap">
              {INTEREST_OPTIONS.map((interest) => {
                const selected = draft.interests.includes(interest);
                return (
                  <Chip
                    key={interest}
                    label={interest}
                    selected={selected}
                    onPress={() =>
                      draft.setField(
                        'interests',
                        selected
                          ? draft.interests.filter((i) => i !== interest)
                          : [...draft.interests, interest],
                      )
                    }
                  />
                );
              })}
            </View>
          ) : null}

          {step === 'budget' ? (
            <View>
              <View className="mb-3 flex-row flex-wrap">
                {BUDGET_LEVELS.map((b) => (
                  <Chip
                    key={b.id}
                    label={b.label}
                    selected={draft.budgetLevel === b.id}
                    onPress={() => draft.setField('budgetLevel', b.id)}
                  />
                ))}
              </View>
              <TextField
                label="Home currency"
                value={draft.homeCurrency}
                onChangeText={(v) => draft.setField('homeCurrency', v.toUpperCase())}
                autoCapitalize="characters"
              />
              <TextField
                label="Total trip budget (optional)"
                value={draft.totalBudget != null ? String(draft.totalBudget) : ''}
                onChangeText={(v) =>
                  draft.setField('totalBudget', v.trim() ? Number(v.replace(/[^\d.]/g, '')) : undefined)
                }
                keyboardType="numeric"
                placeholder="e.g. 150000"
              />
              <TextField
                label="Daily budget (optional)"
                value={draft.dailyBudget != null ? String(draft.dailyBudget) : ''}
                onChangeText={(v) =>
                  draft.setField('dailyBudget', v.trim() ? Number(v.replace(/[^\d.]/g, '')) : undefined)
                }
                keyboardType="numeric"
                placeholder="e.g. 10000"
              />
            </View>
          ) : null}

          {step === 'transport' ? (
            <View>
              <View className="mb-2 flex-row flex-wrap">
                {TRANSPORT_OPTIONS.map((t) => {
                  const selected = draft.transportPreferences.includes(t.id);
                  return (
                    <Chip
                      key={t.id}
                      label={t.label}
                      selected={selected}
                      onPress={() =>
                        draft.setField(
                          'transportPreferences',
                          selected
                            ? draft.transportPreferences.filter((x) => x !== t.id)
                            : [...draft.transportPreferences, t.id],
                        )
                      }
                    />
                  );
                })}
              </View>
              <AppText muted className="mb-2 mt-2">
                Walking tolerance
              </AppText>
              <View className="flex-row flex-wrap">
                {(['low', 'medium', 'high'] as const).map((w) => (
                  <Chip
                    key={w}
                    label={w}
                    selected={draft.walkingTolerance === w}
                    onPress={() => draft.setField('walkingTolerance', w)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {step === 'hotel' ? (
            <View>
              {(
                [
                  { id: 'have' as const, label: 'Yes — I have a hotel' },
                  { id: 'find' as const, label: 'No — help me find one' },
                  { id: 'later' as const, label: 'Decide later' },
                ] as const
              ).map((opt) => (
                <Chip
                  key={opt.id}
                  label={opt.label}
                  selected={draft.hotelChoice === opt.id}
                  onPress={() => draft.setField('hotelChoice', opt.id)}
                />
              ))}
              {draft.hotelChoice === 'have' ? (
                <View className="mt-3">
                  <TextField
                    label="Hotel name"
                    value={draft.hotelName}
                    onChangeText={(v) => draft.setField('hotelName', v)}
                  />
                  <TextField
                    label="Address"
                    value={draft.hotelAddress}
                    onChangeText={(v) => draft.setField('hotelAddress', v)}
                  />
                  <DatePickerField
                    label="Check-in"
                    value={draft.hotelCheckIn}
                    onChange={(v) => draft.setField('hotelCheckIn', v)}
                  />
                  <DatePickerField
                    label="Check-out"
                    value={draft.hotelCheckOut}
                    onChange={(v) => draft.setField('hotelCheckOut', v)}
                  />
                  <TextField
                    label="Reservation number"
                    value={draft.hotelReservation}
                    onChangeText={(v) => draft.setField('hotelReservation', v)}
                  />
                  <TextField
                    label="Notes"
                    value={draft.hotelNotes}
                    onChangeText={(v) => draft.setField('hotelNotes', v)}
                  />
                </View>
              ) : null}
              {draft.hotelChoice === 'find' ? (
                <AppText muted className="mt-3">
                  Hotels can be recommended after the trip is created (Hotels tab / Ask AI).
                </AppText>
              ) : null}
            </View>
          ) : null}

          {step === 'build' ? (
            <View className="gap-3">
              <TextField
                label="Trip name (optional)"
                value={draft.title}
                onChangeText={(v) => draft.setField('title', v)}
                placeholder={draft.destinations.join(' + ') || 'My trip'}
              />
              {(
                [
                  {
                    id: 'ai' as const,
                    label: 'Generate my trip with AI',
                    hint: 'Builds a full day-by-day itinerary from your answers.',
                  },
                  {
                    id: 'suggestion' as const,
                    label: 'Start with a suggested trip',
                    hint: 'Browse curated sample trips next.',
                  },
                  {
                    id: 'manual' as const,
                    label: 'Build manually',
                    hint: 'Empty days from your dates — add activities yourself.',
                  },
                  {
                    id: 'import' as const,
                    label: 'Import existing trip',
                    hint: 'Creates a draft shell you can fill from notes.',
                  },
                ] as const
              ).map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => draft.setField('planningMode', opt.id)}
                  className={`rounded-2xl border p-4 ${
                    draft.planningMode === opt.id
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-900'
                      : scheme === 'dark'
                        ? 'border-brand-700'
                        : 'border-brand-100'
                  }`}
                >
                  <AppText className="font-sans-semibold">{opt.label}</AppText>
                  <AppText muted className="mt-1">
                    {opt.hint}
                  </AppText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Card>
      </ScrollView>

      <View
        className={`absolute bottom-0 left-0 right-0 border-t px-5 py-4 ${
          scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-black/8 bg-white'
        }`}
      >
        <View className="flex-row gap-2">
          {draft.stepIndex > 0 ? (
            <View className="flex-1">
              <Button label="Back" variant="secondary" onPress={draft.prevStep} />
            </View>
          ) : null}
          <View className="flex-1">
            {step === 'build' ? (
              <Button
                label={
                  draft.planningMode === 'suggestion'
                    ? 'Browse suggestions'
                    : createMutation.isPending
                      ? 'Creating…'
                      : 'Create trip'
                }
                loading={createMutation.isPending}
                disabled={!canContinue}
                onPress={() => {
                  if (draft.planningMode === 'suggestion') {
                    const dest = draft.destinations.filter(Boolean)[0] ?? '';
                    const duration =
                      draft.openEnded || !draft.endDate
                        ? undefined
                        : Math.max(
                            1,
                            Math.round(
                              (new Date(`${draft.endDate}T12:00:00`).getTime() -
                                new Date(`${draft.startDate}T12:00:00`).getTime()) /
                                86_400_000,
                            ) + 1,
                          );
                    router.push({
                      pathname: '/trip-suggestions',
                      params: {
                        fromDraft: '1',
                        destination: dest,
                        startDate: draft.startDate,
                        durationDays: duration != null ? String(duration) : undefined,
                        travelStyle: draft.travelStyle,
                        budgetLevel: draft.budgetLevel,
                        pace: draft.pace,
                        adults: String(draft.adults),
                        children: String(draft.children),
                      },
                    });
                    return;
                  }
                  if (!requireAuthToSave(router, { actionLabel: 'create and save trips' })) return;
                  createMutation.mutate();
                }}
              />
            ) : (
              <Button
                label="Continue"
                disabled={!canContinue}
                onPress={draft.nextStep}
              />
            )}
          </View>
        </View>
      </View>
    </Screen>
  );
}
