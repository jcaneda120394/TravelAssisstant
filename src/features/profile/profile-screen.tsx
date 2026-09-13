import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

import { CurrencyPickerModal } from '@/components/currency/currency-picker-modal';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { env } from '@/config/env';
import { formatCurrencyWithSymbol, formatFxCurrencyName } from '@/constants/fx-currencies';
import { labelize } from '@/constants/preferences';
import { useAuth } from '@/hooks/use-auth';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useCountryAppearance } from '@/hooks/use-country-appearance';
import { getErrorMessage } from '@/lib/errors/app-error';
import { signOut, deleteAccount } from '@/services/auth/auth.service';
import { buildOfflinePack } from '@/services/offline/offline.service';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore, type ThemePreference } from '@/stores/theme-store';

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

export function ProfileScreen() {
  const router = useRouter();
  const scheme = useAppColorScheme();
  const { user, profile, preferences, isAdmin } = useAuth();
  const { currency, setCurrency } = useDisplayCurrency();
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  const followCountryTheme = useThemeStore((state) => state.followCountryTheme);
  const setFollowCountryTheme = useThemeStore((state) => state.setFollowCountryTheme);
  const { countryTheme, locationLabel, colors, countryThemesSupported } = useCountryAppearance();

  const onSignOut = async () => {
    try {
      await signOut();
      useAuthStore.getState().reset();
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Sign out failed', getErrorMessage(error));
    }
  };

  const onDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your profile, trips, and saved data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setDeleting(true);
              try {
                await deleteAccount();
                useAuthStore.getState().reset();
                router.replace('/(tabs)');
              } catch (error) {
                Alert.alert('Unable to delete account', getErrorMessage(error));
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
  };

  const onOfflinePack = async () => {
    if (!user) return;
    const pack = await buildOfflinePack(user.id);
    Alert.alert(
      'Offline pack ready',
      `Cached ${pack.trips.length} trip(s) and emergency numbers at ${pack.generatedAt}`,
    );
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerClassName="pb-10"
        testID="screen-profile"
      >
        <SectionHeader title="Profile" subtitle="Traveler identity, prefs, and tools" />

        <Card className="mb-4">
          <AppText className="font-sans-semibold text-lg">
            {user
              ? (profile?.full_name ?? user.fullName ?? 'Traveler')
              : 'Browsing as guest'}
          </AppText>
          <AppText muted className="mt-1">
            {user?.email ?? 'Sign up to save trips and favorites'}
          </AppText>
          <AppText muted className="mt-2">
            Auth: {env.isSupabaseConfigured ? 'Supabase' : 'Local demo'}
          </AppText>
          <View className="mt-4 gap-2">
            {user ? (
              <>
                {isAdmin ? (
                  <Button
                    label="Open admin dashboard"
                    onPress={() => router.push('/admin')}
                    testID="open-admin-dashboard"
                  />
                ) : null}
                <Button label="Sign out" variant="secondary" onPress={() => void onSignOut()} />
                <Button
                  label={deleting ? 'Deleting…' : 'Delete account'}
                  variant="secondary"
                  disabled={deleting}
                  onPress={onDeleteAccount}
                  testID="delete-account"
                />
              </>
            ) : (
              <>
                <Button label="Sign up" onPress={() => router.push('/(auth)/signup')} />
                <Button
                  label="Log in"
                  variant="secondary"
                  onPress={() => router.push('/(auth)/login')}
                />
              </>
            )}
          </View>
        </Card>

        <Card className="mb-4">
          <SectionHeader
            title="Display currency"
            subtitle="Used for hotels, restaurants, and attraction prices"
          />
          <Pressable
            onPress={() => setCurrencyPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Change display currency"
            className={`mt-1 flex-row items-center self-start rounded-full border px-3 py-1.5 ${
              scheme === 'dark' ? 'border-brand-700 bg-surface-cardDark' : 'border-brand-200 bg-white'
            }`}
          >
            <AppText className="text-sm font-sans-semibold">
              {formatCurrencyWithSymbol(currency)}
            </AppText>
            <AppText muted className="ml-1.5 text-xs">
              {formatFxCurrencyName(currency)}
            </AppText>
            <Ionicons
              name="chevron-down"
              size={14}
              color={scheme === 'dark' ? '#9BB0AC' : '#5B6F6C'}
              style={{ marginLeft: 6 }}
            />
          </Pressable>
        </Card>

        <Card className="mb-4">
          <SectionHeader title="Travel preferences" />
          {preferences ? (
            <View className="gap-2">
              <AppText muted>
                Styles:{' '}
                {preferences.travel_styles.length
                  ? preferences.travel_styles.map(labelize).join(', ')
                  : '—'}
              </AppText>
              <AppText muted>
                Budget: {preferences.budget_tier ? labelize(preferences.budget_tier) : '—'}
              </AppText>
              <AppText muted>
                Home: {preferences.home_country ?? '—'} · {currency} ·{' '}
                {preferences.preferred_language}
              </AppText>
              <AppText muted>
                Party: {preferences.adults} adult(s), {preferences.children} child(ren)
              </AppText>
              {preferences.traveling_with_kids ? (
                <AppText muted>
                  Kids ages:{' '}
                  {preferences.kids_ages?.length
                    ? preferences.kids_ages.join(', ')
                    : 'set in onboarding'}
                </AppText>
              ) : null}
              {preferences.traveling_with_elderly ? (
                <AppText muted>
                  Elderly ages:{' '}
                  {preferences.elderly_ages?.length
                    ? preferences.elderly_ages.join(', ')
                    : 'set in onboarding'}
                </AppText>
              ) : null}
            </View>
          ) : (
            <AppText muted>No preferences saved yet.</AppText>
          )}
          <View className="mt-4">
            <Button
              label="Edit onboarding preferences"
              variant="secondary"
              onPress={() => {
                if (profile) {
                  useAuthStore.getState().setProfile({
                    ...profile,
                    onboarding_completed: false,
                  });
                }
                router.push('/(onboarding)');
              }}
            />
          </View>
        </Card>

        <Card className="mb-4">
          <SectionHeader title="Travel tools" />
          <View className="gap-2">
            <Button label="Travel Guide" variant="secondary" onPress={() => router.push('/(tabs)/guide')} />
            <Button label="Favorites" variant="secondary" onPress={() => router.push('/favorites')} />
            <Button label="Currency" variant="secondary" onPress={() => router.push('/currency')} />
            <Button label="eSIM" variant="secondary" onPress={() => router.push('/esim')} />
            <Button label="Weather" variant="secondary" onPress={() => router.push('/weather')} />
            <Button label="Emergency" variant="secondary" onPress={() => router.push('/emergency')} />
            <Button label="Notifications" variant="secondary" onPress={() => router.push('/notifications')} />
            <Button label="Build offline pack" variant="secondary" onPress={() => void onOfflinePack()} />
          </View>
        </Card>

        <Card className="mb-4">
          <SectionHeader
            title="Appearance"
            subtitle={
              countryThemesSupported
                ? `Active scheme: ${scheme}${
                    followCountryTheme ? ` · ${countryTheme.label} theme` : ' · Casual theme'
                  }`
                : `Casual theme · ${scheme === 'dark' ? 'Dark' : 'Light'} mode`
            }
          />
          <AppText muted className="mb-3 text-sm">
            {countryThemesSupported
              ? followCountryTheme
                ? locationLabel
                  ? `Colors follow your location (${locationLabel}).`
                  : 'Choose a city on Home to apply that country’s theme.'
                : 'Using the Casual TravelAssistant palette.'
              : 'Web uses the Casual palette only. Switch between light (normal) and dark below.'}
          </AppText>
          <View
            className="mb-4 h-3 overflow-hidden rounded-full"
            style={{ backgroundColor: colors.primarySoft }}
          >
            <View className="h-full w-2/3 rounded-full" style={{ backgroundColor: colors.primary }} />
          </View>
          {countryThemesSupported ? (
            <View className="mb-3 gap-2">
              <Button
                label={followCountryTheme ? 'Country theme: On' : 'Country theme: Off'}
                variant={followCountryTheme ? 'primary' : 'secondary'}
                onPress={() => setFollowCountryTheme(!followCountryTheme)}
                testID="theme-follow-country"
              />
              <AppText muted className="text-xs">
                Example: Tokyo / Japan → Japan indigo & sakura accents.
              </AppText>
            </View>
          ) : null}
          <View className="gap-2">
            {(countryThemesSupported
              ? THEME_OPTIONS
              : (['light', 'dark'] as ThemePreference[])
            ).map((option) => {
              const selected = countryThemesSupported
                ? preference === option
                : preference === option || (preference === 'system' && option === scheme);
              return (
                <Button
                  key={option}
                  label={
                    option === 'light'
                      ? 'Light (normal)'
                      : option === 'dark'
                        ? 'Dark'
                        : option
                  }
                  variant={selected ? 'primary' : 'secondary'}
                  onPress={() => setPreference(option)}
                  testID={`theme-${option}`}
                />
              );
            })}
          </View>
        </Card>

        <Card>
          <SectionHeader title="App status" />
          <AppText muted>Environment: {env.appEnv}</AppText>
          <AppText muted>
            Supabase: {env.isSupabaseConfigured ? 'Configured' : 'Not configured (demo auth)'}
          </AppText>
          <AppText muted>
            Mock providers: {env.useMockProviders ? 'Enabled' : 'Disabled'}
          </AppText>
        </Card>
      </ScrollView>

      <CurrencyPickerModal
        visible={currencyPickerOpen}
        currency={currency}
        onClose={() => setCurrencyPickerOpen(false)}
        onSelect={(next) => {
          void setCurrency(next);
        }}
      />
    </Screen>
  );
}
