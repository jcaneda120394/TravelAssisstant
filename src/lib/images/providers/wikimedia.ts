import { fetchJson } from '@/lib/http/fetch-json';
import type { TravelImageCandidate } from '@/lib/images/types';

const USER_AGENT = 'TravelAssistant/1.0 (expo; travel-image wikimedia)';

type WikiQueryResponse = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        pageid?: number;
        thumbnail?: { source?: string; width?: number; height?: number };
        original?: { source?: string; width?: number; height?: number };
        imageinfo?: Array<{
          url?: string;
          thumburl?: string;
          width?: number;
          height?: number;
          mime?: string;
          descriptionurl?: string;
        }>;
      }
    >;
  };
};

export async function searchWikimediaImages(
  query: string,
  limit = 8,
): Promise<TravelImageCandidate[]> {
  if (!query.trim()) return [];
  const commonsUrl =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrlimit=${Math.min(Math.max(limit, 1), 12)}` +
    `&prop=imageinfo&iiprop=url|mime|size|extmetadata&iiurlwidth=1200`;

  const wikiUrl =
    `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*` +
    `&prop=pageimages&piprop=thumbnail|original&pithumbsize=1200` +
    `&generator=search&gsrsearch=${encodeURIComponent(`intitle:${query}`)}` +
    `&gsrlimit=${Math.min(Math.max(limit, 1), 8)}`;

  const out: TravelImageCandidate[] = [];

  try {
    const data = await fetchJson<WikiQueryResponse>(commonsUrl, {
      timeoutMs: 8_000,
      cacheTtlMs: 30 * 60_000,
      headers: { 'User-Agent': USER_AGENT },
    });
    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      if (!info?.url) continue;
      if (info.mime && !info.mime.startsWith('image/')) continue;
      if (/\.svg(\?|$)/i.test(info.url)) continue;
      out.push({
        id: `wikimedia:${page.pageid ?? info.url}`,
        url: info.url,
        thumbnailUrl: info.thumburl ?? info.url,
        width: info.width,
        height: info.height,
        provider: 'wikimedia',
        sourceUrl: info.descriptionurl,
        attribution: 'Wikimedia Commons',
        license: 'Wikimedia',
        alt: page.title?.replace(/^File:/, '') || query,
        searchQuery: query,
      });
    }
  } catch {
    // continue to Wikipedia pages
  }

  if (out.length < 2) {
    try {
      const data = await fetchJson<WikiQueryResponse>(wikiUrl, {
        timeoutMs: 8_000,
        cacheTtlMs: 30 * 60_000,
        headers: { 'User-Agent': USER_AGENT },
      });
      for (const page of Object.values(data.query?.pages ?? {})) {
        const full = page.original?.source ?? page.thumbnail?.source;
        if (!full) continue;
        if (/\.svg(\?|$)/i.test(full)) continue;
        out.push({
          id: `wikimedia:wiki:${page.pageid ?? full}`,
          url: full,
          thumbnailUrl: page.thumbnail?.source ?? full,
          width: page.original?.width ?? page.thumbnail?.width,
          height: page.original?.height ?? page.thumbnail?.height,
          provider: 'wikimedia',
          attribution: 'Wikipedia',
          license: 'Wikipedia',
          alt: page.title || query,
          searchQuery: query,
        });
      }
    } catch {
      // ignore
    }
  }

  return out;
}
