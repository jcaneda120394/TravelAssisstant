/**
 * Free stock / CC photo search for place cards + galleries.
 * Openverse needs no key. Pexels / Unsplash / Pixabay / Flickr are optional
 * (client EXPO_PUBLIC_* keys or Supabase `stock-photos` Edge secrets).
 */
import { fetchJson } from '@/lib/http/fetch-json';
import { env } from '@/config/env';
import { supabase } from '@/lib/supabase/client';
import type { PlacePhoto } from '@/services/places/place-photos.service';

const USER_AGENT = 'TravelMateAI/1.0 (https://travelmate.app; stock-photos)';

type StockSource = PlacePhoto['source'];

type EdgeStockPayload = {
  photos?: Array<{
    url?: string;
    thumbUrl?: string;
    title?: string;
    source?: string;
    attribution?: string;
    photographer?: string;
  }>;
  providers?: string[];
  error?: string;
};

function asPhoto(
  source: StockSource,
  url: string,
  opts?: {
    thumbUrl?: string;
    title?: string;
    attribution?: string;
    photographer?: string;
  },
): PlacePhoto {
  return {
    url,
    thumbUrl: opts?.thumbUrl ?? url,
    source,
    title: opts?.title,
    attribution: opts?.attribution,
    photographer: opts?.photographer,
  };
}

type OpenverseResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    thumbnail?: string;
    creator?: string;
    license?: string;
    foreign_landing_url?: string;
  }>;
};

export async function openverseSearchPhotos(query: string, limit: number): Promise<PlacePhoto[]> {
  if (!query.trim()) return [];
  const url =
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}` +
    `&page_size=${Math.min(Math.max(limit, 1), 20)}` +
    `&category=photograph&mature=false&filter_dead=true`;
  try {
    const data = await fetchJson<OpenverseResponse>(url, {
      timeoutMs: 8_000,
      cacheTtlMs: 30 * 60_000,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    const photos: PlacePhoto[] = [];
    for (const item of data.results ?? []) {
      if (!item.url) continue;
      const creator = item.creator?.trim();
      photos.push(
        asPhoto('openverse', item.url, {
          thumbUrl: item.thumbnail ?? item.url,
          title: item.title,
          photographer: creator,
          attribution: creator
            ? `${creator} · Openverse${item.license ? ` · ${item.license}` : ''}`
            : `Openverse${item.license ? ` · ${item.license}` : ''}`,
        }),
      );
    }
    return photos;
  } catch {
    return [];
  }
}

type PexelsResponse = {
  photos?: Array<{
    alt?: string;
    photographer?: string;
    url?: string;
    src?: { large2x?: string; large?: string; medium?: string; small?: string };
  }>;
};

export async function pexelsSearchPhotos(query: string, limit: number): Promise<PlacePhoto[]> {
  const key = env.pexelsApiKey?.trim();
  if (!key || !query.trim()) return [];
  const url =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}` +
    `&per_page=${Math.min(Math.max(limit, 1), 15)}&orientation=landscape`;
  try {
    const data = await fetchJson<PexelsResponse>(url, {
      timeoutMs: 8_000,
      cacheTtlMs: 30 * 60_000,
      headers: { Authorization: key, Accept: 'application/json' },
    });
    const photos: PlacePhoto[] = [];
    for (const item of data.photos ?? []) {
      const full = item.src?.large2x ?? item.src?.large ?? item.src?.medium;
      if (!full) continue;
      const photographer = item.photographer?.trim();
      photos.push(
        asPhoto('pexels', full, {
          thumbUrl: item.src?.medium ?? item.src?.small ?? full,
          title: item.alt || photographer || 'Pexels photo',
          photographer,
          attribution: photographer ? `${photographer} · Pexels` : 'Pexels',
        }),
      );
    }
    return photos;
  } catch {
    return [];
  }
}

type UnsplashResponse = {
  results?: Array<{
    description?: string | null;
    alt_description?: string | null;
    user?: { name?: string; links?: { html?: string } };
    urls?: { regular?: string; small?: string; thumb?: string; raw?: string };
    links?: { html?: string };
  }>;
};

