import { fetchJson } from '@/lib/http/fetch-json';
import type { TravelImageCandidate } from '@/lib/images/types';

const USER_AGENT = 'TravelAssistant/1.0 (expo; travel-image openverse)';

type OpenverseResponse = {
  results?: Array<{
    id?: string | number;
    title?: string;
    url?: string;
    thumbnail?: string;
    creator?: string;
    creator_url?: string;
    license?: string;
    license_version?: string;
    foreign_landing_url?: string;
    width?: number;
    height?: number;
  }>;
};

export async function searchOpenverseImages(
  query: string,
  limit = 8,
): Promise<TravelImageCandidate[]> {
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
    const out: TravelImageCandidate[] = [];
    for (const item of data.results ?? []) {
      if (!item.url) continue;
      const license = [item.license, item.license_version].filter(Boolean).join(' ').trim();
      const photographer = item.creator?.trim();
      out.push({
        id: `openverse:${item.id ?? item.url}`,
        url: item.url,
        thumbnailUrl: item.thumbnail ?? item.url,
        width: item.width,
        height: item.height,
        provider: 'openverse',
        photographer,
        photographerUrl: item.creator_url,
        sourceUrl: item.foreign_landing_url,
        license: license || undefined,
        attribution: photographer
          ? `${photographer} · Openverse${license ? ` · ${license}` : ''}`
          : `Openverse${license ? ` · ${license}` : ''}`,
        alt: item.title || query,
        searchQuery: query,
      });
    }
    return out;
  } catch {
    return [];
  }
}
