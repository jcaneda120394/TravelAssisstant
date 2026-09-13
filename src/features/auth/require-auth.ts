import { Platform } from 'react-native';

import { notifyAlert } from '@/lib/notify-alert';
import { useAuthStore } from '@/stores/auth-store';

type RouterLike = {
  push: (href: never) => void;
};

/**
 * Returns true when the user may continue a save/persist action.
 * Guests get a sign-up prompt and the action is blocked.
 */
export function requireAuthToSave(
  router: RouterLike,
  options?: { actionLabel?: string },
): boolean {
  if (useAuthStore.getState().user) {
    return true;
  }

  const action = options?.actionLabel ?? 'save this';
  const message = `Create an account or log in to ${action}. You can keep browsing places without signing in.`;

  if (Platform.OS === 'web') {
    const goLogin = window.confirm(`Sign in required\n\n${message}\n\nOK = Log in · Cancel = Not now`);
    if (goLogin) {
      router.push('/(auth)/login' as never);
    }
    return false;
  }

  notifyAlert('Sign in required', message, [
    { text: 'Not now', style: 'cancel' },
    {
      text: 'Log in',
      onPress: () => router.push('/(auth)/login' as never),
    },
    {
      text: 'Sign up',
      onPress: () => router.push('/(auth)/signup' as never),
    },
  ]);
  return false;
}

/** Alias for trip planner / My Trips / Create trip gates. */
export function requireAuthForTrips(
  router: RouterLike,
  actionLabel = 'create or view saved trips',
): boolean {
  return requireAuthToSave(router, { actionLabel });
}
