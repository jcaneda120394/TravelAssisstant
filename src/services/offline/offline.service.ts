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
