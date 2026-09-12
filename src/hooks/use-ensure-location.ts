import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getCurrentPosition,
  replaceSimulatorSanFranciscoIfNeeded,
} from '@/services/location/location.service';
import { useLocationStore } from '@/stores/location-store';
import { getErrorMessage } from '@/lib/errors/app-error';

type LocateStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'error';

/**
 * Asks for location permission and refreshes current coordinates.
 * Remaps Apple Simulator San Francisco → Malolos, Bulacan automatically.
 *
 * By default, every mount refreshes GPS (unless the traveler set a manual city),
 * so maps always show the actual “where am I” position.
 */
export function useEnsureLocation(options?: { auto?: boolean; refresh?: boolean }) {
  const auto = options?.auto ?? true;
  const refresh = options?.refresh ?? true;
  const hasHydrated = useLocationStore((state) => state.hasHydrated);
  const coords = useLocationStore((state) => state.coords);
  const label = useLocationStore((state) => state.label);
  const country = useLocationStore((state) => state.country);
  const mode = useLocationStore((state) => state.mode);
  const permissionStatus = useLocationStore((state) => state.permissionStatus);
  const [status, setStatus] = useState<LocateStatus>(coords ? 'ready' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const didAutoAsk = useRef(false);

  const locate = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      await getCurrentPosition();
      setStatus('ready');
    } catch (err) {
      const message = getErrorMessage(err);
      const denied = /denied|permission/i.test(message);
      setError(message);
      setStatus(denied ? 'denied' : 'error');
    }
  }, []);

  useEffect(() => {
    if (useLocationStore.persist.hasHydrated()) {
      useLocationStore.getState().setHasHydrated(true);
    }
    const unsub = useLocationStore.persist.onFinishHydration(() => {
      useLocationStore.getState().setHasHydrated(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (coords) {
      setStatus('ready');
    }
  }, [coords]);

  useEffect(() => {
    if (!auto || !hasHydrated || didAutoAsk.current) {
      return;
    }
    didAutoAsk.current = true;

    // Wipe any persisted Simulator SF stub immediately after hydration.
    if (replaceSimulatorSanFranciscoIfNeeded()) {
      setStatus('ready');
    }

    const state = useLocationStore.getState();
    if (state.mode === 'manual' && state.coords) {
      setStatus('ready');
      return;
    }

    // Always refresh GPS so maps reflect the traveler's actual position.
    if (refresh || !state.coords) {
      void locate();
      return;
    }

    setStatus('ready');
  }, [auto, hasHydrated, locate, refresh]);

  return {
    coords,
    label,
    country,
    mode,
    permissionStatus,
    status,
    error,
    hasHydrated,
    hasLocation: Boolean(coords),
    locate,
    isLocating: status === 'loading' || !hasHydrated,
  };
}
