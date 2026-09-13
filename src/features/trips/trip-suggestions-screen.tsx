import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { DatePickerField } from '@/components/forms/date-picker-field';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { requireAuthToSave } from '@/features/auth/require-auth';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { analytics } from '@/lib/analytics';
import { getErrorMessage } from '@/lib/errors/app-error';
import { useTripTemplate } from '@/services/trips/create-trip.service';
import {
  defaultTemplateStartDate,
  filterTripTemplates,
  type TripTemplate,
} from '@/services/trips/trip-templates.catalog';
import { BUDGET_LEVELS, DURATION_PRESETS, TRAVEL_STYLES } from '@/stores/create-trip-store';
import type { TripBudgetLevel, TripPace } from '@/types/domain';

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

function SuggestionCard({
  template,
  onView,
  onCustomize,
  onUse,
  onSave,
  using,
}: {
  template: TripTemplate;
  onView: () => void;
  onCustomize: () => void;
  onUse: () => void;
  onSave: () => void;
  using?: boolean;
}) {
  const scheme = useAppColorScheme();
  return (
    <View
      className={`mb-4 rounded-2xl border p-4 ${
        scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-black/8 bg-white'
      }`}
    >
      <AppText className="text-3xl">{template.heroEmoji}</AppText>
      <AppText className="mt-2 font-sans-semibold text-xl">{template.name}</AppText>
      <AppText muted className="mt-1">
        {template.cities.join(' → ') || template.destinations.join(' · ')}
      </AppText>
      <AppText muted className="mt-1">
        {template.durationDays} days · {template.travelStyle} · {template.budgetLevel.replace('_', '-')} ·{' '}
        {template.pace}
      </AppText>
      <AppText className="mt-2">{template.description}</AppText>
      <AppText muted className="mt-2 text-xs">
        Highlights: {template.highlights.slice(0, 4).join(' · ')}
      </AppText>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <View className="min-w-[100px] flex-1">
          <Button label="View" variant="secondary" onPress={onView} />
        </View>
        <View className="min-w-[100px] flex-1">
          <Button label="Customize" variant="secondary" onPress={onCustomize} />
        </View>
        <View className="min-w-[100px] flex-1">
          <Button label="Use this trip" loading={using} onPress={onUse} />
        </View>
        <View className="min-w-[100px] flex-1">
          <Button label="Save" variant="ghost" loading={using} onPress={onSave} />
        </View>
      </View>
    </View>
  );
}

