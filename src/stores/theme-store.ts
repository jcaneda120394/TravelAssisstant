import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeState = {
  preference: ThemePreference;
  /** When true, brand colors follow the selected travel location’s country theme. */
  followCountryTheme: boolean;
  setPreference: (preference: ThemePreference) => void;
  setFollowCountryTheme: (follow: boolean) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      followCountryTheme: true,
      setPreference: (preference) => set({ preference }),
      setFollowCountryTheme: (followCountryTheme) => set({ followCountryTheme }),
    }),
    {
      name: 'travelassistant-theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
