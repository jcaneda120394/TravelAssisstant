import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (mounted) {
          setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
        }
      } catch {
        if (mounted) {
          setIsOffline(false);
        }
      }
    };

    void check();
    const interval = setInterval(() => {
      void check();
    }, 15_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { isOffline };
}
