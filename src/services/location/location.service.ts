import * as Location from 'expo-location';

import { fetchJson } from '@/lib/http/fetch-json';
import { useLocationStore } from '@/stores/location-store';
import type { GeoPoint } from '@/types/domain';
import { AppError, toAppError } from '@/lib/errors/app-error';
import type { DestinationSuggestion } from '@/services/geo/geocode.service';

/** Default travel area when Simulator GPS is Apple’s San Francisco stub. */
export const HOME_LOCATION = {
  coords: { latitude: 14.8433, longitude: 120.8114 } satisfies GeoPoint,
  city: 'Malolos',
  country: 'Philippines',
  label: 'Malolos, Bulacan, Philippines',
} as const;

const FALLBACK: GeoPoint = HOME_LOCATION.coords;

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

/** Apply Malolos / Bulacan as the active planning location. */
export async function applyHomeLocation(): Promise<GeoPoint> {
  useLocationStore.getState().setManualLocation({
    coords: HOME_LOCATION.coords,
    city: HOME_LOCATION.city,
    country: HOME_LOCATION.country,
    label: HOME_LOCATION.label,
  });
  return HOME_LOCATION.coords;
}

/**
 * If the store still has Apple Simulator’s San Francisco stub, replace it with Bulacan.
 * Safe to call after hydration.
 */
export function replaceSimulatorSanFranciscoIfNeeded(): boolean {
  const state = useLocationStore.getState();
  if (!looksLikeSanFrancisco(state.coords)) {
    return false;
  }
  state.setManualLocation({
    coords: HOME_LOCATION.coords,
    city: HOME_LOCATION.city,
    country: HOME_LOCATION.country,
    label: HOME_LOCATION.label,
  });
  return true;
}

/** Fresh GPS fix — Simulator SF is remapped to Bulacan so the app matches your area. */
export async function getCurrentPosition(): Promise<GeoPoint> {
  try {
    const status = await requestForegroundLocation();
    if (status !== 'granted') {
      // No GPS permission — still give a usable PH location instead of leaving the app empty.
      await applyHomeLocation();
      return HOME_LOCATION.coords;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    let coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    // Apple Simulator default (and many Expo Go stubs) sit in downtown SF.
    if (looksLikeSanFrancisco(coords)) {
      await applyHomeLocation();
      return HOME_LOCATION.coords;
    }

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
    // Last resort: Bulacan so Explore / AI still work offline of GPS.
    try {
      await applyHomeLocation();
      return HOME_LOCATION.coords;
    } catch {
      throw toAppError(error, 'Unable to get current location');
    }
  }
}

/** Pick a city/country from autocomplete. */
export async function setLocationFromSuggestion(
  suggestion: DestinationSuggestion,
): Promise<GeoPoint> {
  const latitude = Number(suggestion.latitude);
  const longitude = Number(suggestion.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new AppError('That place is missing coordinates. Try another result.', {
      code: 'INVALID_COORDS',
    });
  }

  const coords = { latitude, longitude };

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
