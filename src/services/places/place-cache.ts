import type { Place } from '@/types/domain';

const placeCache = new Map<string, Place>();

export function rememberPlace(place: Place): void {
  placeCache.set(place.id, place);
}

export function rememberPlaces(places: Place[]): void {
  places.forEach(rememberPlace);
}

export function recallPlace(placeId: string): Place | null {
  return placeCache.get(placeId) ?? null;
}
