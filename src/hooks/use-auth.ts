import { useEffect } from 'react';

import {
  getCurrentSessionUser,
  subscribeToAuthChanges,
} from '@/services/auth/auth.service';
import {
  ensureProfile,
  fetchPreferences,
  fetchProfile,
} from '@/services/profile/profile.service';
import { useAuthStore } from '@/stores/auth-store';
import { analytics } from '@/lib/analytics';

async function hydrateForUser(userId: string, email: string | null, fullName: string | null) {
  const profile = await ensureProfile({ id: userId, email, fullName });
  const preferences = await fetchPreferences(userId);
  useAuthStore.getState().setProfile(profile);
  useAuthStore.getState().setPreferences(preferences);
  analytics.identify(userId, { email: email ?? undefined });
}

export function useAuthBootstrap() {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setHydrated = useAuthStore((state) => state.setHydrated);
  const reset = useAuthStore((state) => state.reset);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setLoading(true);
      try {
        const user = await getCurrentSessionUser();
        if (!active) {
          return;
        }
        setUser(user);
        if (user) {
          await hydrateForUser(user.id, user.email, user.fullName);
        } else {
          useAuthStore.getState().setProfile(null);
          useAuthStore.getState().setPreferences(null);
        }
      } catch (error) {
        console.warn('[auth] bootstrap failed', error);
        if (active) {
          reset();
        }
      } finally {
        if (active) {
          setLoading(false);
          setHydrated(true);
        }
      }
    };

    void bootstrap();

    const unsubscribe = subscribeToAuthChanges((user) => {
      void (async () => {
        setUser(user);
        if (user) {
          await hydrateForUser(user.id, user.email, user.fullName);
        } else {
          useAuthStore.getState().setProfile(null);
          useAuthStore.getState().setPreferences(null);
          analytics.reset();
        }
      })();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [reset, setHydrated, setLoading, setUser]);
}

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const preferences = useAuthStore((state) => state.preferences);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  return {
    user,
    profile,
    preferences,
    isLoading,
    isHydrated,
    isAuthenticated: Boolean(user),
    needsOnboarding: Boolean(user && profile && !profile.onboarding_completed),
  };
}

export async function refreshAuthProfile() {
  const user = useAuthStore.getState().user;
  if (!user) {
    return;
  }
  const profile = await fetchProfile(user.id);
  const preferences = await fetchPreferences(user.id);
  useAuthStore.getState().setProfile(profile);
  useAuthStore.getState().setPreferences(preferences);
}
