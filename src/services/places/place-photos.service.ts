import { fetchJson } from '@/lib/http/fetch-json';
import { env } from '@/config/env';
import {
  getTravelImageForPlace,
  type TravelImage,
} from '@/lib/images';
import { esriStreetTileUrl } from '@/lib/images/fallback';
import { supabase } from '@/lib/supabase/client';
import type { Place, PlaceCategory } from '@/types/domain';
import { haversineMeters } from '@/utils/geo';

export type PlacePhoto = {
  url: string;
  thumbUrl?: string;
  source:
    | 'place'
    | 'google'
    | 'wikipedia'
    | 'commons'
    | 'openverse'
    | 'pexels'
    | 'unsplash'
    | 'pixabay'
    | 'flickr'
    | 'wikimedia'
    | 'map'
    | 'community'
    | 'fallback';
  title?: string;
  /** Photographer / license line for gallery captions. */
  attribution?: string;
  photographer?: string;
  /** 0–1 relevance to the place name; map previews are 0. */
  score?: number;
  /** Destination / mood fill (stock) rather than venue-exact. */
  atmosphere?: boolean;
};

type WikiQueryResponse = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        thumbnail?: { source?: string; width?: number; height?: number };
        original?: { source?: string };
        coordinates?: Array<{ lat: number; lon: number }>;
        imageinfo?: Array<{
          url?: string;
          thumburl?: string;
          mime?: string;
          descriptionurl?: string;
        }>;
      }
    >;
  };
};

const USER_AGENT = 'TravelMateAI/1.0 (https://travelmate.app; place-photos)';

/** Always-junk titles (never the venue photo). */
const ALWAYS_IRRELEVANT =
  /\b(logo|icon|wordmark|flag|coat of arms|seal|expressway|highway|slex|nlex|skyway|tollway|diagram|svg|signage template|placeholder|bus|buses|jeepney|coach|parking lot)\b/i;

/** Theme-park titles — only junk when the place itself is NOT that park. */
const THEME_PARK_TITLE =
  /\b(disneyland|disney|universal studios|sesame place|theme park|amusement park|legoland|ocean park)\b/i;

/** Famous-volcano titles — junk only when the place name does not also match. */
const VOLCANO_TITLE = /\b(volcano|mayon|mt\.?\s*mayon|mount mayon)\b/i;
const GEO_ONLY_TOKEN =
  /^(sorsogon|bulacan|manila|philippines|luzon|visayas|mindanao|albay|gubat|barcelona|cebu|davao|legazpi|hong|kong|vietnam|japan|spain|city|island|rock|formation|park|beach)$/i;

function isIrrelevantPhotoTitle(placeName: string, photoTitle: string): boolean {
  const title = photoTitle.toLowerCase();
  const name = placeName.toLowerCase();
  if (ALWAYS_IRRELEVANT.test(title)) return true;
  if (THEME_PARK_TITLE.test(title)) {
    return !THEME_PARK_TITLE.test(name);
  }
  if (VOLCANO_TITLE.test(title)) {
    // Keep "Mayon at Paguriran Island" when searching Paguriran.
    const distinctive = significantTokens(placeName).filter((t) => !GEO_ONLY_TOKEN.test(t));
    if (distinctive.some((t) => title.includes(t))) return false;
    return !/mayon|volcano/i.test(name);
  }
  if (/\b(satellite|aerial map|street map)\b/i.test(title)) return true;
  return false;
}

const FOOD_CATEGORIES = new Set<PlaceCategory>([
  'restaurant',
  'cafe',
  'bakery',
  'nightlife',
]);

function cleanSearchName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function displayNameForSearch(place: Place): string {
  const english = place.nameEnglish?.trim();
  if (english) return english;
  const raw = place.name?.trim() ?? '';
  const paren = raw.match(/\(([^)]+)\)\s*$/);
  if (paren?.[1] && /[A-Za-z]/.test(paren[1])) {
    return paren[1].trim();
  }
  return raw;
}

function cityHint(place: Place): string {
  const fromAddress = place.address?.split(',').map((p) => p.trim()).filter(Boolean) ?? [];
  return fromAddress.slice(-3).slice(0, 2).join(' ');
}

