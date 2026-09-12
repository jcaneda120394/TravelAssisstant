import { useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { updateHomeCurrency } from '@/services/profile/profile.service';
import {
  useCurrencyStore,
  type AppCurrency,
} from '@/stores/currency-store';
import { useAuthStore } from '@/stores/auth-store';

/**
 * App-wide display currency for prices (hotels, restaurants, attractions).
 * Persists for guests; syncs to user preferences when signed in.
 */
export function useDisplayCurrency() {
  const currency = useCurrencyStore((state) => state.currency);
  const setStoreCurrency = useCurrencyStore((state) => state.setCurrency);
  const { user, preferences } = useAuth();
  const budgetTier = preferences?.budget_tier ?? null;

  const setCurrency = useCallback(
    async (next: AppCurrency) => {
      setStoreCurrency(next);
      if (!user?.id) return;
      try {
        const updated = await updateHomeCurrency(user.id, next);
        useAuthStore.getState().setPreferences(updated);
      } catch {
        // Local display currency still applies even if cloud sync fails.
      }
    },
    [setStoreCurrency, user?.id],
  );

  return {
    currency,
    budgetTier,
    setCurrency,
  };
}
