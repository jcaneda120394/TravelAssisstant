import type { Place } from '@/types/domain';

/**
 * Drop duplicate places for list UIs.
 * Prefer unique `id` (same OSM/Google node must appear once), then name+geo.
 */
export function dedupePlaces(places: Place[]): Place[] {
  const seenIds = new Set<string>();
  const seenGeo = new Set<string>();

  return places.filter((place) => {
    const name = place.name?.toLowerCase().trim() ?? '';
    if (!name) return false;

    const id = place.id?.trim();
    if (id) {
      if (seenIds.has(id)) return false;
      seenIds.add(id);
    }

    const key = `${name}|${place.latitude.toFixed(4)}|${place.longitude.toFixed(4)}`;
    if (seenGeo.has(key)) return false;
    seenGeo.add(key);
    return true;
  });
}