export function TripSuggestionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    templateId?: string;
    fromDraft?: string;
    destination?: string;
    startDate?: string;
    durationDays?: string;
    travelStyle?: string;
    budgetLevel?: string;
    pace?: string;
    adults?: string;
    children?: string;
  }>();
  const { user } = useAuth();
  const scheme = useAppColorScheme();
  const queryClient = useQueryClient();

  const [destination, setDestination] = useState(
    typeof params.destination === 'string' ? params.destination : '',
  );
  const [durationDays, setDurationDays] = useState<number | undefined>(() => {
    const raw = typeof params.durationDays === 'string' ? Number(params.durationDays) : NaN;
    return Number.isFinite(raw) && raw > 0 ? raw : undefined;
  });
  const [travelStyle, setTravelStyle] = useState<string | undefined>(
    typeof params.travelStyle === 'string' ? params.travelStyle : undefined,
  );
  const [budgetLevel, setBudgetLevel] = useState<TripBudgetLevel | undefined>(
    typeof params.budgetLevel === 'string' ? (params.budgetLevel as TripBudgetLevel) : undefined,
  );
  const [pace, setPace] = useState<TripPace | undefined>(
    typeof params.pace === 'string' ? (params.pace as TripPace) : undefined,
  );
  const [childrenOnly, setChildrenOnly] = useState(
    typeof params.children === 'string' ? Number(params.children) > 0 : false,
  );
  const [startDate, setStartDate] = useState(
    typeof params.startDate === 'string' ? params.startDate : defaultTemplateStartDate(),
  );
  const [viewId, setViewId] = useState<string | null>(
    typeof params.templateId === 'string' ? params.templateId : null,
  );
  const [customize, setCustomize] = useState(params.fromDraft === '1');
  const [customAdults, setCustomAdults] = useState(
    typeof params.adults === 'string' ? Math.max(1, Number(params.adults) || 2) : 2,
  );
  const [customChildren, setCustomChildren] = useState(
    typeof params.children === 'string' ? Math.max(0, Number(params.children) || 0) : 0,
  );
  const [customPace, setCustomPace] = useState<TripPace>(
    typeof params.pace === 'string' ? (params.pace as TripPace) : 'balanced',
  );
  const [customBudget, setCustomBudget] = useState<TripBudgetLevel | undefined>(budgetLevel);

  const results = useMemo(
    () =>
      filterTripTemplates({
        destination: destination || undefined,
        durationDays,
        travelStyle,
        budgetLevel,
        pace,
        children: childrenOnly ? 1 : undefined,
      }),
    [destination, durationDays, travelStyle, budgetLevel, pace, childrenOnly],
  );

  const viewing = results.find((t) => t.id === viewId) ?? filterTripTemplates({}).find((t) => t.id === viewId);

  const useMutationHook = useMutation({
    mutationFn: async (template: TripTemplate) => {
      if (!user) throw new Error('Sign in required');
      return useTripTemplate({
        ownerId: user.id,
        template,
        startDate,
        overrides: customize
          ? {
              adults: customAdults,
              children: customChildren,
              pace: customPace,
              budgetLevel: customBudget,
            }
          : undefined,
      });
    },
    onSuccess: (trip) => {
      analytics.track('trip_created', { tripId: trip.id, source: 'template' });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      router.replace(`/trip/${trip.id}`);
    },
    onError: (error) => Alert.alert('Could not save trip', getErrorMessage(error)),
  });

  if (viewing) {
    const weeks: Array<{ label: string; days: typeof viewing.days; offset: number }> = [];
    if (viewing.durationDays > 7) {
      for (let w = 0; w * 7 < viewing.days.length; w++) {
        const slice = viewing.days.slice(w * 7, w * 7 + 7);
        weeks.push({
          label: `Week ${w + 1} · Days ${w * 7 + 1}–${w * 7 + slice.length}`,
          days: slice,
          offset: w * 7,
        });
      }
    } else {
      weeks.push({ label: 'Itinerary', days: viewing.days, offset: 0 });
    }

    return (
      <Screen>
        <ScrollView className="flex-1 px-5 pt-4" contentContainerClassName="pb-12">
          <Button label="← All suggestions" variant="ghost" onPress={() => setViewId(null)} />
          <SectionHeader
            title={`${viewing.heroEmoji} ${viewing.name}`}
            subtitle={`${viewing.durationDays} days · ${viewing.adults} adults${
              viewing.children ? ` + ${viewing.children} child` : ''
            } · ${viewing.budgetLevel.replace('_', '-')} · ${viewing.pace}`}
          />
          <Card className="mb-4">
            <AppText>{viewing.description}</AppText>
            <AppText muted className="mt-2">
              Destinations: {viewing.cities.join(' → ')}
            </AppText>
            {viewing.hotelArea ? (
              <AppText muted className="mt-1">
                Hotel area: {viewing.hotelArea}
              </AppText>
            ) : null}
            {viewing.estimatedBudget ? (
              <AppText muted className="mt-2 text-xs">
                Rough estimate ({viewing.estimatedBudget.currency}): lodging{' '}
                {viewing.estimatedBudget.accommodation.toLocaleString()}, food{' '}
                {viewing.estimatedBudget.food.toLocaleString()}, transport{' '}
                {viewing.estimatedBudget.transport.toLocaleString()}, attractions{' '}
                {viewing.estimatedBudget.attractions.toLocaleString()}. Not guaranteed prices.
              </AppText>
            ) : null}
          </Card>

          <Card className="mb-4">
            <SectionHeader title="Start date" subtitle="Used when you save this suggestion" />
            <DatePickerField label="Trip start" value={startDate} onChange={setStartDate} />
            <Chip
              label={customize ? '✓ Customize before save' : 'Customize before save'}
              selected={customize}
              onPress={() => {
                setCustomize((v) => !v);
                setCustomAdults(viewing.adults);
                setCustomChildren(viewing.children);
                setCustomPace(viewing.pace);
              }}
            />
            {customize ? (
              <View className="mt-2">
                <AppText muted className="mb-2">
                  Adults: {customAdults} · Children: {customChildren} · Pace: {customPace}
                </AppText>
                <View className="mb-2 flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label="Adults −"
                      variant="secondary"
                      onPress={() => setCustomAdults((n) => Math.max(1, n - 1))}
                    />
                  </View>
                  <View className="flex-1">
                    <Button label="Adults +" variant="secondary" onPress={() => setCustomAdults((n) => n + 1)} />
                  </View>
                </View>
                <View className="mb-2 flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label="Kids −"
                      variant="secondary"
                      onPress={() => setCustomChildren((n) => Math.max(0, n - 1))}
                    />
                  </View>
                  <View className="flex-1">
                    <Button
                      label="Kids +"
                      variant="secondary"
                      onPress={() => setCustomChildren((n) => n + 1)}
                    />
                  </View>
                </View>
                <View className="flex-row flex-wrap">
                  {(['relaxed', 'balanced', 'packed'] as TripPace[]).map((p) => (
                    <Chip key={p} label={p} selected={customPace === p} onPress={() => setCustomPace(p)} />
                  ))}
                </View>
                <AppText muted className="mb-2 mt-2">
                  Budget level
                </AppText>
                <View className="flex-row flex-wrap">
                  {BUDGET_LEVELS.map((b) => (
                    <Chip
                      key={b.id}
                      label={b.label}
                      selected={customBudget === b.id}
                      onPress={() => setCustomBudget(b.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            <View className="mt-3 gap-2">
              <Button
                label="Use this trip"
                loading={useMutationHook.isPending}
                onPress={() => {
                  if (!requireAuthToSave(router, { actionLabel: 'save this trip' })) return;
                  useMutationHook.mutate(viewing);
                }}
              />
              <Button
                label="Generate live places instead"
                variant="secondary"
                onPress={() => router.push('/trip-suggestion')}
              />
            </View>
          </Card>

          {weeks.map((week) => (
            <Card key={week.label} className="mb-4">
              <SectionHeader title={week.label} />
              {week.days.map((day, idx) => (
                <View key={`${week.offset}-${idx}`} className="mb-3 border-b border-black/8 pb-3 dark:border-brand-800">
                  <AppText className="font-sans-semibold">
                    Day {week.offset + idx + 1} · {day.title}
                  </AppText>
                  {day.city ? (
                    <AppText muted className="text-xs">
                      {day.city}
                      {day.country ? `, ${day.country}` : ''}
                    </AppText>
                  ) : null}
                  {day.activities.map((act, aIdx) => (
                    <View key={`${act.title}-${aIdx}`} className="mt-2">
                      <AppText>
                        {act.startTime} · {act.title}
                      </AppText>
                      <AppText muted className="text-xs">
                        {act.kind}
                        {act.notes?.includes('live_data_required') ? ' · needs live transport' : ''}
                      </AppText>
                      {aIdx < day.activities.length - 1 && day.activities[aIdx + 1]?.kind !== 'transport' ? (
                        <AppText muted className="my-1 text-center text-xs">
                          ↓
                        </AppText>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
            </Card>
          ))}
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerClassName="pb-12" keyboardShouldPersistTaps="handled">
        <SectionHeader
          title="Trip Suggestions"
          subtitle="Complete sample trips — same format as Create Trip"
        />

        <Card className="mb-4">
          <TextField
            label="Destination"
            value={destination}
            onChangeText={setDestination}
            placeholder="Japan, Hong Kong, Tokyo…"
            autoCapitalize="words"
          />
          <AppText muted className="mb-2">
            Duration
          </AppText>
          <View className="mb-2 flex-row flex-wrap">
            <Chip label="Any" selected={durationDays == null} onPress={() => setDurationDays(undefined)} />
            {DURATION_PRESETS.map((n) => (
              <Chip
                key={n}
                label={`${n}d`}
                selected={durationDays === n}
                onPress={() => setDurationDays(n)}
              />
            ))}
          </View>
          <AppText muted className="mb-2">
            Style
          </AppText>
          <View className="mb-2 flex-row flex-wrap">
            <Chip label="Any" selected={!travelStyle} onPress={() => setTravelStyle(undefined)} />
            {TRAVEL_STYLES.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                selected={travelStyle === s.id}
                onPress={() => setTravelStyle(s.id)}
              />
            ))}
          </View>
          <AppText muted className="mb-2">
            Budget
          </AppText>
          <View className="mb-2 flex-row flex-wrap">
            <Chip label="Any" selected={!budgetLevel} onPress={() => setBudgetLevel(undefined)} />
            {BUDGET_LEVELS.map((b) => (
              <Chip
                key={b.id}
                label={b.label}
                selected={budgetLevel === b.id}
                onPress={() => setBudgetLevel(b.id)}
              />
            ))}
          </View>
          <View className="mb-2 flex-row flex-wrap">
            <Chip
              label={childrenOnly ? '✓ With kids' : 'With kids'}
              selected={childrenOnly}
              onPress={() => setChildrenOnly((v) => !v)}
            />
            {(['relaxed', 'balanced', 'packed'] as TripPace[]).map((p) => (
              <Chip
                key={p}
                label={p}
                selected={pace === p}
                onPress={() => setPace(pace === p ? undefined : p)}
              />
            ))}
          </View>
          <Button label="Generate with live places" variant="secondary" onPress={() => router.push('/trip-suggestion')} />
        </Card>

        {results.length === 0 ? (
          <EmptyState
            title="No matching suggestions"
            description="Clear filters or generate a live plan for your destination."
          />
        ) : (
          results.map((tpl) => (
            <SuggestionCard
              key={tpl.id}
              template={tpl}
              using={useMutationHook.isPending && useMutationHook.variables?.id === tpl.id}
              onView={() => {
                setViewId(tpl.id);
                setCustomAdults(tpl.adults);
                setCustomChildren(tpl.children);
                setCustomPace(tpl.pace);
                setCustomBudget(tpl.budgetLevel);
              }}
              onCustomize={() => {
                setViewId(tpl.id);
                setCustomize(true);
                setCustomAdults(customAdults || tpl.adults);
                setCustomChildren(customChildren || tpl.children);
                setCustomPace(customPace || tpl.pace);
                setCustomBudget(customBudget ?? tpl.budgetLevel);
              }}
              onUse={() => {
                if (!requireAuthToSave(router, { actionLabel: 'save this trip' })) return;
                setCustomize(true);
                useMutationHook.mutate(tpl);
              }}
              onSave={() => {
                if (!requireAuthToSave(router, { actionLabel: 'save this trip' })) return;
                useMutationHook.mutate(tpl);
              }}
            />
          ))
        )}

        {params.fromDraft === '1' ? (
          <Card className="mt-2">
            <AppText muted className="text-sm">
              Filters prefilled from your Create Trip draft. Customize a template, then Use this trip.
            </AppText>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
