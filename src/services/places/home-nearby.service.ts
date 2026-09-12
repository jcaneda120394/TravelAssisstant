import { providers } from '@/providers/registry';
import { searchCatalogNearby, searchPhotonNearby } from '@/services/places/photon-nearby.service';
import { rememberPlaces } from '@/services/places/place-cache';
import type { GeoPoint, Place } from '@/types/domain';
import type { CompanionPrefs } from '@/utils/companion-suitability';
import { applyCompanionFilter, companionFilterActive } from '@/utils/companion-suitability';
import { topPopularPlaces } from '@/utils/place-popularity';

const DEFAULT_LIMIT = 15;
const LIVE_BUDGET_MS = 5_000;

function delay(ms: number): Promise<null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), ms);
  });
}

async function raceWithBudget<T>(promise: Promise<T>, budgetMs: number): Promise<T | null> {
  return Promise.race([promise, delay(budgetMs)]);
}

function finish(places: Place[], limit: number, companions?: CompanionPrefs | null): Place[] {
  const seen = new Set<string>();
  const deduped = places.filter((place) => {
    const key = `${place.name.toLowerCase()}|${place.latitude.toFixed(3)}|${place.longitude.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const ranked = companionFilterActive(companions)
    ? applyCompanionFilter(deduped, companions).slice(0, limit)
    : topPopularPlaces(deduped, limit);
  rememberPlaces(ranked);
  return ranked;
}

/**
 * Home lists for any city worldwide:
 * OSM (budgeted) → Photon → always merge world/PH catalog → popularity rank.
 */
export async function getHomeNearbyPlaces(params: {
  location: GeoPoint;
  category: 'attraction' | 'restaurant';
  cityLabel?: string | null;
  radiusMeters: number;
  limit?: number;
  companions?: CompanionPrefs | null;
}): Promise<Place[]> {
  const limit = params.limit ?? DEFAULT_LIMIT;

  const photonPromise = searchPhotonNearby({
    location: params.location,
    category: params.category,
    cityLabel: params.cityLabel,
    radiusMeters: Math.max(params.radiusMeters, 25_000),
    limit: Math.max(limit + 6, 24),
  }).catch(() => [] as Place[]);

  const catalog = searchCatalogNearby({
    location: params.location,
    category: params.category,
    radiusMeters: Math.max(params.radiusMeters, 40_000),
    limit: Math.max(limit + 10, 30),
  });

  try {
    const nearby = await raceWithBudget(
      providers.places.getNearbyPlaces({
        location: params.location,
        radiusMeters: params.radiusMeters,
        category: params.category,
        limit: Math.max(limit + 6, 24),
      }),
      LIVE_BUDGET_MS,
    );
    if (nearby && nearby.length > 0) {
      return finish([...catalog, ...nearby], limit, params.companions);
    }
  } catch {
    // Fall through.
  }

  const photon = await photonPromise;
  if (photon.length > 0) {
    return finish([...catalog, ...photon], limit, params.companions);
  }

  return finish(catalog, limit, params.companions);
}
