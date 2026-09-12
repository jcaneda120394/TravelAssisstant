import { useCallback, useEffect, useRef, useState } from 'react';

import { getCurrentPosition } from '@/services/location/location.service';
import { useLocationStore } from '@/stores/location-store';
import { getErrorMessage } from '@/lib/errors/app-error';

type LocateStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'error';

/**
 * Asks for location permission and refreshes current coordinates.
 * Waits for persisted location hydration before auto-asking.
 */
export function useEnsureLocation(options?: { auto?: boolean }) {
  const auto = options?.auto ?? true;
  const hasHydrated = useLocationStore((state) => state.hasHydrated);
  const coords = useLocationStore((state) => state.coords);
  const label = useLocationStore((state) => state.label);
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
    // Always refresh GPS once after hydration so stale saved cities (e.g. SF)
    // don't keep the map stuck away from the device.
    void locate();
  }, [auto, hasHydrated, locate]);

  return {
    coords,
    label,
    permissionStatus,
    status,
    error,
    hasHydrated,
    hasLocation: Boolean(coords),
    locate,
    isLocating: status === 'loading' || !hasHydrated,
  };
}
