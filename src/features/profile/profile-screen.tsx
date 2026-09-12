import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { env } from '@/config/env';
import { labelize } from '@/constants/preferences';
import { useAuth } from '@/hooks/use-auth';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { getErrorMessage } from '@/lib/errors/app-error';
import { signOut } from '@/services/auth/auth.service';
import { buildOfflinePack } from '@/services/offline/offline.service';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore, type ThemePreference } from '@/stores/theme-store';

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

export function ProfileScreen() {
  const router = useRouter();
  const scheme = useAppColorScheme();
  const { user, profile, preferences } = useAuth();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  const onSignOut = async () => {
    try {
      await signOut();
      useAuthStore.getState().reset();
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Sign out failed', getErrorMessage(error));
    }
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
        className="flex-1 px-5 pt-14"
        contentContainerClassName="pb-10"
        testID="screen-profile"
      >
        <SectionHeader title="Profile" subtitle="Traveler identity, prefs, and tools" />

        <Card className="mb-4">
          <AppText className="font-sans-semibold text-lg">
            {profile?.full_name ?? user?.fullName ?? 'Traveler'}
          </AppText>
          <AppText muted className="mt-1">
            {user?.email ?? 'No email'}
          </AppText>
          <AppText muted className="mt-2">
            Auth: {env.isSupabaseConfigured ? 'Supabase' : 'Local demo'}
          </AppText>
          <View className="mt-4">
            <Button label="Sign out" variant="secondary" onPress={() => void onSignOut()} />
          </View>
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
                Home: {preferences.home_country ?? '—'} · {preferences.home_currency} ·{' '}
                {preferences.preferred_language}
              </AppText>
              <AppText muted>
                Party: {preferences.adults} adult(s), {preferences.children} child(ren)
              </AppText>
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
          <SectionHeader title="Appearance" subtitle={`Active scheme: ${scheme}`} />
          <View className="gap-2">
            {THEME_OPTIONS.map((option) => (
              <Button
                key={option}
                label={option}
                variant={preference === option ? 'primary' : 'secondary'}
                onPress={() => setPreference(option)}
                testID={`theme-${option}`}
              />
            ))}
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
    </Screen>
  );
}
