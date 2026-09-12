import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppMapStyleId } from '@/providers/maps/map-style';

type MapStyleState = {
  style: AppMapStyleId;
  /** Native traffic overlay (ignored on web Leaflet). */
  showTraffic: boolean;
  setStyle: (style: AppMapStyleId) => void;
  setShowTraffic: (showTraffic: boolean) => void;
};

export const useMapStyleStore = create<MapStyleState>()(
  persist(
    (set) => ({
      style: 'standard',
      showTraffic: false,
      setStyle: (style) => set({ style }),
      setShowTraffic: (showTraffic) => set({ showTraffic }),
    }),
    {
      name: 'travelassistant-map-style',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
