import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { BUDGET_TIERS, LANGUAGES, WALKING_TOLERANCE } from '@/constants/preferences';
import { theme } from '@/config/theme';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { getErrorMessage } from '@/lib/errors/app-error';
import {
  fetchAdminUserDetail,
  updateAdminUserAuth,
  updateAdminUserPreferences,
  updateAdminUserProfile,
} from '@/services/admin/admin.service';
import type { UserPreferences } from '@/types/auth';

function ChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null | undefined;
  options: readonly { value: T; label: string }[] | readonly T[];
  onChange: (next: T) => void;
}) {
  const normalized = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );

  return (
    <View className="mb-4">
      <AppText className="mb-2 font-sans-medium text-sm">{label}</AppText>
      <View className="flex-row flex-wrap gap-2">
        {normalized.map((option) => {
          const active = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              className={`rounded-2xl border px-3 py-2 ${
                active ? 'border-brand-600 bg-brand-600' : 'border-brand-200 dark:border-brand-800'
              }`}
            >
              <AppText inverse={active} className="text-sm font-sans-medium">
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AdminUserEditScreen() {
  const router = useRouter();
  const scheme = useAppColorScheme();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const userId = Array.isArray(params.id) ? params.id[0] : params.id;

  const detailQuery = useQuery({
    queryKey: ['admin-user', userId],
    enabled: Boolean(userId),
    queryFn: () => fetchAdminUserDetail(userId!),
  });

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [isDisabled, setIsDisabled] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [homeCountry, setHomeCountry] = useState('');
  const [homeCurrency, setHomeCurrency] = useState('USD');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [budgetTier, setBudgetTier] = useState<UserPreferences['budget_tier']>(null);
  const [adults, setAdults] = useState('1');
  const [children, setChildren] = useState('0');
  const [distanceUnit, setDistanceUnit] = useState<UserPreferences['distance_unit']>('km');
  const [temperatureUnit, setTemperatureUnit] =
    useState<UserPreferences['temperature_unit']>('celsius');
  const [timeFormat, setTimeFormat] = useState<UserPreferences['time_format']>('24h');
  const [walkingTolerance, setWalkingTolerance] =
    useState<UserPreferences['walking_tolerance']>(null);

  useEffect(() => {
    const detail = detailQuery.data;
    if (!detail) {
      return;
    }
    setFullName(detail.profile.full_name ?? '');
    setEmail(detail.profile.email ?? '');
    setPhone(detail.profile.phone ?? '');
    setAvatarUrl(detail.profile.avatar_url ?? '');
    setBio(detail.profile.bio ?? '');
    setAdminNotes(detail.profile.admin_notes ?? '');
    setRole(detail.profile.role);
    setIsDisabled(detail.profile.is_disabled);
    setOnboardingCompleted(detail.profile.onboarding_completed);

    const prefs = detail.preferences;
    setHomeCountry(prefs?.home_country ?? '');
    setHomeCurrency(prefs?.home_currency ?? 'USD');
    setPreferredLanguage(prefs?.preferred_language ?? 'en');
    setBudgetTier(prefs?.budget_tier ?? null);
    setAdults(String(prefs?.adults ?? 1));
    setChildren(String(prefs?.children ?? 0));
    setDistanceUnit(prefs?.distance_unit ?? 'km');
    setTemperatureUnit(prefs?.temperature_unit ?? 'celsius');
    setTimeFormat(prefs?.time_format ?? '24h');
    setWalkingTolerance(prefs?.walking_tolerance ?? null);
  }, [detailQuery.data]);

  const languageOptions = useMemo(
    () => LANGUAGES.map((item) => ({ value: item.code, label: item.label })),
    [],
  );

  const savePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error('Missing user id');
      }
      if (!password) {
        throw new Error('Enter a new password');
      }
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      if (password !== passwordConfirm) {
        throw new Error('Password confirmation does not match');
      }
      await updateAdminUserAuth({ userId, password });
    },
    onSuccess: () => {
      setPassword('');
      setPasswordConfirm('');
      Alert.alert('Saved', 'Password updated.');
    },
    onError: (error) => Alert.alert('Save failed', getErrorMessage(error)),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error('Missing user id');
      }

      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = fullName.trim();
      const original = detailQuery.data?.profile;

      await updateAdminUserProfile(userId, {
        full_name: trimmedName || null,
        email: trimmedEmail || null,
        avatar_url: avatarUrl.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        admin_notes: adminNotes.trim() || null,
        onboarding_completed: onboardingCompleted,
        role,
        is_disabled: isDisabled,
      });

      await updateAdminUserPreferences(userId, {
        home_country: homeCountry.trim() || null,
        home_currency: homeCurrency.trim().toUpperCase() || 'USD',
        preferred_language: preferredLanguage.trim() || 'en',
        budget_tier: budgetTier,
        adults: Math.max(1, Number.parseInt(adults, 10) || 1),
        children: Math.max(0, Number.parseInt(children, 10) || 0),
        distance_unit: distanceUnit,
        temperature_unit: temperatureUnit,
        time_format: timeFormat,
        walking_tolerance: walkingTolerance,
      });

      const authPatch: { email?: string; fullName?: string } = {};
      if (trimmedEmail && trimmedEmail !== (original?.email ?? '')) {
        authPatch.email = trimmedEmail;
      }
      if (trimmedName && trimmedName !== (original?.full_name ?? '')) {
        authPatch.fullName = trimmedName;
      }
      if (authPatch.email || authPatch.fullName) {
        await updateAdminUserAuth({ userId, ...authPatch });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      Alert.alert('Saved', 'User profile updated.');
    },
    onError: (error) => Alert.alert('Save failed', getErrorMessage(error)),
  });

  if (!userId) {
    return (
      <Screen className="items-center justify-center px-6">
        <AppText>Missing user id.</AppText>
        <View className="mt-4">
          <Button label="Back to users" onPress={() => router.replace('/admin/users')} />
        </View>
      </Screen>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator color={theme[scheme].primary} size="large" />
      </Screen>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Screen className="items-center justify-center px-6">
        <AppText className="text-red-500">
          {getErrorMessage(detailQuery.error ?? new Error('User not found'))}
        </AppText>
        <View className="mt-4">
          <Button label="Back to users" onPress={() => router.replace('/admin/users')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen testID="admin-user-edit">
      <ScrollView className="flex-1 px-6 py-6" contentContainerClassName="pb-16">
        <Button label="← Back to users" variant="ghost" onPress={() => router.back()} />
        <SectionHeader
          eyebrow="Edit user"
          title={detailQuery.data.profile.full_name || detailQuery.data.profile.email || 'User'}
          subtitle="Change name, password, profile info, and travel details"
        />

        <Card className="mb-4">
          <AppText className="mb-3 font-sans-semibold text-lg">Profile</AppText>
          <TextField label="Full name" value={fullName} onChangeText={setFullName} />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextField
            label="Avatar URL"
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            autoCapitalize="none"
          />
          <TextField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
          />
          <TextField
            label="Admin notes"
            value={adminNotes}
            onChangeText={setAdminNotes}
            multiline
            numberOfLines={3}
            placeholder="Internal notes (not shown to traveler)"
          />
          <ChoiceRow
            label="Role"
            value={role}
            options={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Admin' },
            ]}
            onChange={setRole}
          />
          <ChoiceRow
            label="Account status"
            value={isDisabled ? 'disabled' : 'active'}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'disabled', label: 'Disabled' },
            ]}
            onChange={(next) => setIsDisabled(next === 'disabled')}
          />
          <ChoiceRow
            label="Onboarding"
            value={onboardingCompleted ? 'done' : 'pending'}
            options={[
              { value: 'done', label: 'Completed' },
              { value: 'pending', label: 'Incomplete' },
            ]}
            onChange={(next) => setOnboardingCompleted(next === 'done')}
          />
        </Card>

        <Card className="mb-4">
          <AppText className="mb-1 font-sans-semibold text-lg">Password</AppText>
          <AppText muted className="mb-3 text-sm">
            Minimum 8 characters. Use Save password to update only this section.
          </AppText>
          <TextField
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <TextField
            label="Confirm password"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry
            autoComplete="new-password"
          />
          <Button
            label="Save password"
            loading={savePasswordMutation.isPending}
            disabled={saveMutation.isPending}
            onPress={() => savePasswordMutation.mutate()}
          />
        </Card>

        <Card className="mb-4">
          <AppText className="mb-3 font-sans-semibold text-lg">Travel details</AppText>
          <TextField
            label="Home country (code)"
            value={homeCountry}
            onChangeText={setHomeCountry}
            placeholder="e.g. PH, JP, US"
            autoCapitalize="characters"
          />
          <TextField
            label="Home currency"
            value={homeCurrency}
            onChangeText={setHomeCurrency}
            placeholder="USD"
            autoCapitalize="characters"
          />
          <ChoiceRow
            label="Preferred language"
            value={preferredLanguage}
            options={languageOptions}
            onChange={setPreferredLanguage}
          />
          <ChoiceRow
            label="Budget tier"
            value={budgetTier ?? undefined}
            options={BUDGET_TIERS}
            onChange={setBudgetTier}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField label="Adults" value={adults} onChangeText={setAdults} keyboardType="number-pad" />
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
          <ChoiceRow
            label="Distance unit"
            value={distanceUnit}
            options={[
              { value: 'km', label: 'Kilometers' },
              { value: 'mi', label: 'Miles' },
            ]}
            onChange={setDistanceUnit}
          />
          <ChoiceRow
            label="Temperature"
            value={temperatureUnit}
            options={[
              { value: 'celsius', label: 'Celsius' },
              { value: 'fahrenheit', label: 'Fahrenheit' },
            ]}
            onChange={setTemperatureUnit}
          />
          <ChoiceRow
            label="Time format"
            value={timeFormat}
            options={[
              { value: '12h', label: '12-hour' },
              { value: '24h', label: '24-hour' },
            ]}
            onChange={setTimeFormat}
          />
          <ChoiceRow
            label="Walking tolerance"
            value={walkingTolerance ?? undefined}
            options={WALKING_TOLERANCE}
            onChange={setWalkingTolerance}
          />
        </Card>

        <Button
          label="Save changes"
          loading={saveMutation.isPending}
          disabled={savePasswordMutation.isPending}
          onPress={() => saveMutation.mutate()}
        />
      </ScrollView>
    </Screen>
  );
}
