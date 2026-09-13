import AsyncStorage from '@react-native-async-storage/async-storage';

import { dbGet } from '@/lib/storage/local-db';
import type { Place, Route, Trip } from '@/types/domain';

const CACHE_PREFIX = 'travelassistant.offline.';

export async function cacheJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
    savedAt: new Date().toISOString(),
    value,
  }));
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

export async function buildOfflinePack(userId: string) {
  const trips = await dbGet<Trip[]>('trips', []);
  const userTrips = trips.filter((trip) => trip.ownerId === userId || trip.memberIds.includes(userId));
  const emergencyNumbers = {
    police: '110',
    ambulance: '119',
    fire: '119',
    note: 'Numbers are country-specific. Verify with official sources when abroad.',
  };

  const pack = {
    trips: userTrips,
    emergencyNumbers,
    currencyHint: 'Last FX rates cached by CurrencyProvider when used.',
    generatedAt: new Date().toISOString(),
  };

  await cacheJson(`pack:${userId}`, pack);
  return pack;
}

export async function cachePlaces(places: Place[]) {
  await cacheJson('places:nearby', places);
}

export async function cacheRoute(route: Route) {
  await cacheJson(`route:${route.id}`, route);
}
