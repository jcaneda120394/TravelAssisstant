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
  // Keep client fallback short — long ladders leave itinerary UI stuck on “Loading photo…”.
  const shortQueries = queries.slice(0, 2);

  for (const query of shortQueries) {
    log('Trying Openverse:', query);
    const openverse = await searchOpenverseImages(query, 8);
    const bestOpen = pickBestCandidate(
      openverse,
      query,
      input.excludeImageUrls,
      input.excludeImageIds,
      input.name,
      input.type,
    );
    if (bestOpen) {
      log('Openverse found image.');
      return bestOpen;
    }
    log('Openverse returned no result.');
  }

  for (const query of shortQueries) {
    log('Trying Wikimedia:', query);
    const wiki = await searchWikimediaImages(query, 8);
    const bestWiki = pickBestCandidate(
      wiki,
      query,
      input.excludeImageUrls,
      input.excludeImageIds,
      input.name,
      input.type,
    );
    if (bestWiki) {
      log('Wikimedia found image.');
      return bestWiki;
    }
    log('Wikimedia returned no result.');
  }

  return null;
}

function edgeImageRelevant(image: TravelImage, input: GetTravelImageInput): boolean {
  return Boolean(
    pickBestCandidate(
      [image],
      image.searchQuery || buildImageSearchQuery(input),
      input.excludeImageUrls,
      input.excludeImageIds,
      input.name,
      input.type,
    ),
  );
}

/**
 * Central travel image resolver.
 * Cache → Edge (Pexels→Unsplash→Openverse→Wikimedia) → client CC fallback → app fallback.
 */
export async function getTravelImage(input: GetTravelImageInput): Promise<TravelImage> {
  const primaryQuery = buildImageSearchQuery(input);
  const queries = buildImageQueryLadder(input);
  log('Search ladder:', queries.slice(0, 4).join(' | '));

  const resolve = async (): Promise<TravelImage> => {
    if (!input.bypassCache) {
      const memory = getMemoryTravelImage(input);
      if (memory && (memory.provider === 'fallback' || edgeImageRelevant(memory, input))) {
        log('Memory cache hit:', memory.provider);
        return memory;
      }
      const db = await getDbTravelImage(input);
      if (db && edgeImageRelevant(db, input)) {
        log('Cached image:', db.provider);
        setMemoryTravelImage(input, db);
        return db;
      }
    }

    const fromEdge = await resolveTravelImageViaEdge(input);
    if (fromEdge?.url && edgeImageRelevant(fromEdge, input)) {
      log(`${fromEdge.provider} found image (edge).`);
      setMemoryTravelImage(input, fromEdge);
      void saveDbTravelImage(input, fromEdge);
      return fromEdge;
    }
    if (fromEdge?.url) {
      log('Edge image rejected as irrelevant to place:', input.name);
    }

    const fromClient = await searchClientFallbackProviders(input, queries);
    if (fromClient) {
      setMemoryTravelImage(input, fromClient);
      void saveDbTravelImage(input, fromClient);
      return fromClient;
    }

    log('All providers failed — using application fallback.');
    return buildFallbackTravelImage(input, primaryQuery);
  };

  const fallback = buildFallbackTravelImage(input, primaryQuery);
  try {
    const result = await Promise.race([
      resolve(),
      new Promise<TravelImage>((settle) => {
        setTimeout(() => settle(fallback), 8_000);
      }),
    ]);
    setMemoryTravelImage(input, result);
    return result;
  } catch {
    setMemoryTravelImage(input, fallback);
    return fallback;
  }
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
