import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { fetchJson } from '@/lib/http/fetch-json';
import { useLocationStore } from '@/stores/location-store';
import type { GeoPoint } from '@/types/domain';
import { AppError, toAppError } from '@/lib/errors/app-error';
import type { DestinationSuggestion } from '@/services/geo/geocode.service';

/**
 * Neutral map center when no GPS/city is set yet (not applied as a user location).
 */
const FALLBACK: GeoPoint = { latitude: 14.5995, longitude: 120.9842 };

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
  name?: string;
  address?: {
    road?: string;
    neighbourhood?: string;
    quarter?: string;
    residential?: string;
    hamlet?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    region?: string;
    country?: string;
    country_code?: string;
  };
};

function cleanPlaceName(value?: string | null): string | null {
  if (!value?.trim()) return null;
  return value
    .replace(/\s+Subdivision\b/gi, '')
    .replace(/\s+Village\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniquePlaceParts(parts: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    if (out.some((existing) => existing.toLowerCase() === part.toLowerCase())) continue;
    out.push(part);
  }
  return out;
}

/**
 * Compact UI label: keep neighbourhood + city, not trailing country/region.
 * e.g. "Villa Belissa, San Jose del Monte, Bulacan, Philippines" → "Villa Belissa, San Jose del Monte"
 */
export function formatCompactLocationLabel(label: string | null | undefined): string | null {
  if (!label?.trim()) return null;
  const parts = uniquePlaceParts(label.split(',').map((part) => cleanPlaceName(part)));
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!;
  // Prefer the most specific local names from the front of a reverse-geocode label.
  return parts.slice(0, 2).join(', ');
}

export async function requestForegroundLocation(): Promise<Location.PermissionStatus> {
  // Web: ask the browser Permissions API when available, then let getCurrentPosition
  // trigger the real prompt. Expo's web permission helper often reports undetermined.
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    try {
      const perms = navigator.permissions;
      if (perms?.query) {
        const result = await perms.query({ name: 'geolocation' as PermissionName });
        if (result.state === 'denied') {
          useLocationStore.getState().setPermissionStatus('denied');
          return Location.PermissionStatus.DENIED;
        }
        if (result.state === 'granted') {
          useLocationStore.getState().setPermissionStatus('granted');
          return Location.PermissionStatus.GRANTED;
        }
      }
    } catch {
      // Permissions.query('geolocation') is unsupported in some browsers — continue.
    }
    // Prompt happens on the next getCurrentPosition call (must stay in user-gesture path).
    useLocationStore.getState().setPermissionStatus('undetermined');
    return Location.PermissionStatus.GRANTED;
  }

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
  // Zoom 18 keeps neighbourhood / subdivision names (e.g. Villa Belissa in SJDM).
  try {
    const reverse = await fetchJson<NominatimReverse>(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`,
      { timeoutMs: 10_000, cacheTtlMs: 60_000 },
    );
    const a = reverse.address;
    if (a) {
      const neighbourhood = cleanPlaceName(
        a.neighbourhood || a.quarter || a.residential || a.hamlet || reverse.name,
      );
      const suburb = cleanPlaceName(a.suburb || a.city_district || a.village);
      const city = cleanPlaceName(a.city || a.town || a.municipality || a.county);
      const state = cleanPlaceName(a.state);
      const country = a.country ?? null;
      const local = neighbourhood || suburb;
      const parts = uniquePlaceParts([local, city, state, country]);
      if (parts.length > 0) {
        return {
          city: city || local,
          country,
          label: parts.join(', '),
        };
      }
      if (reverse.display_name) {
        const fromDisplay = uniquePlaceParts(
          reverse.display_name.split(',').map((part) => cleanPlaceName(part)),
        ).slice(0, 4);
        return {
          city: city || local || fromDisplay[0] || null,
          country,
          label: fromDisplay.join(', '),
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
      const city = cleanPlaceName(
        first.district || first.city || first.subregion || first.region || first.name,
      );
      const country = first.country ?? null;
      const parts = uniquePlaceParts([
        cleanPlaceName(first.name),
        city,
        cleanPlaceName(first.region),
        country,
      ]);
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

/**
 * Legacy helper — no longer remaps SF automatically.
 * Precise GPS must keep real coordinates (including Simulator SF).
 */
export function replaceSimulatorSanFranciscoIfNeeded(): boolean {
  return false;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new AppError(message, { code: 'LOCATION_TIMEOUT' })), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/** Browser geolocation — Expo's Highest accuracy often hangs on web. */
async function readBrowserGeolocation(): Promise<GeoPoint> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new AppError('Geolocation is not available in this browser.', {
      code: 'LOCATION_UNAVAILABLE',
    });
  }

  const readOnce = (highAccuracy: boolean, timeoutMs: number, maximumAge: number) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge,
      });
    });

  try {
    // Fresh precise fix — never reuse a stale cached city-level estimate.
    const pos = await readOnce(true, 20_000, 0);
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch (err) {
    const geoErr = err as GeolocationPositionError | undefined;
    const denied = geoErr?.code === geoErr?.PERMISSION_DENIED;
    if (denied) {
      throw new AppError(
        'Location permission is off. Allow location for this site, or choose a city manually.',
        { code: 'LOCATION_DENIED' },
      );
    }
    // One fallback with a slightly older cache before failing.
    try {
      const pos = await readOnce(true, 12_000, 60_000);
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
    } catch {
      throw new AppError('Unable to read your GPS. Try again or choose a city manually.', {
        code: 'LOCATION_UNAVAILABLE',
        cause: err,
      });
    }
  }
}

async function readDevicePosition(): Promise<GeoPoint> {
  if (Platform.OS === 'web') {
    // Web must use the browser Geolocation API directly. Falling through to Expo
    // Location often hangs or returns a stale last-known fix after a denied prompt.
    return readBrowserGeolocation();
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      }),
      20_000,
      'GPS is taking too long. Try again, or choose a city manually.',
    );
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    // Last known fix is better than failing hard (simulator / weak GPS).
    try {
      const last = await Location.getLastKnownPositionAsync({
        maxAge: 2 * 60_000,
        requiredAccuracy: 200,
      });
      if (last?.coords) {
        return {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
        };
      }
    } catch {
      // ignore
    }
    throw error;
  }
}

/** Fresh GPS fix — uses precise coords + detailed reverse-geocode when permission is granted. */
export async function getCurrentPosition(): Promise<GeoPoint> {
  // Intentional GPS always wins over a prior manual city (Singapore quick-pick, etc.).
  // Capture epoch after bumping so in-flight older GPS / clear races still lose.
  useLocationStore.setState((state) => ({
    locationEpoch: state.locationEpoch + 1,
  }));
  const epoch = useLocationStore.getState().locationEpoch;
  try {
    const status = await requestForegroundLocation();
    if (status !== 'granted') {
      throw new AppError(
        'Location permission is off. Enable it in Settings, or choose a city manually.',
        { code: 'LOCATION_DENIED' },
      );
    }

    const coords = await readDevicePosition();

    if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
      throw new AppError('Unable to get current location', { code: 'LOCATION_UNAVAILABLE' });
    }

    // Don't block GPS success on slow reverse-geocode.
    let labeled: { city: string | null; country: string | null; label: string };
    try {
      labeled = await withTimeout(
        labelFromCoords(coords),
        8_000,
        'Location label timed out',
      );
    } catch {
      labeled = {
        city: null,
        country: null,
        label: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      };
    }

    // Traveler cleared location or picked a city while GPS was running — discard.
    if (useLocationStore.getState().locationEpoch !== epoch) {
      const latest = useLocationStore.getState().coords;
      if (latest) return latest;
      throw new AppError('Location was cleared. Tap Get my location again if you want GPS.', {
        code: 'LOCATION_CLEARED',
      });
    }

    useLocationStore.getState().setCurrentLocation({
      coords,
      city: labeled.city,
      country: labeled.country,
      label: labeled.label,
      mode: 'precise',
      epoch,
    });

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
