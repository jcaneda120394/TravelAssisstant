import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getCurrentPosition,
} from '@/services/location/location.service';
import { useLocationStore } from '@/stores/location-store';
import { getErrorMessage } from '@/lib/errors/app-error';

type LocateStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'error';

/**
 * Asks for location permission and refreshes current coordinates.
 * Manual city picks are kept; otherwise GPS is refreshed on mount.
 */
export function useEnsureLocation(options?: { auto?: boolean; refresh?: boolean }) {
  const auto = options?.auto ?? true;
  const refresh = options?.refresh ?? true;
  const hasHydrated = useLocationStore((state) => state.hasHydrated);
  const coords = useLocationStore((state) => state.coords);
  const label = useLocationStore((state) => state.label);
  const city = useLocationStore((state) => state.city);
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
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      const denied = /denied|permission/i.test(message);
      setError(message);
      setStatus(denied ? 'denied' : 'error');
      return false;
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
    } else if (mode === 'none') {
      setStatus('idle');
    }
  }, [coords, mode]);

  useEffect(() => {
    if (!auto || !hasHydrated || didAutoAsk.current) {
      return;
    }
    didAutoAsk.current = true;

    const state = useLocationStore.getState();
    // Keep any saved city/GPS fix. Auto-refresh was overwriting Change city picks
    // and freezing mobile web while geolocation + the picker ran together.
    if (state.coords) {
      setStatus('ready');
      return;
    }
    if (state.mode === 'none') {
      setStatus('idle');
      return;
    }
    if (refresh) {
      void locate();
      return;
    }
    setStatus('idle');
  }, [auto, hasHydrated, locate, refresh]);

  return {
    coords,
    label,
    city,
    country,
    mode,
    permissionStatus,
    status,
    error,
    hasHydrated,
    hasLocation: Boolean(coords),
    locate,
    // Only spin while an explicit GPS request is in flight — not during store hydration.
    isLocating: status === 'loading',
  };
}
