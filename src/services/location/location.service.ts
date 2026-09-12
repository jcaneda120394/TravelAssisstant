import * as Location from 'expo-location';

import { fetchJson } from '@/lib/http/fetch-json';
import { useLocationStore } from '@/stores/location-store';
import type { GeoPoint } from '@/types/domain';
import { AppError, toAppError } from '@/lib/errors/app-error';
import type { DestinationSuggestion } from '@/services/geo/geocode.service';

const FALLBACK: GeoPoint = { latitude: 14.7943, longitude: 120.8799 }; // Malolos, Bulacan

type NominatimReverse = {
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

export async function requestForegroundLocation(): Promise<Location.PermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  useLocationStore.getState().setPermissionStatus(
    status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined',
  );
  return status;
}

async function labelFromCoords(coords: GeoPoint): Promise<{
  city: string | null;
  country: string | null;
  label: string;
}> {
  try {
    const places = await Location.reverseGeocodeAsync(coords);
    const first = places[0];
    if (first) {
      const city = first.city ?? first.subregion ?? first.region ?? null;
      const country = first.country ?? null;
      return {
        city,
        country,
        label: [city, country].filter(Boolean).join(', ') || 'Current location',
      };
    }
  } catch {
    // Fall through to Nominatim.
  }

  try {
    const reverse = await fetchJson<NominatimReverse>(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=12`,
      { timeoutMs: 10_000, cacheTtlMs: 10 * 60_000 },
    );
    const city =
      reverse.address?.city ||
      reverse.address?.town ||
      reverse.address?.village ||
      reverse.address?.municipality ||
      reverse.address?.county ||
      reverse.address?.state ||
      null;
    const country = reverse.address?.country ?? null;
    return {
      city,
      country,
      label: [city, country].filter(Boolean).join(', ') || reverse.display_name || 'Current location',
    };
  } catch {
    return {
      city: null,
      country: null,
      label: `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`,
    };
  }
}

/** Fresh GPS fix — ignores cached simulator/device location when possible. */
export async function getCurrentPosition(): Promise<GeoPoint> {
  try {
    const status = await requestForegroundLocation();
    if (status !== 'granted') {
      throw new AppError('Location permission is required for live positioning.', {
        code: 'LOCATION_DENIED',
      });
    }

    // Prefer a brand-new reading (important after changing Simulator → Location).
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    const labeled = await labelFromCoords(coords);

    useLocationStore.getState().setCurrentLocation({
      coords,
      city: labeled.city,
      country: labeled.country,
      label: labeled.label,
      mode: 'precise',
    });

    return coords;
  } catch (error) {
    throw toAppError(error, 'Unable to get current location');
  }
}

/** Pick a city/country from autocomplete (works when Simulator GPS is stuck on San Francisco). */
export async function setLocationFromSuggestion(
  suggestion: DestinationSuggestion,
): Promise<GeoPoint> {
  const coords = {
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
  };

  useLocationStore.getState().setManualLocation({
    coords,
    city: suggestion.shortName,
    country: suggestion.label.split(',').slice(-1)[0]?.trim() ?? null,
    label: suggestion.label,
  });

  return coords;
}

export async function clearSavedLocation(): Promise<void> {
  useLocationStore.getState().clearLocation();
}

export function useResolvedCoords(): GeoPoint {
  const coords = useLocationStore((state) => state.coords);
  return coords ?? FALLBACK;
}

export const DEFAULT_MAP_CENTER = FALLBACK;

/** Rough check for Apple Simulator default (San Francisco). */
export function looksLikeSanFrancisco(coords: GeoPoint | null | undefined): boolean {
  if (!coords) {
    return false;
  }
  return (
    Math.abs(coords.latitude - 37.7858) < 0.35 && Math.abs(coords.longitude + 122.4064) < 0.35
  );
}
