import type { TravelImageCandidate } from '@/lib/images/types';

const MIN_WIDTH = 640;
const BAD_EXT = /\.(svg)(\?|$)/i;
const BAD_TITLE =
  /\b(logo|icon|wordmark|flag|coat of arms|diagram|map of|svg|placeholder|sprite)\b/i;

export function isExcluded(
  candidate: TravelImageCandidate,
  excludeUrls?: string[],
  excludeIds?: string[],
): boolean {
  if (excludeIds?.length && excludeIds.includes(candidate.id)) return true;
  if (!excludeUrls?.length) return false;
  const url = candidate.url.split('?')[0]!;
  return excludeUrls.some((blocked) => {
    const b = blocked.split('?')[0]!;
    return b === url || candidate.url.includes(b) || b.includes(url);
  });
}

export function isAcceptableTravelImage(candidate: TravelImageCandidate): boolean {
  if (!candidate.url || !/^https?:\/\//i.test(candidate.url)) return false;
  if (BAD_EXT.test(candidate.url)) return false;
  if (BAD_TITLE.test(candidate.alt) || BAD_TITLE.test(candidate.searchQuery)) return false;
  if (candidate.width != null && candidate.width > 0 && candidate.width < MIN_WIDTH) {
    return false;
  }
  if (candidate.height != null && candidate.width != null && candidate.width > 0) {
    const ratio = candidate.width / candidate.height;
    // Reject extremely tall/narrow or tiny thumbnails masquerading as photos.
    if (ratio < 0.45 || ratio > 3.2) return false;
  }
  return true;
}

/** Prefer landscape, higher res, keyword hits in alt. */
export function scoreTravelImage(
  candidate: TravelImageCandidate,
  query: string,
): number {
  let score = 0.4;
  const hay = `${candidate.alt} ${candidate.searchQuery}`.toLowerCase();
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length >= 3);
  const hits = tokens.filter((t) => hay.includes(t)).length;
  if (tokens.length) score += Math.min(0.4, (hits / tokens.length) * 0.4);

  if (candidate.width && candidate.height) {
    const ratio = candidate.width / candidate.height;
    if (ratio >= 1.2 && ratio <= 2.2) score += 0.15;
    if (candidate.width >= 1200) score += 0.1;
    else if (candidate.width >= 800) score += 0.05;
  } else {
    score += 0.05;
  }

  if (candidate.provider === 'pexels') score += 0.05;
  if (candidate.provider === 'unsplash') score += 0.03;

  return Math.min(1, score);
}

export function pickBestCandidate(
  candidates: TravelImageCandidate[],
  query: string,
  excludeUrls?: string[],
  excludeIds?: string[],
): TravelImageCandidate | null {
  const ranked = candidates
    .filter((c) => !isExcluded(c, excludeUrls, excludeIds))
    .filter(isAcceptableTravelImage)
    .map((c) => ({ ...c, score: scoreTravelImage(c, query) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return ranked[0] ?? null;
}
