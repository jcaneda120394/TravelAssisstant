import { fetchJson } from '@/lib/http/fetch-json';
import type { Place, PlaceCategory } from '@/types/domain';

export type PlacePhoto = {
  url: string;
  thumbUrl?: string;
  source: 'place' | 'wikipedia' | 'commons' | 'map' | 'community';
  title?: string;
  /** 0–1 relevance to the place name; map previews are 0. */
  score?: number;
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

/** Titles that almost never represent the venue itself. */
const IRRELEVANT_TITLE =
  /\b(logo|icon|wordmark|flag|coat of arms|seal|map|satellite|aerial|expressway|highway|slex|nlex|skyway|tollway|sesame place|disneyland|universal studios|theme park|amusement|volcano|mayon|mt\.?\s*mayon|mount mayon|diagram|svg|signage template|placeholder)\b/i;

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
  if (IRRELEVANT_TITLE.test(title)) return 0;

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
    matched.every((token) =>
      /^(sorsogon|bulacan|manila|philippines|luzon|visayas|mindanao|albay|gubat|barcelona|cebu|davao|legazpi)$/i.test(
        token,
      ),
    );
  // City/province-only overlap is never enough (e.g. "Sorsogon" on a volcano page).
  if (onlyGeoTokens) return 0;
  if (ratio < 0.5 || matched.length < 2) {
    // Allow single strong brand token when the name is mostly stopwords + brand.
    if (!(matched.length === 1 && nameTokens.length <= 2 && matched[0]!.length >= 5)) {
      return 0;
    }
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

function rankPhotos(place: Place, photos: PlacePhoto[]): PlacePhoto[] {
  const name = displayNameForSearch(place);
  return dedupePhotos(photos)
    .map((photo) => ({
      ...photo,
      score: scorePhotoRelevance(name, photo.title, place.address),
    }))
    .filter((photo) => (photo.score ?? 0) >= 0.5)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
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
      if (IRRELEVANT_TITLE.test(page.title ?? '')) continue;
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
      if (IRRELEVANT_TITLE.test(page.title ?? '')) continue;
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
      if (IRRELEVANT_TITLE.test(title)) continue;
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

/** Honest fallback when no venue-matched photo exists. */
function mapPreviewPhoto(place: Place): PlacePhoto {
  const lat = place.latitude.toFixed(5);
  const lon = place.longitude.toFixed(5);
  const url =
    `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}` +
    `&zoom=16&size=800x480&maptype=mapnik&markers=${lat},${lon},lightblue1`;
  return {
    url,
    source: 'map',
    title: 'Map preview',
    score: 0,
  };
}

function isFoodPlace(place: Place): boolean {
  return FOOD_CATEGORIES.has(place.category);
}

async function searchNamedPhotos(place: Place, limit: number): Promise<PlacePhoto[]> {
  const name = cleanSearchName(displayNameForSearch(place));
  const city = cityHint(place);
  if (name.length < 3) return [];

  const queries = [
    [name, city].filter(Boolean).join(' '),
    name,
  ].filter((q, index, arr) => q.length >= 3 && arr.indexOf(q) === index);

  const batches = await Promise.all(
    queries.flatMap((query) => [
      wikipediaSearchPhotos(query, limit),
      commonsSearchPhotos(`"${name}"`, limit),
      commonsSearchPhotos(query, limit),
    ]),
  );

  return rankPhotos(place, batches.flat());
}

/**
 * Resolve a few photos for a place detail screen.
 * Only keep images whose title clearly relates to the venue; otherwise map preview.
 */
export async function fetchPlacePhotos(place: Place, limit = 6): Promise<PlacePhoto[]> {
  const existing = (place.photos ?? [])
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url))
    .map((url) => ({ url, source: 'place' as const, score: 1 }));

  if (existing.length >= limit) {
    return existing.slice(0, limit);
  }

  const named = await searchNamedPhotos(place, limit);

  // Geo Wikipedia is useful for landmarks, but for restaurants it often returns
  // nearby volcanoes / highways — skip it for food.
  let geo: PlacePhoto[] = [];
  if (
    !isFoodPlace(place) &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude)
  ) {
    geo = rankPhotos(place, await wikipediaGeoPhotos(place.latitude, place.longitude, limit));
  }

  const merged = dedupePhotos([...existing, ...named, ...geo]).slice(0, limit);
  if (merged.length === 0) {
    return [mapPreviewPhoto(place)];
  }
  return merged;
}

/**
 * Single best photo for list tiles (Home / Explore cards).
 * Never show an unrelated Wikimedia hit — fall back to map preview.
 */
export async function fetchBestPlacePhoto(place: Place): Promise<PlacePhoto> {
  const existing = (place.photos ?? []).find(
    (url) => typeof url === 'string' && /^https?:\/\//i.test(url),
  );
  if (existing) {
    return { url: existing, thumbUrl: existing, source: 'place', score: 1 };
  }

  const named = await searchNamedPhotos(place, 4);
  if (named[0] && (named[0].score ?? 0) >= 0.5) {
    return named[0];
  }

  if (!isFoodPlace(place)) {
    const photos = await fetchPlacePhotos(place, 3);
    const best = photos.find((photo) => photo.source !== 'map' && (photo.score ?? 0) >= 0.5);
    if (best) return best;
  }

  return mapPreviewPhoto(place);
}
