import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchJson } from '@/lib/http/fetch-json';
import { useLocationStore } from '@/stores/location-store';
import type { GeoPoint } from '@/types/domain';
import { AppError, toAppError } from '@/lib/errors/app-error';
import type { DestinationSuggestion } from '@/services/geo/geocode.service';

/**
 * Optional quick-pick for travelers who want Bulacan as a planning base.
 * Not applied automatically — use "Use Malolos, Bulacan" in the location picker.
 */
export const HOME_LOCATION = {
  coords: { latitude: 14.8433, longitude: 120.8114 } satisfies GeoPoint,
  city: 'Malolos',
  country: 'Philippines',
  label: 'Malolos, Bulacan, Philippines',
} as const;

const FALLBACK: GeoPoint = HOME_LOCATION.coords;

/** When traveler picks a whole country, snap Discover to a major city so results aren't empty. */
const COUNTRY_HUBS: Record<string, { city: string; latitude: number; longitude: number }> = {
  vietnam: { city: 'Hanoi', latitude: 21.0285, longitude: 105.8542 },
  philippines: { city: 'Manila', latitude: 14.5995, longitude: 120.9842 },
  japan: { city: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
  thailand: { city: 'Bangkok', latitude: 13.7563, longitude: 100.5018 },
  'south korea': { city: 'Seoul', latitude: 37.5665, longitude: 126.978 },
  korea: { city: 'Seoul', latitude: 37.5665, longitude: 126.978 },
  singapore: { city: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
  'hong kong': { city: 'Hong Kong', latitude: 22.3193, longitude: 114.1694 },
  spain: { city: 'Madrid', latitude: 40.4168, longitude: -3.7038 },
  france: { city: 'Paris', latitude: 48.8566, longitude: 2.3522 },
  'united states': { city: 'New York', latitude: 40.7128, longitude: -74.006 },
  usa: { city: 'New York', latitude: 40.7128, longitude: -74.006 },
  'united kingdom': { city: 'London', latitude: 51.5074, longitude: -0.1278 },
  indonesia: { city: 'Jakarta', latitude: -6.2088, longitude: 106.8456 },
  malaysia: { city: 'Kuala Lumpur', latitude: 3.139, longitude: 101.6869 },
};

type NominatimReverse = {
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    suburb?: string;
    neighbourhood?: string;
    city_district?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
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
  // Prefer Nominatim at neighborhood zoom so we get city+district, not only country.
  try {
    const reverse = await fetchJson<NominatimReverse>(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=16&addressdetails=1`,
      { timeoutMs: 10_000, cacheTtlMs: 5 * 60_000 },
    );
    const a = reverse.address;
    if (a) {
      const locality =
        a.neighbourhood ||
        a.suburb ||
        a.city_district ||
        a.city ||
        a.town ||
        a.village ||
        a.municipality ||
        a.county ||
        a.state ||
        null;
      const city =
        a.city || a.town || a.village || a.municipality || a.county || a.state || locality;
      const country = a.country ?? null;
      const parts = [locality, city, a.state, country].filter(
        (part, index, arr): part is string =>
          Boolean(part) && arr.findIndex((p) => p?.toLowerCase() === part!.toLowerCase()) === index,
      );
      if (parts.length > 0) {
        return {
          city: city ?? locality,
          country,
          label: parts.join(', '),
        };
      }
      if (reverse.display_name) {
        return {
          city: city ?? locality,
          country,
          label: reverse.display_name.split(',').slice(0, 4).join(',').trim(),
        };
      }
    }
  } catch {
    // Fall through to Expo reverse geocode.
  }

  try {
    const places = await Location.reverseGeocodeAsync(coords);
    const first = places[0];
    if (first) {
      const city =
        first.district ||
        first.city ||
        first.subregion ||
        first.region ||
        first.name ||
        null;
      const country = first.country ?? null;
      const parts = [first.name, city, first.region, country].filter(
        (part, index, arr): part is string =>
          Boolean(part) && arr.findIndex((p) => p?.toLowerCase() === part!.toLowerCase()) === index,
      );
      return {
        city,
        country,
        label: parts.join(', ') || 'Current location',
      };
    }
  } catch {
    // Fall through.
  }

  return {
    city: null,
    country: null,
    label: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
  };
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
 * Legacy helper — no longer remaps SF → Malolos automatically.
 * Precise GPS must keep real coordinates (including Simulator SF).
 */
export function replaceSimulatorSanFranciscoIfNeeded(): boolean {
  return false;
}

/** Fresh GPS fix — uses precise coords + detailed reverse-geocode when permission is granted. */
export async function getCurrentPosition(): Promise<GeoPoint> {
  const epoch = useLocationStore.getState().locationEpoch;
  try {
    const status = await requestForegroundLocation();
    if (status !== 'granted') {
      throw new AppError(
        'Location permission is off. Enable it in Settings, or choose a city manually.',
        { code: 'LOCATION_DENIED' },
      );
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
      mayShowUserSettingsDialog: true,
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
      epoch,
    });

    // If the traveler cleared location while GPS was running, discard this write.
    if (useLocationStore.getState().locationEpoch !== epoch) {
      throw new AppError('Location was cleared. Tap Get my location again if you want GPS.', {
        code: 'LOCATION_CLEARED',
      });
    }

    return coords;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toAppError(error, 'Unable to get current location');
  }
}

/** Pick a city/country from autocomplete. */
export async function setLocationFromSuggestion(
  suggestion: DestinationSuggestion,
): Promise<GeoPoint> {
  let latitude = Number(suggestion.latitude);
  let longitude = Number(suggestion.longitude);
  let city = suggestion.shortName;
  let label = suggestion.label;
  let country = suggestion.label.split(',').slice(-1)[0]?.trim() ?? null;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new AppError('That place is missing coordinates. Try another result.', {
      code: 'INVALID_COORDS',
    });
  }

  // Country-only picks → hub city so Home Discover isn't empty in the middle of nowhere.
  if (suggestion.kind === 'country') {
    const hub =
      COUNTRY_HUBS[suggestion.shortName.toLowerCase()] ||
      COUNTRY_HUBS[(country ?? '').toLowerCase()] ||
      COUNTRY_HUBS[suggestion.label.toLowerCase()];
    if (hub) {
      latitude = hub.latitude;
      longitude = hub.longitude;
      city = hub.city;
      country = suggestion.shortName || country;
      label = `${hub.city}, ${country}`;
    }
  }

  const coords = { latitude, longitude };

  useLocationStore.getState().setManualLocation({
    coords,
    city,
    country,
    label,
  });

  return coords;
}

export async function clearSavedLocation(): Promise<void> {
  useLocationStore.getState().clearLocation();
  const state = useLocationStore.getState();
  // Force AsyncStorage so a later rehydrate cannot revive the old city.
  await AsyncStorage.setItem(
    'travelassistant-location',
    JSON.stringify({
      state: {
        mode: 'none',
        permissionStatus: state.permissionStatus,
        coords: null,
        city: null,
        country: null,
        label: null,
      },
      version: 0,
    }),
  );
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