export async function unsplashSearchPhotos(query: string, limit: number): Promise<PlacePhoto[]> {
  const key = env.unsplashAccessKey?.trim();
  if (!key || !query.trim()) return [];
  const url =
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}` +
    `&per_page=${Math.min(Math.max(limit, 1), 15)}&orientation=landscape` +
    `&content_filter=high`;
  try {
    const data = await fetchJson<UnsplashResponse>(url, {
      timeoutMs: 8_000,
      cacheTtlMs: 30 * 60_000,
      headers: {
        Authorization: `Client-ID ${key}`,
        'Accept-Version': 'v1',
        Accept: 'application/json',
      },
    });
    const photos: PlacePhoto[] = [];
    for (const item of data.results ?? []) {
      // Hotlink Unsplash CDN URLs (required by Unsplash API guidelines).
      const full = item.urls?.regular ?? item.urls?.raw;
      if (!full) continue;
      const photographer = item.user?.name?.trim();
      photos.push(
        asPhoto('unsplash', full, {
          thumbUrl: item.urls?.small ?? item.urls?.thumb ?? full,
          title: item.alt_description || item.description || photographer || 'Unsplash photo',
          photographer,
          attribution: photographer ? `${photographer} · Unsplash` : 'Unsplash',
        }),
      );
    }
    return photos;
  } catch {
    return [];
  }
}

type PixabayResponse = {
  hits?: Array<{
    largeImageURL?: string;
    webformatURL?: string;
    previewURL?: string;
    tags?: string;
    user?: string;
    pageURL?: string;
  }>;
};

export async function pixabaySearchPhotos(query: string, limit: number): Promise<PlacePhoto[]> {
  const key = env.pixabayApiKey?.trim();
  if (!key || !query.trim()) return [];
  const url =
    `https://pixabay.com/api/?key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(query)}` +
    `&image_type=photo&safesearch=true&orientation=horizontal` +
    `&per_page=${Math.min(Math.max(limit, 3), 20)}`;
  try {
    const data = await fetchJson<PixabayResponse>(url, {
      timeoutMs: 8_000,
      cacheTtlMs: 30 * 60_000,
      headers: { Accept: 'application/json' },
    });
    const photos: PlacePhoto[] = [];
    for (const item of data.hits ?? []) {
      const full = item.largeImageURL ?? item.webformatURL;
      if (!full) continue;
      const photographer = item.user?.trim();
      photos.push(
        asPhoto('pixabay', full, {
          thumbUrl: item.webformatURL ?? item.previewURL ?? full,
          title: item.tags || photographer || 'Pixabay photo',
          photographer,
          attribution: photographer ? `${photographer} · Pixabay` : 'Pixabay',
        }),
      );
    }
    return photos;
  } catch {
    return [];
  }
}

type FlickrResponse = {
  photos?: {
    photo?: Array<{
      id?: string;
      secret?: string;
      server?: string;
      farm?: number;
      title?: string;
      ownername?: string;
      url_c?: string;
      url_l?: string;
      url_m?: string;
      url_n?: string;
    }>;
  };
  stat?: string;
};

/** Flickr CC-licensed photos only (safer for app display). */
export async function flickrSearchPhotos(query: string, limit: number): Promise<PlacePhoto[]> {
  const key = env.flickrApiKey?.trim();
  if (!key || !query.trim()) return [];
  // license: 4,5,6,9,10 = CC Attribution / ShareAlike / NoDerivs / CC0 / Public Domain
  const url =
    `https://www.flickr.com/services/rest/?method=flickr.photos.search` +
    `&api_key=${encodeURIComponent(key)}` +
    `&text=${encodeURIComponent(query)}` +
    `&license=4,5,6,9,10&safe_search=1&content_type=1&media=photos` +
    `&extras=url_c,url_l,url_m,url_n,owner_name` +
    `&per_page=${Math.min(Math.max(limit, 1), 20)}&format=json&nojsoncallback=1`;
  try {
    const data = await fetchJson<FlickrResponse>(url, {
      timeoutMs: 8_000,
      cacheTtlMs: 30 * 60_000,
      headers: { Accept: 'application/json' },
    });
    if (data.stat === 'fail') return [];
    const photos: PlacePhoto[] = [];
    for (const item of data.photos?.photo ?? []) {
      const full = item.url_l ?? item.url_c ?? item.url_m;
      if (!full) continue;
      const photographer = item.ownername?.trim();
      photos.push(
        asPhoto('flickr', full, {
          thumbUrl: item.url_n ?? item.url_m ?? full,
          title: item.title || photographer || 'Flickr photo',
          photographer,
          attribution: photographer ? `${photographer} · Flickr (CC)` : 'Flickr (CC)',
        }),
      );
    }
    return photos;
  } catch {
    return [];
  }
}

/** Prefer server-side keys via Edge Function when Supabase is configured. */
async function stockPhotosViaEdge(query: string, limit: number): Promise<PlacePhoto[]> {
  if (!env.isSupabaseConfigured || !supabase || !query.trim()) return [];
  try {
    const { data, error } = await supabase.functions.invoke<EdgeStockPayload>('stock-photos', {
      body: { query, limit },
    });
    if (error || !data?.photos?.length) return [];
    const allowed = new Set([
      'openverse',
      'pexels',
      'unsplash',
      'pixabay',
      'flickr',
    ]);
    return data.photos
      .filter((p) => p.url && allowed.has(String(p.source ?? '')))
      .map((p) =>
        asPhoto(p.source as StockSource, p.url!, {
          thumbUrl: p.thumbUrl,
          title: p.title,
          attribution: p.attribution,
          photographer: p.photographer,
        }),
      );
  } catch {
    return [];
  }
}

/**
 * Fan-out free stock search. Edge first (when keys live on Supabase),
 * then client Openverse + any EXPO_PUBLIC keys.
 */
export async function searchStockPhotos(query: string, limit = 8): Promise<PlacePhoto[]> {
  if (!query.trim()) return [];

  const edge = await stockPhotosViaEdge(query, limit);
  if (edge.length >= Math.min(3, limit)) {
    return edge.slice(0, limit);
  }

  const batches = await Promise.all([
    openverseSearchPhotos(query, limit),
    pexelsSearchPhotos(query, limit),
    unsplashSearchPhotos(query, limit),
    pixabaySearchPhotos(query, limit),
    flickrSearchPhotos(query, limit),
  ]);

  const merged = [...edge, ...batches.flat()];
  const seen = new Set<string>();
  return merged.filter((photo) => {
    const key = photo.url.split('?')[0]!;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, Math.max(limit, 12));
}
