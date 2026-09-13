import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import { z } from 'zod';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { env } from '@/config/env';
import { AuthBackToHomeBar, goToGuestHome } from '@/features/auth/auth-back-to-home';
import { getErrorMessage } from '@/lib/errors/app-error';
import { signUpWithEmail } from '@/services/auth/auth.service';
import { ensureProfile, fetchPreferences } from '@/services/profile/profile.service';
import { useAuthStore } from '@/stores/auth-store';
import { signupSchema } from '@/types/auth';

type FormValues = z.infer<typeof signupSchema>;

export function SignupScreen() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { user, sessionCreated } = await signUpWithEmail({
        email: values.email,
        password: values.password,
        fullName: values.full_name,
      });

      // Email confirmation is enabled: auth user exists, but there is no JWT yet.
      // Creating/reading profile requires a session (RLS), so wait until sign-in.
      if (!sessionCreated) {
        Alert.alert(
          'Confirm your email',
          'We created your account. Check your inbox for a confirmation link, then sign in. Your profile will be created automatically on first sign-in.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
        );
        return;
      }

      useAuthStore.getState().setUser(user);
      const profile = await ensureProfile(user);
      const preferences = await fetchPreferences(user.id);
      useAuthStore.getState().setProfile(profile);
      useAuthStore.getState().setPreferences(preferences);

      if (profile && !profile.onboarding_completed) {
        router.replace('/(onboarding)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Sign up failed', getErrorMessage(error));
    }
  });

  return (
    <Screen>
      <AuthBackToHomeBar />
      <ScrollView className="flex-1 px-5 pt-2" contentContainerClassName="pb-10" testID="screen-signup">
        <SectionHeader
          eyebrow="TravelAssistant"
          title="Create account"
          subtitle="Save trips, preferences, and your AI travel context"
        />

        <Card className="mb-4">
          <Controller
            control={control}
            name="full_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Full name"
                autoCapitalize="words"
                autoComplete="name"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.full_name?.message}
                testID="signup-name"
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Email"
                keyboardType="email-address"
                autoComplete="email"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.email?.message}
                testID="signup-email"
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
                autoComplete="new-password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
                testID="signup-password"
              />
            )}
          />
          <Button
            label="Create account"
            loading={isSubmitting}
            onPress={onSubmit}
            testID="signup-submit"
          />
        </Card>

        <View className="gap-2">
          <Button
            label="Back to Home"
            variant="secondary"
            onPress={() => goToGuestHome(router)}
          />
          <AppText muted className="text-center">
            Already have an account?
          </AppText>
          <Button label="Sign in" variant="ghost" onPress={() => router.push('/(auth)/login')} />
        </View>
      </ScrollView>
    </Screen>
  );
}
