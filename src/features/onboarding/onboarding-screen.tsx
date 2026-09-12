import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { ChipSelect } from '@/components/forms/chip-select';
import { CompanionTravelFields } from '@/components/forms/companion-travel-fields';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import {
  ACCESSIBILITY_OPTIONS,
  BUDGET_TIERS,
  COUNTRY_CURRENCY,
  DIETARY_OPTIONS,
  LANGUAGES,
  TRANSPORT_PREFERENCES,
  TRAVEL_INTERESTS,
  TRAVEL_STYLES,
  WALKING_TOLERANCE,
  labelize,
} from '@/constants/preferences';
import { CountrySelect } from '@/components/forms/country-select';
import { CurrencySearchField } from '@/components/forms/currency-search-field';
import { useAuth } from '@/hooks/use-auth';
import { getErrorMessage } from '@/lib/errors/app-error';
import { analytics } from '@/lib/analytics';
import { signOut } from '@/services/auth/auth.service';
import { completeOnboarding } from '@/services/profile/profile.service';
import { useAuthStore } from '@/stores/auth-store';
import { syncDisplayCurrencyFromPreferences } from '@/stores/currency-store';
import {
  onboardingDraftSchema,
  type OnboardingDraft,
} from '@/types/auth';

const STEPS = [
  'About you',
  'Travel style',
  'Interests',
  'Budget',
  'Transport',
  'Details',
] as const;

const defaultDraft = (fullName: string | null): OnboardingDraft => ({
  full_name: fullName ?? '',
  travel_styles: [],
  interests: [],
  budget_tier: 'mid_range',
  transport_preferences: [],
  home_country: 'PH',
  home_currency: 'PHP',
  preferred_language: 'en',
  adults: 1,
  children: 0,
  traveling_with_kids: false,
  kids_ages: [],
  traveling_with_elderly: false,
  elderly_ages: [],
  dietary_restrictions: [],
  accessibility_requirements: [],
  walking_tolerance: 'medium',
  distance_unit: 'km',
  temperature_unit: 'celsius',
  time_format: '24h',
});

/** Sensible defaults so Skip can complete onboarding and reach Home. */
function skipDraft(current: OnboardingDraft, fallbackName: string | null): OnboardingDraft {
  return {
    ...current,
    full_name: current.full_name.trim() || fallbackName?.trim() || 'Traveler',
    travel_styles: current.travel_styles.length ? current.travel_styles : ['solo'],
    interests: current.interests.length ? current.interests : ['culture'],
    budget_tier: current.budget_tier || 'mid_range',
    transport_preferences: current.transport_preferences.length
      ? current.transport_preferences
      : ['walking'],
    home_country: current.home_country || 'PH',
    home_currency: current.home_currency || 'PHP',
    preferred_language: current.preferred_language || 'en',
  };
}

