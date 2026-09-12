import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { getErrorMessage, toAppError } from '@/lib/errors/app-error';
import { signInWithEmail, signOut } from '@/services/auth/auth.service';
import { ensureProfile, fetchPreferences } from '@/services/profile/profile.service';
import { useAuthStore } from '@/stores/auth-store';
import { emailPasswordSchema } from '@/types/auth';

type FormValues = z.infer<typeof emailPasswordSchema>;

export default function AdminLoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(emailPasswordSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      // Clear any traveler session so password grant is clean on web.
      if (isAuthenticated && !isAdmin) {
        await signOut().catch(() => undefined);
        useAuthStore.getState().reset();
      }

      const signedIn = await signInWithEmail(values);
      const profile = await ensureProfile(signedIn);
      const preferences = await fetchPreferences(signedIn.id);
      useAuthStore.getState().setUser(signedIn);
      useAuthStore.getState().setProfile(profile);
      useAuthStore.getState().setPreferences(preferences);

      if (profile.role !== 'admin' || profile.is_disabled) {
        await signOut().catch(() => undefined);
        useAuthStore.getState().reset();
        setError('This account is not an administrator.');
        return;
      }

      router.replace('/admin');
    } catch (err) {
      setError(getErrorMessage(toAppError(err)));
    }
  });

  return (
    <Screen testID="admin-login" fullBleed>
      <ScrollView className="flex-1" contentContainerClassName="items-center px-5 py-10">
        <View className="w-full max-w-md">
          <SectionHeader
            eyebrow="Operators"
            title="Admin login"
            subtitle="Sign in with an administrator account to manage users and Travel Guide content."
          />
          {isAuthenticated && !isAdmin ? (
            <AppText muted className="mb-4 text-sm">
              Signed in as {user?.email ?? 'traveler'}. Enter an admin account below to switch.
            </AppText>
          ) : null}
          <Card>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value }, fieldState }) => (
                <TextField
                  label="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={fieldState.error?.message}
                  testID="admin-email"
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value }, fieldState }) => (
                <TextField
                  label="Password"
                  secureTextEntry
                  autoComplete="password"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={fieldState.error?.message}
                  testID="admin-password"
                />
              )}
            />
            {error ? (
              <AppText className="mb-3 text-sm text-red-500">{error}</AppText>
            ) : null}
            <Button label="Sign in to admin" loading={isSubmitting} onPress={onSubmit} />
            <View className="mt-3">
              <Button
                label="Back to traveler app"
                variant="secondary"
                onPress={() => router.replace('/(tabs)')}
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
