import { usePathname, useRouter, useSegments } from 'expo-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { ActivityIndicator } from 'react-native';

import { AppText, Screen } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { theme } from '@/config/theme';
import { useAuth } from '@/hooks/use-auth';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { signOut } from '@/services/auth/auth.service';
import { useAuthStore } from '@/stores/auth-store';

const NAV = [
  { href: '/admin', label: 'Overview', match: 'index' },
  { href: '/admin/users', label: 'Users', match: 'users' },
  { href: '/admin/trips', label: 'Trips', match: 'trips' },
  { href: '/admin/spots', label: 'Travel spots', match: 'spots' },
] as const;

function isActive(pathname: string, match: string) {
  if (match === 'index') {
    return pathname === '/admin' || pathname.endsWith('/admin/');
  }
  return pathname.includes(`/admin/${match}`);
}

/**
 * Protects /admin routes: must be signed in with profiles.role = admin.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  // Auth bootstrap lives only in AuthGate — calling it here remounts the root
  // Stack on every /admin visit (setLoading → AuthGate spinner → unmount loop).
  const { isHydrated, isLoading, isAuthenticated, isAdmin } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const scheme = useAppColorScheme();
  const lastTarget = useRef<string | null>(null);

  const inLogin =
    (segments as string[]).includes('login') || pathname.includes('/admin/login');

  useEffect(() => {
    if (!isHydrated || isLoading) {
      return;
    }

    let target: string | null = null;
    if (!isAuthenticated && !inLogin) {
      target = '/admin/login';
    } else if (isAuthenticated && !isAdmin && !inLogin) {
      target = '/admin/login';
    } else if (isAuthenticated && isAdmin && inLogin) {
      target = '/admin';
    }

    if (target && lastTarget.current !== target) {
      lastTarget.current = target;
      router.replace(target as never);
    }
    if (!target) {
      lastTarget.current = null;
    }
  }, [isAdmin, isAuthenticated, isHydrated, isLoading, inLogin, router]);

  if (!isHydrated || isLoading) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator color={theme[scheme].primary} size="large" />
      </Screen>
    );
  }

  if (inLogin) {
    return <>{children}</>;
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <Screen className="items-center justify-center px-6">
        <AppText className="font-display-bold text-2xl">Admin access required</AppText>
        <AppText muted className="mt-2 text-center">
          Sign in with an administrator account to continue.
        </AppText>
        <Pressable
          className="mt-6 rounded-2xl bg-brand-600 px-5 py-3"
          onPress={() => router.replace('/admin/login')}
        >
          <AppText inverse className="font-sans-semibold">
            Go to admin login
          </AppText>
        </Pressable>
      </Screen>
    );
  }

  return (
    <View className="h-full flex-1 flex-row" testID="admin-shell">
      <View
        className={`h-full border-r px-3 py-6 ${
          scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-black/8 bg-white'
        }`}
        style={{ width: 220 }}
      >
        <AppText className="px-2 font-sans-semibold text-xs uppercase tracking-[0.16em] text-accent-500">
          Admin
        </AppText>
        <AppText className="mt-1 px-2 font-display-bold text-xl">Dashboard</AppText>
        <View className="mt-6 gap-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.match);
            return (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href as never)}
                className={`rounded-2xl px-3 py-3 ${active ? 'bg-brand-600' : ''}`}
              >
                <AppText inverse={active} className="font-sans-semibold">
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <View className="mt-auto gap-2 px-1 pb-2">
          <Pressable
            className="rounded-2xl border border-brand-200 px-3 py-3 dark:border-brand-800"
            onPress={() => router.push('/(tabs)')}
          >
            <AppText className="font-sans-semibold text-sm">Back to app</AppText>
          </Pressable>
          <Pressable
            className="rounded-2xl bg-accent-500 px-3 py-3"
            onPress={async () => {
              await signOut().catch(() => undefined);
              useAuthStore.getState().reset();
              router.replace('/admin/login');
            }}
          >
            <AppText inverse className="font-sans-semibold text-sm">
              Sign out
            </AppText>
          </Pressable>
        </View>
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
}
