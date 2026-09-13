import { env } from '@/config/env';
import { buildFallbackTravelImage } from '@/lib/images/fallback';
import {
  getDbTravelImage,
  getMemoryTravelImage,
  saveDbTravelImage,
  setMemoryTravelImage,
} from '@/lib/images/image-cache';
import {
  buildImageQueryLadder,
  buildImageSearchQuery,
  parseCityCountryFromAddress,
} from '@/lib/images/image-query-builder';
import { pickBestCandidate } from '@/lib/images/image-validate';
import { resolveTravelImageViaEdge } from '@/lib/images/providers/edge-resolve';
import { searchOpenverseImages } from '@/lib/images/providers/openverse';
import { searchWikimediaImages } from '@/lib/images/providers/wikimedia';
import type { GetTravelImageInput, TravelImage } from '@/lib/images/types';
import type { Place } from '@/types/domain';

function log(...args: unknown[]) {
  if (env.appEnv === 'production') return;
  // eslint-disable-next-line no-console
  console.log('[TravelImage]', ...args);
}

/**
 * Convert a Place into image search input (city/country from address when needed).
 */
export function placeToTravelImageInput(
  place: Place,
  extras?: Partial<GetTravelImageInput>,
): GetTravelImageInput {
  const parsed = parseCityCountryFromAddress(place.address);
  return {
    name: place.nameEnglish?.trim() || place.name,
    city: extras?.city ?? parsed.city ?? null,
    country: extras?.country ?? parsed.country ?? null,
    type: extras?.type ?? place.category,
    latitude: place.latitude,
    longitude: place.longitude,
    excludeImageUrls: extras?.excludeImageUrls,
    excludeImageIds: extras?.excludeImageIds,
    bypassCache: extras?.bypassCache,
  };
}

async function searchClientFallbackProviders(
  input: GetTravelImageInput,
  queries: string[],
): Promise<TravelImage | null> {
  // Keys must stay server-side — client only uses Openverse + Wikimedia.
  for (const query of queries) {
    log('Trying Openverse:', query);
    const openverse = await searchOpenverseImages(query, 10);
    const bestOpen = pickBestCandidate(
      openverse,
      query,
      input.excludeImageUrls,
      input.excludeImageIds,
    );
    if (bestOpen) {
      log('Openverse found image.');
      return bestOpen;
    }
    log('Openverse returned no result.');
  }

  for (const query of queries) {
    log('Trying Wikimedia:', query);
    const wiki = await searchWikimediaImages(query, 10);
    const bestWiki = pickBestCandidate(
      wiki,
      query,
      input.excludeImageUrls,
      input.excludeImageIds,
    );
    if (bestWiki) {
      log('Wikimedia found image.');
      return bestWiki;
    }
    log('Wikimedia returned no result.');
  }

  return null;
}

/**
 * Central travel image resolver.
 * Cache → Edge (Pexels→Unsplash→Openverse→Wikimedia) → client CC fallback → app fallback.
 */
export async function getTravelImage(input: GetTravelImageInput): Promise<TravelImage> {
  const primaryQuery = buildImageSearchQuery(input);
  const queries = buildImageQueryLadder(input);
  log('Search ladder:', queries.slice(0, 4).join(' | '));

  if (!input.bypassCache) {
    const memory = getMemoryTravelImage(input);
    if (memory) {
      log('Memory cache hit:', memory.provider);
      return memory;
    }
    const db = await getDbTravelImage(input);
    if (db) {
      log('Cached image:', db.provider);
      setMemoryTravelImage(input, db);
      return db;
    }
  }

  const fromEdge = await resolveTravelImageViaEdge(input);
  if (fromEdge?.url) {
    log(`${fromEdge.provider} found image (edge).`);
    setMemoryTravelImage(input, fromEdge);
    void saveDbTravelImage(input, fromEdge);
    return fromEdge;
  }

  const fromClient = await searchClientFallbackProviders(input, queries);
  if (fromClient) {
    setMemoryTravelImage(input, fromClient);
    void saveDbTravelImage(input, fromClient);
    return fromClient;
  }

  log('All providers failed — using application fallback.');
  const fallback = buildFallbackTravelImage(input, primaryQuery);
  setMemoryTravelImage(input, fallback);
  return fallback;
}

/**
 * Resolve unique images for many itinerary stops (parallel with a small concurrency cap).
 */
export async function getTravelImagesForPlaces(
  inputs: GetTravelImageInput[],
  options?: { concurrency?: number },
): Promise<TravelImage[]> {
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 4, 6));
  const usedUrls: string[] = [];
  const results: TravelImage[] = new Array(inputs.length);
  let index = 0;

  async function worker() {
    while (index < inputs.length) {
      const current = index;
      index += 1;
      const input = inputs[current]!;
      const image = await getTravelImage({
        ...input,
        excludeImageUrls: [...(input.excludeImageUrls ?? []), ...usedUrls],
      });
      results[current] = image;
      if (image.provider !== 'fallback') {
        usedUrls.push(image.url);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, inputs.length) }, () => worker()));
  return results;
}

export async function getTravelImageForPlace(
  place: Place,
  extras?: Partial<GetTravelImageInput>,
): Promise<TravelImage> {
  return getTravelImage(placeToTravelImageInput(place, extras));
}
