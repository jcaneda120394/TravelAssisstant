import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Platform } from 'react-native';
import { z } from 'zod';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { env } from '@/config/env';
import { AuthBackToHomeBar, goToGuestHome } from '@/features/auth/auth-back-to-home';
import { getErrorMessage, toAppError } from '@/lib/errors/app-error';
import {
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signOut,
} from '@/services/auth/auth.service';
import { ensureProfile, fetchPreferences } from '@/services/profile/profile.service';
import { useAuthStore } from '@/stores/auth-store';
import { emailPasswordSchema } from '@/types/auth';

type FormValues = z.infer<typeof emailPasswordSchema>;

async function hydrateAfterAuth(user: {
  id: string;
  email: string | null;
  fullName: string | null;
}) {
  try {
    const profile = await ensureProfile(user);
    const preferences = await fetchPreferences(user.id);
    useAuthStore.getState().setUser(user);
    useAuthStore.getState().setProfile(profile);
    useAuthStore.getState().setPreferences(preferences);
  } catch (error) {
    const appError = toAppError(error);
    await signOut().catch(() => undefined);
    useAuthStore.getState().reset();
    throw appError;
  }
}

export function LoginScreen() {
  const router = useRouter();
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(emailPasswordSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const user = await signInWithEmail(values);
      await hydrateAfterAuth(user);
    } catch (error) {
      Alert.alert('Sign in failed', getErrorMessage(error));
    }
  });

  const onGoogle = async () => {
    try {
      setOauthLoading('google');
      const user = await signInWithGoogle();
      if (user) {
        await hydrateAfterAuth(user);
      }
    } catch (error) {
      Alert.alert('Google Sign-In', getErrorMessage(error));
    } finally {
      setOauthLoading(null);
    }
  };

  const onApple = async () => {
    try {
      setOauthLoading('apple');
      const user = await signInWithApple();
      if (user) {
        await hydrateAfterAuth(user);
      }
    } catch (error) {
      Alert.alert('Apple Sign-In', getErrorMessage(error));
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <Screen>
      <AuthBackToHomeBar />
      <ScrollView className="flex-1 px-5 pt-2" contentContainerClassName="pb-10" testID="screen-login">
        <SectionHeader
          title="Welcome back"
          subtitle="Sign in to save trips — or go back home to keep browsing as a guest"
        />

        {!env.isSupabaseConfigured ? (
          <Card className="mb-4">
            <AppText className="font-sans-semibold">Demo auth mode</AppText>
            <AppText muted className="mt-1">
              Supabase is not configured. Email/password will create a local demo session so you can
              complete onboarding.
            </AppText>
          </Card>
        ) : (
          <Card className="mb-4">
            <AppText muted>
              New accounts require email confirmation. After signing up, open the confirmation link,
              then sign in here.
            </AppText>
          </Card>
        )}

        <Card className="mb-4">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Email"
                autoComplete="email"
                keyboardType="email-address"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.email?.message}
                testID="login-email"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Password"
                secureTextEntry
                autoComplete="password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
                testID="login-password"
              />
            )}
          />
          <Button
            label="Sign in"
            loading={isSubmitting}
            onPress={onSubmit}
            testID="login-submit"
          />
        </Card>

        <View className="mb-4 gap-3">
          <Button
            label="Continue with Google"
            variant="secondary"
            loading={oauthLoading === 'google'}
            onPress={() => void onGoogle()}
            testID="login-google"
          />
          {Platform.OS === 'ios' ? (
            <Button
              label="Continue with Apple"
              variant="secondary"
              loading={oauthLoading === 'apple'}
              onPress={() => void onApple()}
              testID="login-apple"
            />
          ) : null}
          <Button
            label="Back to Home"
            variant="secondary"
            onPress={() => goToGuestHome(router)}
            testID="login-browse-guest"
          />
        </View>

        <View className="gap-3">
          <Button
            label="Use magic link"
            variant="ghost"
            onPress={() => router.push('/(auth)/magic-link')}
          />
          <Button
            label="Create an account"
            variant="ghost"
            onPress={() => router.push('/(auth)/signup')}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