function significantTokens(text: string): string[] {
  const stop = new Set([
    'the',
    'and',
    'for',
    'near',
    'with',
    'from',
    'restaurant',
    'cafe',
    'café',
    'food',
    'eats',
    'market',
    'public',
    'town',
    'plaza',
    'city',
    'branch',
    'inc',
    'llc',
    'by',
    'of',
    'at',
    'in',
  ]);
  return cleanSearchName(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^'+|'+$/g, ''))
    .filter((t) => t.length >= 3 && !stop.has(t));
}

/**
 * Score how well a Wiki/Commons title matches the place.
 * Low scores should never be shown on cards — prefer map instead.
 */
export function scorePhotoRelevance(
  placeName: string,
  photoTitle: string | undefined,
  placeAddress?: string,
): number {
  const title = (photoTitle ?? '').toLowerCase();
  if (!title.trim()) return 0;
  if (isIrrelevantPhotoTitle(placeName, title)) return 0;

  const nameTokens = significantTokens(placeName);
  if (nameTokens.length === 0) return 0;

  const titleTokens = new Set(significantTokens(photoTitle ?? ''));
  const matched = nameTokens.filter((token) => {
    if (titleTokens.has(token)) return true;
    // Allow substring match for compound names (jollibee, max's → maxs).
    const compactTitle = title.replace(/[^a-z0-9]/g, '');
    return compactTitle.includes(token.replace(/[^a-z0-9]/g, ''));
  });

  const ratio = matched.length / nameTokens.length;
  const onlyGeoTokens =
    matched.length > 0 &&
    matched.every((token) => GEO_ONLY_TOKEN.test(token));
  // City/province-only overlap is never enough (e.g. "Sorsogon" on a volcano page).
  if (onlyGeoTokens) return 0;
  if (ratio < 0.34 || matched.length < 1) {
    return 0;
  }
  // Need 2 tokens OR one strong distinctive token (Victoria, Disneyland, Paguriran…).
  if (matched.length < 2) {
    const strong = matched[0]!;
    if (strong.length < 4 && nameTokens.length > 1) return 0;
  }

  let score = ratio;
  const cityBits = significantTokens(placeAddress ?? '');
  if (cityBits.some((bit) => title.includes(bit))) {
    score += 0.15;
  }
  // Exact-ish title starts with venue name.
  const nameCore = cleanSearchName(placeName).toLowerCase();
  if (title.includes(nameCore.slice(0, Math.min(nameCore.length, 18)))) {
    score += 0.2;
  }

  return Math.min(1, score);
}

