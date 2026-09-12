import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isFxCurrencyCode } from '@/constants/fx-currencies';

/** ISO 4217 code used for display prices across the app. */
export type AppCurrency = string;

type CurrencyState = {
  currency: AppCurrency;
  setCurrency: (currency: AppCurrency) => void;
};

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: 'PHP',
      setCurrency: (currency) => set({ currency: currency.toUpperCase() }),
    }),
    {
      name: 'travelassistant-display-currency',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Call after preferences load so signed-in users keep their saved currency. */
export function syncDisplayCurrencyFromPreferences(homeCurrency?: string | null) {
  if (!homeCurrency) return;
  if (isFxCurrencyCode(homeCurrency)) {
    useCurrencyStore.getState().setCurrency(homeCurrency.toUpperCase());
  }
}
