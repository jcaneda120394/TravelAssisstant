import type { GetTravelImageInput, TravelImageType } from '@/lib/images/types';

function clean(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STREETISH =
  /^(phố|pho\b|street|st\.|road|rd\.|avenue|ave\.|lane|đường|duong|hang |tong |alley)/i;

export function isBusinessPlaceType(type: string | null | undefined): boolean {
  const t = (type ?? '').toLowerCase();
  return /^(restaurant|cafe|bakery|hotel|resort|nightlife|spa|gym|convenience|pharmacy|atm|bank|laundry|coworking)$/.test(
    t,
  );
}

export function typeKeywords(type: string | null | undefined): string {
  const t = (type ?? 'other').toLowerCase() as TravelImageType | string;
  switch (t) {
    case 'restaurant':
      return 'restaurant food dining';
    case 'cafe':
      return 'cafe coffee shop interior';
    case 'bakery':
      return 'bakery pastry cafe';
    case 'hotel':
    case 'resort':
      return 'hotel building exterior';
    case 'beach':
      return 'beach travel';
    case 'temple':
      return 'church cathedral basilica temple shrine';
    case 'museum':
      return 'museum landmark';
    case 'park':
      return 'park garden travel';
    case 'market':
      return 'market street food';
    case 'nightlife':
      return 'bar nightlife';
    case 'viewpoint':
      return 'viewpoint landscape travel';
    case 'city':
    case 'destination':
      return 'travel city skyline';
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
 */
export function buildImageSearchQuery(input: GetTravelImageInput): string {
  const name = clean(input.name);
  const city = clean(input.city ?? undefined);
  const country = clean(input.country ?? undefined);
  const keywords = typeKeywords(input.type);
  return [name, city, country, keywords].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Progressive query simplification.
 * Businesses never fall back to country-only queries (avoids "Vietnam memorial" for cafes).
 */
export function buildImageQueryLadder(input: GetTravelImageInput): string[] {
  const name = clean(input.name);
  const city = clean(input.city ?? undefined);
  const country = clean(input.country ?? undefined);
  const keywords = typeKeywords(input.type);
  const business = isBusinessPlaceType(input.type);

  const nameCore = name
    .split(/\s+/)
    .filter((token) => !/^(the|and|of|at|in|a|an)$/i.test(token))
    .slice(0, 5)
    .join(' ');

  const ladder = business
    ? [
        [name, city, keywords].filter(Boolean).join(' '),
        [name, city, country].filter(Boolean).join(' '),
        [nameCore || name, city].filter(Boolean).join(' '),
        [name, keywords].filter(Boolean).join(' '),
        // Atmosphere last — city + venue type, never country alone.
        city ? `${city} ${keywords}` : '',
      ]
    : [
        [name, city, country, keywords].filter(Boolean).join(' '),
        [name, city, country].filter(Boolean).join(' '),
        [nameCore || name, city].filter(Boolean).join(' '),
        [nameCore || name, country].filter(Boolean).join(' '),
        city ? `${city} ${keywords}` : '',
        city && country ? `${city} ${country} travel` : '',
        nameCore || name,
      ];

  return [
    ...new Set(
      ladder
        .map((q) => q.replace(/\s+/g, ' ').trim())
        .filter((q) => q.length >= 3),
    ),
  ];
}

/** Stable cache key — versioned so bad older matches are not reused. */
export function buildPlaceImageCacheKey(input: GetTravelImageInput): string {
  const parts = ['v2', input.name, input.city, input.country, input.type]
    .map((part) => clean(String(part ?? '')).toLowerCase())
    .filter(Boolean)
    .join('-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
  return parts || 'v2-unknown-place';
}

/**
 * Parse address into city + country.
 * Prefers real city names over street segments ("Phố …", "Hang Manh Street").
 */
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

  const country = parts[parts.length - 1];
  const beforeCountry = parts.slice(0, -1).filter((p) => !STREETISH.test(p));
  // Prefer plain city names over "Thành phố …" province labels.
  const plainCities = beforeCountry.filter((p) => !/^thành phố\s+/i.test(p));
  const rawCity =
    plainCities[plainCities.length - 1] ?? beforeCountry[beforeCountry.length - 1] ?? parts[0] ?? '';
  const city = rawCity
    .replace(/^thành phố\s+/i, '')
    .replace(/^tp\.?\s+/i, '')
    .trim();
  return { city: city || undefined, country };
}
