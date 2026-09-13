import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  countryCodeFromName,
  getEmergencyNumbers,
  type EmergencyNumbers,
} from '@/services/emergency/emergency.service';
import { listItinerary } from '@/services/itinerary/itinerary.service';
import { listTrips } from '@/services/trips/trips.service';
import type { ItineraryItem, Place, Route, Trip } from '@/types/domain';

const CACHE_PREFIX = 'travelassistant.offline.';

export type OfflinePack = {
  trips: Trip[];
  itineraryByTripId: Record<string, ItineraryItem[]>;
  emergencyNumbers: EmergencyNumbers;
  currencyHint: string;
  generatedAt: string;
  tripCount: number;
  stopCount: number;
};

export async function cacheJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(
    CACHE_PREFIX + key,
    JSON.stringify({
      savedAt: new Date().toISOString(),
      value,
    }),
  );
}

export async function readCache<T>(key: string): Promise<{ savedAt: string; value: T } | null> {
  const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as { savedAt: string; value: T };
}

const PRIVATE_PREFIXES = [
  CACHE_PREFIX,
  'travelassistant.db.',
  'travelassistant.local.',
  'travelassistant.auth.',
];

const PRIVATE_SUBSTRINGS = [
  'pack:',
  'trips',
  'trip_members',
  'profile',
  'preferences',
  'route:',
  'places:',
  'itinerary',
  'expenses',
  'budgets',
  'session',
];

/** Removes cached private trip/profile data. Call on logout and account deletion. */
export async function clearPrivateOfflineData(userId?: string): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const privateKeys = keys.filter((key) => {
    const underPrivateNs = PRIVATE_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (!underPrivateNs && !(userId && key.includes(userId))) {
      return false;
    }
    if (userId && key.includes(userId)) return true;
    return PRIVATE_SUBSTRINGS.some((part) => key.includes(part));
  });
  if (privateKeys.length) {
    await AsyncStorage.multiRemove(privateKeys);
  }
}

function resolveCountryCode(input?: {
  homeCountry?: string | null;
  locationLabel?: string | null;
}): string {
  const fromHome = countryCodeFromName(input?.homeCountry);
  if (fromHome) return fromHome;
  const fromLocation = countryCodeFromName(input?.locationLabel);
  if (fromLocation) return fromLocation;
  // Fallback: last segment of "City, Country"
  const parts = (input?.locationLabel ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const tail = parts[parts.length - 1];
  return countryCodeFromName(tail) ?? 'DEFAULT';
}

/**
 * Builds a local offline pack from the user’s real trips (cloud or local),
 * plus itinerary stops and country-aware emergency numbers.
 */
export async function buildOfflinePack(
  userId: string,
  options?: { homeCountry?: string | null; locationLabel?: string | null },
): Promise<OfflinePack> {
  const trips = await listTrips(userId);
  const itineraryByTripId: Record<string, ItineraryItem[]> = {};
  let stopCount = 0;

  // Cap concurrent fetches so large trip lists stay friendly on device.
  const concurrency = 4;
  let index = 0;
  async function worker() {
    while (index < trips.length) {
      const current = index;
      index += 1;
      const trip = trips[current]!;
      try {
        const items = await listItinerary(trip.id);
        itineraryByTripId[trip.id] = items;
        stopCount += items.length;
        await cacheJson(`itinerary:${userId}:${trip.id}`, items);
      } catch {
        itineraryByTripId[trip.id] = [];
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(trips.length, 1)) }, () => worker()),
  );

  const countryCode = resolveCountryCode(options);
  const emergencyNumbers = getEmergencyNumbers(countryCode);

  const pack: OfflinePack = {
    trips,
    itineraryByTripId,
    emergencyNumbers,
    currencyHint: 'Last FX rates cached by CurrencyProvider when used.',
    generatedAt: new Date().toISOString(),
    tripCount: trips.length,
    stopCount,
  };

  await cacheJson(`pack:${userId}`, pack);
  await cacheJson(`trips:${userId}`, trips);
  await cacheJson(`emergency:${userId}`, emergencyNumbers);
  return pack;
}

export async function cachePlaces(places: Place[]) {
  await cacheJson('places:nearby', places);
}

export async function cacheRoute(route: Route) {
  await cacheJson(`route:${route.id}`, route);
}
