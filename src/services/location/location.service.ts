import * as Location from 'expo-location';

import { useLocationStore } from '@/stores/location-store';
import type { GeoPoint } from '@/types/domain';
import { AppError, toAppError } from '@/lib/errors/app-error';

const FALLBACK: GeoPoint = { latitude: 35.6595, longitude: 139.7005 };

export async function requestForegroundLocation(): Promise<Location.PermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  useLocationStore.getState().setPermissionStatus(
    status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
  );
  return status;
}

export async function getCurrentPosition(): Promise<GeoPoint> {
  try {
    const status = await requestForegroundLocation();
    if (status !== 'granted') {
      throw new AppError('Location permission is required for live positioning.', {
        code: 'LOCATION_DENIED',
      });
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    let city: string | null = null;
    let country: string | null = null;
    let label: string | null = 'Current location';

    try {
      const places = await Location.reverseGeocodeAsync(coords);
      const first = places[0];
      if (first) {
        city = first.city ?? first.subregion ?? first.region ?? null;
        country = first.country ?? null;
        label = [city, country].filter(Boolean).join(', ') || label;
      }
    } catch {
      // Reverse geocode is optional.
    }

    useLocationStore.getState().setCurrentLocation({
      coords,
      city,
      country,
      label,
      mode: 'precise',
    });

    return coords;
  } catch (error) {
    throw toAppError(error, 'Unable to get current location');
  }
}

export function useResolvedCoords(): GeoPoint {
  const coords = useLocationStore((state) => state.coords);
  return coords ?? FALLBACK;
}

export const DEFAULT_MAP_CENTER = FALLBACK;
