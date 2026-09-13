import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GeoPoint } from '@/types/domain';

export type LocationMode = 'none' | 'approximate' | 'precise' | 'manual';

type LocationState = {
  hasHydrated: boolean;
  /** Bumps on clear so in-flight GPS writes are ignored. */
  locationEpoch: number;
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
    epoch?: number;
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
    (set, get) => ({
      hasHydrated: false,
      locationEpoch: 0,
      mode: 'none',
      permissionStatus: 'unknown',
      coords: null,
      city: null,
      country: null,
      label: null,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setPermissionStatus: (permissionStatus) => set({ permissionStatus }),
      setCurrentLocation: ({
        coords,
        city = null,
        country = null,
        label = null,
        mode = 'precise',
        epoch,
      }) => {
        if (epoch != null && epoch !== get().locationEpoch) {
          return;
        }
        // A city pick while GPS was running wins — never clobber manual.
        if (mode !== 'manual' && get().mode === 'manual' && epoch != null) {
          return;
        }
        set({ coords, city, country, label, mode });
      },
      setManualLocation: ({ coords, city = null, country = null, label }) =>
        set((state) => ({
          // Invalidate in-flight GPS writes so Change city always sticks.
          locationEpoch: state.locationEpoch + 1,
          coords,
          city,
          country,
          label,
          mode: 'manual',
        })),
      clearLocation: () =>
        set((state) => ({
          locationEpoch: state.locationEpoch + 1,
          mode: 'none',
          coords: null,
          city: null,
          country: null,
          label: null,
        })),
    }),
    {
      name: 'travelassistant-location',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Keep precise so the UI can show neighbourhood-level labels after reload.
        mode: state.mode,
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