export function OnboardingScreen() {
  const router = useRouter();
  const { user, profile, preferences } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    const base = defaultDraft(profile?.full_name ?? user?.fullName ?? null);
    if (!preferences) {
      return base;
    }
    return {
      ...base,
      full_name: preferences ? profile?.full_name || base.full_name : base.full_name,
      travel_styles: preferences.travel_styles.length ? preferences.travel_styles : base.travel_styles,
      interests: preferences.interests.length ? preferences.interests : base.interests,
      budget_tier: preferences.budget_tier ?? base.budget_tier,
      transport_preferences: preferences.transport_preferences.length
        ? preferences.transport_preferences
        : base.transport_preferences,
      home_country: preferences.home_country ?? base.home_country,
      home_currency: preferences.home_currency ?? base.home_currency,
      preferred_language: preferences.preferred_language ?? base.preferred_language,
      adults: preferences.adults ?? base.adults,
      children: preferences.children ?? base.children,
      traveling_with_kids: preferences.traveling_with_kids ?? false,
      kids_ages: preferences.kids_ages ?? [],
      traveling_with_elderly: preferences.traveling_with_elderly ?? false,
      elderly_ages: preferences.elderly_ages ?? [],
      dietary_restrictions: preferences.dietary_restrictions ?? [],
      accessibility_requirements: preferences.accessibility_requirements ?? [],
      walking_tolerance: preferences.walking_tolerance ?? base.walking_tolerance,
      distance_unit: preferences.distance_unit ?? base.distance_unit,
      temperature_unit: preferences.temperature_unit ?? base.temperature_unit,
      time_format: preferences.time_format ?? base.time_format,
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => `${step + 1} / ${STEPS.length}`, [step]);

  const update = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const validateStep = (): boolean => {
    try {
      if (step === 0) {
        onboardingDraftSchema.pick({ full_name: true }).parse({ full_name: draft.full_name });
      } else if (step === 1) {
        onboardingDraftSchema
          .pick({ travel_styles: true })
          .parse({ travel_styles: draft.travel_styles });
      } else if (step === 2) {
        onboardingDraftSchema.pick({ interests: true }).parse({ interests: draft.interests });
      } else if (step === 3) {
        onboardingDraftSchema.pick({ budget_tier: true }).parse({ budget_tier: draft.budget_tier });
      } else if (step === 4) {
        onboardingDraftSchema
          .pick({ transport_preferences: true })
          .parse({ transport_preferences: draft.transport_preferences });
      } else if (step === 5) {
        if (draft.traveling_with_kids && draft.kids_ages.length === 0) {
          setError('Enter kids’ ages (e.g. 4, 7)');
          return false;
        }
        if (draft.traveling_with_elderly && draft.elderly_ages.length === 0) {
          setError('Enter elderly ages (e.g. 68, 74)');
          return false;
        }
      }
      setError(null);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    }
  };

  const next = () => {
    if (!validateStep()) {
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const back = () => setStep((current) => Math.max(current - 1, 0));

  const saveAndGoHome = async (payload: OnboardingDraft, skipped: boolean) => {
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    const parsed = onboardingDraftSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please complete all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const result = await completeOnboarding(user.id, parsed.data);
      useAuthStore.getState().setProfile(result.profile);
      useAuthStore.getState().setPreferences(result.preferences);
      syncDisplayCurrencyFromPreferences(result.preferences.home_currency);
      analytics.track('onboarding_completed', { skipped });
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Could not save preferences', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => {
    void saveAndGoHome(draft, false);
  };

  const skipToHome = () => {
    Alert.alert(
      'Skip setup?',
      'We’ll use sensible defaults so you can go Home now. You can finish personalizing anytime in Profile.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Skip to Home',
          onPress: () => {
            void saveAndGoHome(
              skipDraft(draft, profile?.full_name ?? user?.fullName ?? null),
              true,
            );
          },
        },
      ],
    );
  };

  const onSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime to continue setup.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setSubmitting(true);
              await signOut();
              useAuthStore.getState().reset();
              analytics.track('auth_logout', { from: 'onboarding' });
              router.replace('/(tabs)');
            } catch (err) {
              Alert.alert('Sign out failed', getErrorMessage(err));
            } finally {
              setSubmitting(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerClassName="pb-12"
        testID="screen-onboarding"
      >
        <View className="mb-3 flex-row items-center justify-between gap-3">
          <AppText muted className="text-sm font-sans-medium">
            Step {progress}
          </AppText>
          <View className="flex-row gap-2">
            <Button
              label="Skip for now"
              variant="ghost"
              disabled={submitting}
              onPress={skipToHome}
              testID="onboarding-skip"
            />
            <Button
              label="Sign out"
              variant="secondary"
              disabled={submitting}
              onPress={onSignOut}
              testID="onboarding-sign-out"
            />
          </View>
        </View>

        <SectionHeader title={STEPS[step] ?? 'Onboarding'} subtitle="Personalize TravelAssistant" />

        <Card className="mb-5">
          {step === 0 ? (
            <View>
              <TextField
                label="What should we call you?"
                autoCapitalize="words"
                value={draft.full_name}
                onChangeText={(value) => update('full_name', value)}
                testID="onboarding-name"
              />
              <CountrySelect
                label="Home country"
                value={draft.home_country || 'PH'}
                onChange={(code) => {
                  update('home_country', code);
                  const currency = COUNTRY_CURRENCY[code];
                  if (currency) {
                    update('home_currency', currency);
                  }
                }}
              />
              <AppText className="mb-2 mt-1 font-sans-medium">Preferred language</AppText>
              <ChipSelect
                options={LANGUAGES.map((item) => item.code)}
                values={[draft.preferred_language]}
                multiple={false}
                labels={Object.fromEntries(LANGUAGES.map((item) => [item.code, item.label]))}
                onChange={(values) => update('preferred_language', values[0] ?? 'en')}
              />
              <CurrencySearchField
                label="Home currency"
                value={draft.home_currency}
                onChange={(code) => update('home_currency', code)}
                testID="onboarding-home-currency"
              />
            </View>
          ) : null}

          {step === 1 ? (
            <View>
              <AppText muted className="mb-3">
                Select all that describe how you travel.
              </AppText>
              <ChipSelect
                options={TRAVEL_STYLES}
                values={draft.travel_styles}
                onChange={(values) => update('travel_styles', values)}
              />
            </View>
          ) : null}

          {step === 2 ? (
            <View>
              <AppText muted className="mb-3">
                What do you love discovering?
              </AppText>
              <ChipSelect
                options={TRAVEL_INTERESTS}
                values={draft.interests}
                onChange={(values) => update('interests', values)}
              />
            </View>
          ) : null}

          {step === 3 ? (
            <View>
              <AppText muted className="mb-3">
                Typical trip budget level
              </AppText>
              <ChipSelect
                options={BUDGET_TIERS}
                values={[draft.budget_tier]}
                multiple={false}
                onChange={(values) => update('budget_tier', values[0] ?? 'mid_range')}
              />
            </View>
          ) : null}

          {step === 4 ? (
            <View>
              <AppText muted className="mb-3">
                Preferred ways to get around
              </AppText>
              <ChipSelect
                options={TRANSPORT_PREFERENCES}
                values={draft.transport_preferences}
                onChange={(values) => update('transport_preferences', values)}
              />
            </View>
          ) : null}

          {step === 5 ? (
            <View className="gap-4">
              <View>
                <AppText className="mb-2 font-sans-medium">Adults</AppText>
                <ChipSelect
                  options={['1', '2', '3', '4', '5', '6'] as const}
                  values={[String(draft.adults)]}
                  multiple={false}
                  onChange={(values) => update('adults', Number(values[0] ?? 1))}
                />
              </View>
              <View>
                <AppText className="mb-2 font-sans-medium">Children (count)</AppText>
                <ChipSelect
                  options={['0', '1', '2', '3', '4'] as const}
                  values={[String(draft.children)]}
                  multiple={false}
                  onChange={(values) => update('children', Number(values[0] ?? 0))}
                />
              </View>
              <CompanionTravelFields
                travelingWithKids={draft.traveling_with_kids}
                kidsAges={draft.kids_ages}
                travelingWithElderly={draft.traveling_with_elderly}
                elderlyAges={draft.elderly_ages}
                onChange={(next) => {
                  setDraft((prev) => ({
                    ...prev,
                    traveling_with_kids: next.traveling_with_kids,
                    kids_ages: next.kids_ages,
                    traveling_with_elderly: next.traveling_with_elderly,
                    elderly_ages: next.elderly_ages,
                    children:
                      next.children != null
                        ? next.children
                        : next.traveling_with_kids
                          ? Math.max(prev.children, next.kids_ages.length || 1)
                          : prev.children,
                  }));
                  setError(null);
                }}
              />
              <View>
                <AppText className="mb-2 font-sans-medium">Walking tolerance</AppText>
                <ChipSelect
                  options={WALKING_TOLERANCE}
                  values={[draft.walking_tolerance]}
                  multiple={false}
                  onChange={(values) => update('walking_tolerance', values[0] ?? 'medium')}
                />
              </View>
              <View>
                <AppText className="mb-2 font-sans-medium">Dietary</AppText>
                <ChipSelect
                  options={DIETARY_OPTIONS}
                  values={draft.dietary_restrictions}
                  onChange={(values) => update('dietary_restrictions', values)}
                />
              </View>
              <View>
                <AppText className="mb-2 font-sans-medium">Accessibility</AppText>
                <ChipSelect
                  options={ACCESSIBILITY_OPTIONS}
                  values={draft.accessibility_requirements}
                  onChange={(values) => update('accessibility_requirements', values)}
                />
              </View>
              <View>
                <AppText className="mb-2 font-sans-medium">Units</AppText>
                <ChipSelect
                  options={['km', 'mi'] as const}
                  values={[draft.distance_unit]}
                  multiple={false}
                  labels={{ km: 'Kilometers', mi: 'Miles' }}
                  onChange={(values) => update('distance_unit', values[0] ?? 'km')}
                />
                <View className="mt-3" />
                <ChipSelect
                  options={['celsius', 'fahrenheit'] as const}
                  values={[draft.temperature_unit]}
                  multiple={false}
                  labels={{ celsius: 'Celsius', fahrenheit: 'Fahrenheit' }}
                  onChange={(values) => update('temperature_unit', values[0] ?? 'celsius')}
                />
                <View className="mt-3" />
                <ChipSelect
                  options={['12h', '24h'] as const}
                  values={[draft.time_format]}
                  multiple={false}
                  labels={{ '12h': '12-hour', '24h': '24-hour' }}
                  onChange={(values) => update('time_format', values[0] ?? '24h')}
                />
              </View>
            </View>
          ) : null}

          {error ? (
            <AppText className="mt-4 text-sm text-red-500">{error}</AppText>
          ) : null}
        </Card>

        <View className="flex-row gap-3">
          {step > 0 ? (
            <View className="flex-1">
              <Button label="Back" variant="secondary" onPress={back} />
            </View>
          ) : null}
          <View className="flex-1">
            {step < STEPS.length - 1 ? (
              <Button label="Continue" onPress={next} testID="onboarding-next" />
            ) : (
              <Button
                label="Finish setup"
                loading={submitting}
                onPress={finish}
                testID="onboarding-finish"
              />
            )}
          </View>
        </View>

        <View className="mt-4">
          <Button
            label="Skip for now — go to Home"
            variant="secondary"
            disabled={submitting}
            loading={submitting}
            onPress={skipToHome}
            testID="onboarding-skip-bottom"
          />
        </View>

        {step === STEPS.length - 1 ? (
          <AppText muted className="mt-4 text-center text-sm">
            You can change preferences later in Profile. Selected budget:{' '}
            {labelize(draft.budget_tier)}
          </AppText>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
