import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GeoPoint } from '@/types/domain';

export type LocationMode = 'none' | 'approximate' | 'precise' | 'manual';

type LocationState = {
  hasHydrated: boolean;
  mode: LocationMode;
  permissionStatus: 'unknown' | 'granted' | 'denied' | 'undetermined';
  coords: GeoPoint | null;
  city: string | null;
  country: string | null;
  label: string | null;
  setHasHydrated: (value: boolean) => void;
  setPermissionStatus: (status: LocationState['permissionStatus']) => void;
  setCurrentLocation: (payload: {
    coords: GeoPoint;
    city?: string | null;
    country?: string | null;
    label?: string | null;
    mode?: LocationMode;
  }) => void;
  setManualLocation: (payload: {
    coords: GeoPoint;
    city?: string | null;
    country?: string | null;
    label: string;
  }) => void;
  clearLocation: () => void;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      mode: 'none',
      permissionStatus: 'unknown',
      coords: null,
      city: null,
      country: null,
      label: null,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setPermissionStatus: (permissionStatus) => set({ permissionStatus }),
      setCurrentLocation: ({ coords, city = null, country = null, label = null, mode = 'precise' }) =>
        set({ coords, city, country, label, mode }),
      setManualLocation: ({ coords, city = null, country = null, label }) =>
        set({ coords, city, country, label, mode: 'manual' }),
      clearLocation: () =>
        set({
          mode: 'none',
          coords: null,
          city: null,
          country: null,
          label: null,
        }),
    }),
    {
      name: 'travelassistant-location',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        mode: state.mode === 'precise' ? 'approximate' : state.mode,
        permissionStatus: state.permissionStatus,
        coords: state.coords,
        city: state.city,
        country: state.country,
        label: state.label,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
