import { Redirect, useSegments } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/components/ui/typography';
import { useAuth, useAuthBootstrap } from '@/hooks/use-auth';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { theme } from '@/config/theme';

export function AuthGate({ children }: { children: ReactNode }) {
  useAuthBootstrap();
  const { isHydrated, isLoading, isAuthenticated, needsOnboarding } = useAuth();
  const segments = useSegments();
  const scheme = useAppColorScheme();

  if (!isHydrated || isLoading) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator color={theme[scheme].primary} size="large" />
      </Screen>
    );
  }

  const root = segments[0];
  const inAuth = root === '(auth)';
  const inOnboarding = root === '(onboarding)';

  if (!isAuthenticated && !inAuth) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isAuthenticated && needsOnboarding && !inOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  if (isAuthenticated && !needsOnboarding && (inAuth || inOnboarding)) {
    return <Redirect href="/(tabs)" />;
  }

  return <>{children}</>;
}