function dedupePhotos(photos: PlacePhoto[]): PlacePhoto[] {
  const seen = new Set<string>();
  return photos.filter((photo) => {
    const key = photo.url.split('?')[0]!;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankPhotos(place: Place, photos: PlacePhoto[], minScore = 0.34): PlacePhoto[] {
  const name = displayNameForSearch(place);
  return dedupePhotos(photos)
    .map((photo) => ({
      ...photo,
      url: cleanMediaUrl(photo.url),
      thumbUrl: photo.thumbUrl ? cleanMediaUrl(photo.thumbUrl) : undefined,
      score: scorePhotoRelevance(name, photo.title, place.address),
    }))
    .filter((photo) => (photo.score ?? 0) >= minScore)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function cleanMediaUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Wikimedia sometimes appends tracking params that break some clients.
    // Keep query params for Unsplash/Pexels/Pixabay CDN sizing.
    if (/wikimedia\.org|wikipedia\.org/i.test(parsed.hostname)) {
      parsed.search = '';
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

async function wikipediaSearchPhotos(query: string, limit: number): Promise<PlacePhoto[]> {
  if (!query.trim()) return [];
  // Prefer intitle matches so "Max's Restaurant" does not return highway logos.
  const search = `intitle:${query}`;
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&prop=pageimages&piprop=thumbnail|original&pithumbsize=900` +
    `&generator=search&gsrsearch=${encodeURIComponent(search)}&gsrlimit=${limit}`;
  try {
    const data = await fetchJson<WikiQueryResponse>(url, {
      timeoutMs: 8_000,
      cacheTtlMs: 30 * 60_000,
      headers: { 'User-Agent': USER_AGENT },
    });
    const pages = Object.values(data.query?.pages ?? {});
    const photos: PlacePhoto[] = [];
    for (const page of pages) {
      const full = page.original?.source ?? page.thumbnail?.source;
      if (!full) continue;
      if (ALWAYS_IRRELEVANT.test(page.title ?? '')) continue;
      photos.push({
        url: full,
        thumbUrl: page.thumbnail?.source,
        source: 'wikipedia',
        title: page.title,
      });
    }
    return photos;
  } catch {
    return [];
  }
}

async function wikipediaGeoPhotos(
  latitude: number,
  longitude: number,
  limit: number,
): Promise<PlacePhoto[]> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&prop=pageimages|coordinates&piprop=thumbnail|original&pithumbsize=900` +
    `&generator=geosearch&ggscoord=${latitude}|${longitude}&ggsradius=1200&ggslimit=${limit}`;
  try {
    const data = await fetchJson<WikiQueryResponse>(url, {
      timeoutMs: 8_000,
      cacheTtlMs: 30 * 60_000,
      headers: { 'User-Agent': USER_AGENT },
    });
    const pages = Object.values(data.query?.pages ?? {});
    const photos: PlacePhoto[] = [];
    for (const page of pages) {
      const full = page.original?.source ?? page.thumbnail?.source;
      if (!full) continue;
      if (ALWAYS_IRRELEVANT.test(page.title ?? '')) continue;
      photos.push({
        url: full,
        thumbUrl: page.thumbnail?.source,
        source: 'wikipedia',
        title: page.title,
      });
    }
    return photos;
  } catch {
    return [];
  }
}

async function commonsSearchPhotos(query: string, limit: number): Promise<PlacePhoto[]> {
  if (!query.trim()) return [];
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrlimit=${limit}&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=900`;
  try {
    const data = await fetchJson<WikiQueryResponse>(url, {
      timeoutMs: 8_000,
      cacheTtlMs: 30 * 60_000,
      headers: { 'User-Agent': USER_AGENT },
    });
    const pages = Object.values(data.query?.pages ?? {});
    const photos: PlacePhoto[] = [];
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info?.url) continue;
      if (info.mime && !info.mime.startsWith('image/')) continue;
      const title = (page.title ?? '').toLowerCase();
      if (ALWAYS_IRRELEVANT.test(title)) continue;
      photos.push({
        url: info.url,
        thumbUrl: info.thumburl ?? info.url,
        source: 'commons',
        title: page.title?.replace(/^File:/, ''),
      });
    }
    return photos;
  } catch {
    return [];
  }
}

function travelImageToPlacePhoto(image: TravelImage): PlacePhoto {
  const source: PlacePhoto['source'] =
    image.provider === 'fallback'
      ? 'map'
      : image.provider === 'wikimedia'
        ? 'wikimedia'
        : (image.provider as PlacePhoto['source']);
  return {
    url: cleanMediaUrl(image.url),
    thumbUrl: image.thumbnailUrl ? cleanMediaUrl(image.thumbnailUrl) : cleanMediaUrl(image.url),
    source,
    title: image.alt,
    attribution: image.attribution,
    photographer: image.photographer,
    score: image.provider === 'fallback' ? 0.05 : 0.92,
  };
}

/**
 * Soft score for destination stock photos (city / region mood).
 * Used when venue-exact Wikimedia/Google photos are scarce.
 */
export function scoreAtmosphereRelevance(
  place: Place,
  photoTitle: string | undefined,
): number {
  const title = (photoTitle ?? '').toLowerCase();
  if (!title.trim()) return 0.32;
  if (isIrrelevantPhotoTitle(displayNameForSearch(place), title)) return 0;

  const cityBits = significantTokens(`${cityHint(place)} ${place.address ?? ''}`);
  const hits = cityBits.filter((bit) => title.includes(bit));
  if (hits.some((bit) => !GEO_ONLY_TOKEN.test(bit))) {
    return Math.min(0.72, 0.42 + hits.length * 0.08);
  }
  if (hits.length > 0) return 0.38;
  return 0.3;
}

/** Last-resort map tile — free Esri streets (no API key). */
function mapPreviewPhoto(place: Place): PlacePhoto {
  const url = esriStreetTileUrl(place.latitude, place.longitude);
  return {
    url,
    thumbUrl: url,
    source: 'map',
    title: 'Map preview',
    score: 0.05,
  };
}

function isFoodPlace(place: Place): boolean {
  return FOOD_CATEGORIES.has(place.category);
}

type GooglePhotoPayload = {
  photo?: {
    url?: string;
    thumbUrl?: string;
    title?: string;
    source?: string;
  } | null;
  error?: string;
  code?: string;
};

const googleInflight = new Map<string, Promise<PlacePhoto | null>>();
/** Skip Google Edge calls after we learn Places billing/key is unavailable. */
let googlePlacesUnavailableUntil = 0;

function googleCacheKey(place: Place): string {
  return `${place.id}|${place.name}|${place.latitude.toFixed(4)}|${place.longitude.toFixed(4)}`;
}

/** Optional Google Places photos — skipped when no key / billing. */
async function fetchGooglePlacePhoto(
  place: Place,
  maxWidthPx = 900,
): Promise<PlacePhoto | null> {
  if (Date.now() < googlePlacesUnavailableUntil && !env.googleMapsApiKey?.trim()) {
    return null;
  }

  const key = googleCacheKey(place);
  const existing = googleInflight.get(key);
  if (existing) return existing;

  const run = (async (): Promise<PlacePhoto | null> => {
    const body = {
      name: cleanSearchName(displayNameForSearch(place)),
      address: place.address ?? cityHint(place),
      latitude: place.latitude,
      longitude: place.longitude,
      maxWidthPx,
    };

    // 1) Supabase Edge Function keeps the Places API key server-side.
    if (env.isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke<GooglePhotoPayload>('google-places', {
          body: { action: 'photo', ...body },
        });
        if (
          data?.code === 'NO_GOOGLE_KEY' ||
          data?.error === 'Google Places is not configured' ||
          (error && /503|NO_GOOGLE/i.test(String(error.message ?? error)))
        ) {
          googlePlacesUnavailableUntil = Date.now() + 60 * 60_000;
          // Fall through to free sources.
        } else if (!error && data?.photo?.url) {
          return {
            url: data.photo.url,
            thumbUrl: data.photo.thumbUrl ?? data.photo.url,
            source: 'google',
            title: data.photo.title ?? place.name,
            score: 1,
          };
        }
      } catch {
        // Fall through to optional client key / free sources.
      }
    }

    // 2) Optional client Maps key (restricted by HTTP referrer / app bundle).
    const apiKey = env.googleMapsApiKey?.trim();
    if (!apiKey) return null;

    try {
      const textQuery = [body.name, body.address].filter(Boolean).join(', ');
      const search = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.photos',
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: 5,
          locationBias: {
            circle: {
              center: { latitude: place.latitude, longitude: place.longitude },
              radius: 8_000,
            },
          },
        }),
      });
      if (!search.ok) return null;
      const searchJson = (await search.json()) as {
        places?: Array<{
          displayName?: { text?: string };
          location?: { latitude?: number; longitude?: number };
          photos?: Array<{ name?: string }>;
        }>;
      };

      const match = (searchJson.places ?? []).find((candidate) => {
        const gName = candidate.displayName?.text ?? '';
        const score = scorePhotoRelevance(body.name, gName, place.address);
        if (score < 0.35) {
          const tokens = significantTokens(body.name);
          const hay = gName.toLowerCase();
          if (!tokens.some((t) => t.length >= 5 && hay.includes(t))) return false;
        }
        const gLat = candidate.location?.latitude;
        const gLng = candidate.location?.longitude;
        if (gLat == null || gLng == null) return true;
        return (
          haversineMeters(
            { latitude: place.latitude, longitude: place.longitude },
            { latitude: gLat, longitude: gLng },
          ) <= 12_000
        );
      });

      const photoName = match?.photos?.[0]?.name;
      if (!photoName) return null;

      const media = await fetch(
        `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`,
        { headers: { 'X-Goog-Api-Key': apiKey } },
      );
      if (!media.ok) return null;
      const mediaJson = (await media.json()) as { photoUri?: string };
      if (!mediaJson.photoUri) return null;

      return {
        url: mediaJson.photoUri,
        thumbUrl: mediaJson.photoUri,
        source: 'google',
        title: match?.displayName?.text ?? place.name,
        score: 1,
      };
    } catch {
      return null;
    }
  })();

  googleInflight.set(key, run);
  try {
    return await run;
  } finally {
    // Keep resolved promise for in-session dedupe of Rapid card grids.
  }
}

async function searchNamedPhotos(place: Place, limit: number): Promise<PlacePhoto[]> {
  const name = cleanSearchName(displayNameForSearch(place));
  const city = cityHint(place);
  if (name.length < 3) return [];

  const primaryToken =
    significantTokens(name).find((t) => !GEO_ONLY_TOKEN.test(t) && t.length >= 4) ?? '';

  const queries = [
    [name, city].filter(Boolean).join(' '),
    name,
    primaryToken && city ? `${primaryToken} ${city}` : '',
    primaryToken,
  ].filter((q, index, arr) => q.length >= 3 && arr.indexOf(q) === index);

  const batches = await Promise.all(
    queries.flatMap((query) => [
      wikipediaSearchPhotos(query, limit),
      commonsSearchPhotos(query, limit),
      commonsSearchPhotos(`"${primaryToken || name}"`, limit),
    ]),
  );

  const ranked = rankPhotos(place, batches.flat(), 0.34);
  if (ranked.length > 0) return ranked;
  return rankPhotos(place, batches.flat(), 0.2);
}

/**
 * Resolve photos for a place detail screen.
 * Primary image via getTravelImage; gallery filled with Wikimedia/Google when available.
 */
export async function fetchPlacePhotos(place: Place, limit = 10): Promise<PlacePhoto[]> {
  const existing = (place.photos ?? [])
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url))
    .map((url) => ({ url: cleanMediaUrl(url), source: 'place' as const, score: 1 }));

  if (existing.length >= limit) {
    return existing.slice(0, limit);
  }

  const primary = travelImageToPlacePhoto(await getTravelImageForPlace(place));
  const named = await searchNamedPhotos(place, limit);

  let geo: PlacePhoto[] = [];
  if (
    !isFoodPlace(place) &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude)
  ) {
    geo = rankPhotos(place, await wikipediaGeoPhotos(place.latitude, place.longitude, limit), 0.34);
  }

  let googleList: PlacePhoto[] = [];
  if (named.length + geo.length < Math.min(2, limit)) {
    const google = await fetchGooglePlacePhoto(place, 1200);
    if (google) googleList = [google];
  }

  const merged = dedupePhotos([
    ...existing,
    ...(primary.source !== 'map' ? [primary] : []),
    ...googleList,
    ...named,
    ...geo,
  ]).slice(0, limit);

  if (merged.length === 0) {
    return [primary.source === 'map' ? primary : mapPreviewPhoto(place)];
  }
  return merged;
}

/**
 * Single best photo for list tiles (Home / Explore cards) — every city/country/place.
 * Goes through the central travel image service (sequential providers + cache).
 */
export async function fetchBestPlacePhoto(
  place: Place,
  options?: { excludeImageUrls?: string[] },
): Promise<PlacePhoto> {
  const existing = (place.photos ?? []).find(
    (url) => typeof url === 'string' && /^https?:\/\//i.test(url),
  );
  if (existing && !options?.excludeImageUrls?.includes(existing)) {
    const url = cleanMediaUrl(existing);
    return { url, thumbUrl: url, source: 'place', score: 1 };
  }

  const fallback = mapPreviewPhoto(place);
  try {
    const image = await Promise.race([
      getTravelImageForPlace(place, {
        excludeImageUrls: options?.excludeImageUrls,
      }),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 8_000);
      }),
    ]);
    if (!image) return fallback;
    return travelImageToPlacePhoto(image);
  } catch {
    return fallback;
  }
}
