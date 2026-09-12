import { useRouter, useSegments } from 'expo-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { ActivityIndicator } from 'react-native';

import { Screen } from '@/components/ui/typography';
import { useAuth, useAuthBootstrap } from '@/hooks/use-auth';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { theme } from '@/config/theme';

/**
 * Route protection without render-time <Redirect />, which can loop when
 * Expo Router segments are still settling after auth state changes.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  useAuthBootstrap();
  const { isHydrated, isLoading, isAuthenticated, needsOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const scheme = useAppColorScheme();
  const lastTarget = useRef<string | null>(null);

  useEffect(() => {
    if (!isHydrated || isLoading) {
      return;
    }

    // Wait until the navigator has a real segment tree.
    if (!segments.length) {
      return;
    }

    const root = segments[0];
    const inAuth = root === '(auth)';
    const inOnboarding = root === '(onboarding)';

    let target: string | null = null;
    if (!isAuthenticated && !inAuth) {
      target = '/(auth)/login';
    } else if (isAuthenticated && needsOnboarding && !inOnboarding) {
      target = '/(onboarding)';
    } else if (isAuthenticated && !needsOnboarding && (inAuth || inOnboarding)) {
      target = '/(tabs)';
    }

    if (target && lastTarget.current !== target) {
      lastTarget.current = target;
      router.replace(target as never);
    }

    if (!target) {
      lastTarget.current = null;
    }
  }, [isAuthenticated, isHydrated, isLoading, needsOnboarding, router, segments]);

  if (!isHydrated || isLoading) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator color={theme[scheme].primary} size="large" />
      </Screen>
    );
  }

  return <>{children}</>;
}
