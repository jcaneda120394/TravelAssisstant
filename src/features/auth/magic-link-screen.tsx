import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import { z } from 'zod';

import { ResponsiveScrollView } from '@/components/layout/responsive-scroll-view';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { AuthBackToHomeBar } from '@/features/auth/auth-back-to-home';
import { getErrorMessage } from '@/lib/errors/app-error';
import { sendMagicLink } from '@/services/auth/auth.service';
import { magicLinkSchema } from '@/types/auth';

type FormValues = z.infer<typeof magicLinkSchema>;

export function MagicLinkScreen() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await sendMagicLink(values.email);
      setSent(true);
      Alert.alert('Magic link sent', 'Check your email and open the link on this device.');
    } catch (error) {
      Alert.alert('Magic link', getErrorMessage(error));
    }
  });

  return (
    <Screen>
      <AuthBackToHomeBar />
      <ResponsiveScrollView
        pad="keyboard"
        className="flex-1 px-5 pt-2"
        testID="screen-magic-link"
      >
        <SectionHeader
          eyebrow="TravelAssistant"
          title="Magic link"
          subtitle="Passwordless sign-in via email"
        />

        <Card className="mb-4">
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
                testID="magic-email"
              />
            )}
          />
          <Button
            label={sent ? 'Resend magic link' : 'Send magic link'}
            loading={isSubmitting}
            onPress={onSubmit}
            testID="magic-submit"
          />
          {sent ? (
            <AppText muted className="mt-3">
              Open the email on this device so the redirect returns to TravelAssistant.
            </AppText>
          ) : null}
        </Card>

        <View className="gap-2">
          <Button label="Back to sign in" variant="ghost" onPress={() => router.push('/(auth)/login')} />
        </View>
      </ResponsiveScrollView>
    </Screen>
  );
}
