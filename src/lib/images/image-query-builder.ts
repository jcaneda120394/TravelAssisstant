import type { GetTravelImageInput, TravelImageType } from '@/lib/images/types';

function clean(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function typeKeywords(type: string | null | undefined): string {
  const t = (type ?? 'other').toLowerCase() as TravelImageType | string;
  switch (t) {
    case 'restaurant':
    case 'cafe':
    case 'bakery':
      return 'food restaurant';
    case 'hotel':
    case 'resort':
      return 'hotel travel';
    case 'beach':
      return 'beach travel';
    case 'temple':
      return 'temple shrine landmark';
    case 'museum':
      return 'museum landmark';
    case 'park':
      return 'park garden travel';
    case 'market':
      return 'market street food';
    case 'nightlife':
      return 'nightlife city';
    case 'viewpoint':
      return 'viewpoint landscape travel';
    case 'city':
    case 'destination':
      return 'travel city';
    case 'country':
      return 'travel destination';
    case 'landmark':
    case 'attraction':
    case 'activity':
      return 'travel landmark';
    default:
      return 'travel';
  }
}

/**
 * Build the preferred image search query from place context.
 * Example: "Shibuya Crossing Tokyo Japan travel landmark"
 */
export function buildImageSearchQuery(input: GetTravelImageInput): string {
  const name = clean(input.name);
  const city = clean(input.city ?? undefined);
  const country = clean(input.country ?? undefined);
  const keywords = typeKeywords(input.type);
  return [name, city, country, keywords].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Progressive query simplification when exact search returns nothing.
 * Exact → name+city → name+country → city+country travel → city travel
 */
export function buildImageQueryLadder(input: GetTravelImageInput): string[] {
  const name = clean(input.name);
  const city = clean(input.city ?? undefined);
  const country = clean(input.country ?? undefined);
  const keywords = typeKeywords(input.type);

  const nameCore = name
    .split(/\s+/)
    .filter((token) => !/^(the|and|of|at|in|a|an)$/i.test(token))
    .slice(0, 4)
    .join(' ');

  const ladder = [
    [name, city, country, keywords].filter(Boolean).join(' '),
    [name, city, country].filter(Boolean).join(' '),
    [nameCore || name, city].filter(Boolean).join(' '),
    [nameCore || name, country].filter(Boolean).join(' '),
    city && country ? `${city} ${country} travel` : '',
    city ? `${city} ${keywords}` : '',
    country ? `${country} travel` : '',
    nameCore || name,
  ]
    .map((q) => q.replace(/\s+/g, ' ').trim())
    .filter((q) => q.length >= 2);

  return [...new Set(ladder)];
}

/** Stable cache key: shibuya-crossing-tokyo-japan */
export function buildPlaceImageCacheKey(input: GetTravelImageInput): string {
  const parts = [input.name, input.city, input.country, input.type]
    .map((part) => clean(String(part ?? '')).toLowerCase())
    .filter(Boolean)
    .join('-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
  return parts || 'unknown-place';
}

/** Parse "Sa Pa, Vietnam" / "Asakusa, Tokyo, Japan" into city + country. */
export function parseCityCountryFromAddress(address?: string | null): {
  city?: string;
  country?: string;
} {
  if (!address?.trim()) return {};
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { city: parts[0] };
  return {
    city: parts[0],
    country: parts[parts.length - 1],
  };
}
