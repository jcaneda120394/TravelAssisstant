import { env } from '@/config/env';
import { getCached, setCached } from '@/lib/http/response-cache';
import type { GetTravelImageInput, TravelImage } from '@/lib/images/types';
import { buildPlaceImageCacheKey } from '@/lib/images/image-query-builder';
import { supabase } from '@/lib/supabase/client';

/** Soft TTL for memory cache (React Query also caches). */
export const TRAVEL_IMAGE_MEMORY_TTL_MS = 6 * 60 * 60_000;
/** Soft TTL for Supabase place_images rows. */
export const TRAVEL_IMAGE_DB_TTL_MS = 60 * 24 * 60 * 60_000; // 60 days

type PlaceImageRow = {
  place_key: string;
  image_url: string;
  thumbnail_url: string | null;
  provider: string;
  provider_image_id: string | null;
  photographer: string | null;
  photographer_url: string | null;
  source_url: string | null;
  license: string | null;
  attribution: string | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  search_query: string | null;
  updated_at: string;
};

function rowToImage(row: PlaceImageRow): TravelImage {
  return {
    id: row.provider_image_id || `${row.provider}:${row.place_key}`,
    url: row.image_url,
    thumbnailUrl: row.thumbnail_url ?? row.image_url,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    provider: row.provider as TravelImage['provider'],
    photographer: row.photographer ?? undefined,
    photographerUrl: row.photographer_url ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    license: row.license ?? undefined,
    attribution: row.attribution ?? undefined,
    alt: row.alt || row.place_key,
    searchQuery: row.search_query || row.place_key,
  };
}

export function memoryCacheKey(input: GetTravelImageInput): string {
  const base = buildPlaceImageCacheKey(input);
  const exclude = (input.excludeImageUrls ?? []).slice(0, 8).join('|');
  return `travel-image:${base}:${exclude}`;
}

export function getMemoryTravelImage(input: GetTravelImageInput): TravelImage | undefined {
  return getCached<TravelImage>(memoryCacheKey(input));
}

export function setMemoryTravelImage(input: GetTravelImageInput, image: TravelImage): TravelImage {
  return setCached(memoryCacheKey(input), image, TRAVEL_IMAGE_MEMORY_TTL_MS);
}

export async function getDbTravelImage(
  input: GetTravelImageInput,
): Promise<TravelImage | null> {
  if (!env.isSupabaseConfigured || !supabase) return null;
  const placeKey = buildPlaceImageCacheKey(input);
  try {
    const { data, error } = await supabase
      .from('place_images')
      .select(
        'place_key,image_url,thumbnail_url,provider,provider_image_id,photographer,photographer_url,source_url,license,attribution,width,height,alt,search_query,updated_at',
      )
      .eq('place_key', placeKey)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as PlaceImageRow;
    const age = Date.now() - new Date(row.updated_at).getTime();
    if (!Number.isFinite(age) || age > TRAVEL_IMAGE_DB_TTL_MS) return null;
    if (!row.image_url || !/^https?:\/\//i.test(row.image_url)) return null;
    if (input.excludeImageUrls?.some((u) => u.split('?')[0] === row.image_url.split('?')[0])) {
      return null;
    }
    return rowToImage(row);
  } catch {
    return null;
  }
}

export async function saveDbTravelImage(
  input: GetTravelImageInput,
  image: TravelImage,
): Promise<void> {
  if (!env.isSupabaseConfigured || !supabase) return;
  if (image.provider === 'fallback') return;
  const placeKey = buildPlaceImageCacheKey(input);
  try {
    await supabase.from('place_images').upsert(
      {
        place_key: placeKey,
        place_name: input.name,
        city: input.city ?? null,
        country: input.country ?? null,
        type: input.type ?? null,
        search_query: image.searchQuery,
        image_url: image.url,
        thumbnail_url: image.thumbnailUrl ?? image.url,
        provider: image.provider,
        provider_image_id: image.id,
        photographer: image.photographer ?? null,
        photographer_url: image.photographerUrl ?? null,
        source_url: image.sourceUrl ?? null,
        license: image.license ?? null,
        attribution: image.attribution ?? null,
        width: image.width ?? null,
        height: image.height ?? null,
        alt: image.alt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'place_key' },
    );
  } catch {
    // Cache write failures must never break the UI.
  }
}
