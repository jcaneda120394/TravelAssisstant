import { fetchJson } from '@/lib/http/fetch-json';
import type { Place } from '@/types/domain';

export type PlacePhoto = {
  url: string;
  thumbUrl?: string;
  source: 'place' | 'wikipedia' | 'commons' | 'map' | 'community';
  title?: string;
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

function cleanSearchName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cityHint(place: Place): string {
  const fromAddress = place.address?.split(',').map((p) => p.trim()).filter(Boolean) ?? [];
  // Prefer last-ish locality tokens (city / country).
  const candidates = fromAddress.slice(-3);
  return candidates.slice(0, 2).join(' ');
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

async function wikipediaSearchPhotos(query: string, limit: number): Promise<PlacePhoto[]> {
  if (!query.trim()) return [];
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&prop=pageimages&piprop=thumbnail|original&pithumbsize=900` +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}`;
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
    `&prop=pageimages&piprop=thumbnail|original&pithumbsize=900` +
    `&generator=geosearch&ggscoord=${latitude}|${longitude}&ggsradius=2500&ggslimit=${limit}`;
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
      if (/logo|icon|map\.svg|flag|coat of arms/.test(title)) continue;
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

/** Simple map preview when no photos exist (still better than an empty gallery). */
function mapPreviewPhoto(place: Place): PlacePhoto {
  const lat = place.latitude.toFixed(5);
  const lon = place.longitude.toFixed(5);
  // Wikimedia/OSM-friendly static preview via openstreetmap staticmap service.
  const url =
    `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}` +
    `&zoom=16&size=800x480&maptype=mapnik&markers=${lat},${lon},lightblue1`;
  return {
    url,
    source: 'map',
    title: 'Map preview',
  };
}

/**
 * Resolve a few photos for a place detail screen.
 * Uses existing Place.photos first, then Wikipedia / Wikimedia Commons (free, no API key).
 */
export async function fetchPlacePhotos(place: Place, limit = 6): Promise<PlacePhoto[]> {
  const existing = (place.photos ?? [])
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url))
    .map((url) => ({ url, source: 'place' as const }));

  if (existing.length >= limit) {
    return existing.slice(0, limit);
  }

  const name = cleanSearchName(displayNameForSearch(place));
  const city = cityHint(place);
  const queries = [
    [name, city].filter(Boolean).join(' '),
    name,
    city ? `${name} ${city.split(' ')[0]}` : '',
  ].filter((q, index, arr) => q.length >= 3 && arr.indexOf(q) === index);

  const [wikiNamed, wikiGeo, commons] = await Promise.all([
    wikipediaSearchPhotos(queries[0] ?? name, limit),
    Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
      ? wikipediaGeoPhotos(place.latitude, place.longitude, limit)
      : Promise.resolve([] as PlacePhoto[]),
    commonsSearchPhotos(queries[0] ?? name, limit),
  ]);

  // Prefer exact-name Wikipedia hits, then nearby geo pages, then Commons.
  let merged = dedupePhotos([...existing, ...wikiNamed, ...wikiGeo, ...commons]);

  if (merged.length < 2 && queries[1] && queries[1] !== queries[0]) {
    const extra = await Promise.all([
      wikipediaSearchPhotos(queries[1], 4),
      commonsSearchPhotos(queries[1], 4),
    ]);
    merged = dedupePhotos([...merged, ...extra.flat()]);
  }

  if (merged.length === 0) {
    return [mapPreviewPhoto(place)];
  }

  return merged.slice(0, limit);
}

function displayNameForSearch(place: Place): string {
  // Prefer English / short display name without bilingual duplicate.
  const english = place.nameEnglish?.trim();
  if (english) return english;
  const raw = place.name?.trim() ?? '';
  // "Original (English)" → English
  const paren = raw.match(/\(([^)]+)\)\s*$/);
  if (paren?.[1] && /[A-Za-z]/.test(paren[1])) {
    return paren[1].trim();
  }
  return raw;
}
