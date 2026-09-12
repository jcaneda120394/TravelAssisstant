import { fetchJson } from '@/lib/http/fetch-json';

export type DestinationSuggestion = {
  id: string;
  label: string;
  shortName: string;
  kind: 'city' | 'region' | 'country' | 'place';
  latitude: number;
  longitude: number;
  countryCode?: string;
};

type NominatimHit = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  class?: string;
  type?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    country_code?: string;
    name?: string;
  };
};

function kindFromHit(hit: NominatimHit): DestinationSuggestion['kind'] {
  const type = hit.type ?? '';
  if (type === 'country') {
    return 'country';
  }
  if (type === 'state' || type === 'region') {
    return 'region';
  }
  if (['city', 'town', 'village', 'municipality', 'suburb', 'hamlet'].includes(type)) {
    return 'city';
  }
  if (hit.class === 'place') {
    return 'city';
  }
  if (hit.class === 'boundary' && type === 'administrative') {
    if (hit.address?.country && !hit.address?.state && !hit.address?.city) {
      return 'country';
    }
    return 'region';
  }
  return 'place';
}

function shortNameFromHit(hit: NominatimHit): string {
  const address = hit.address;
  return (
    address?.city ||
    address?.town ||
    address?.village ||
    address?.municipality ||
    address?.state ||
    address?.country ||
    address?.name ||
    hit.display_name.split(',')[0] ||
    'Place'
  );
}

function labelFromHit(hit: NominatimHit): string {
  const address = hit.address;
  const city =
    address?.city || address?.town || address?.village || address?.municipality || address?.name;
  const state = address?.state;
  const country = address?.country;
  return [city, state, country].filter(Boolean).join(', ') || hit.display_name;
}

function isUsefulHit(hit: NominatimHit): boolean {
  const type = hit.type ?? '';
  const cls = hit.class ?? '';
  if (cls === 'place') return true;
  if (cls === 'boundary' && type === 'administrative') return true;
  if (['country', 'state', 'city', 'town', 'village', 'municipality', 'region'].includes(type)) {
    return true;
  }
  return false;
}

export async function searchDestinations(query: string): Promise<DestinationSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1` +
    `&limit=12&q=${encodeURIComponent(q)}`;

  const results = await fetchJson<NominatimHit[]>(url, {
    cacheTtlMs: 5 * 60_000,
    timeoutMs: 12_000,
  });

  const mapped = results
    .filter(isUsefulHit)
    .map((hit) => {
      const kind = kindFromHit(hit);
      return {
        id: `nom-${hit.place_id}`,
        label: labelFromHit(hit),
        shortName: shortNameFromHit(hit),
        kind,
        latitude: Number(hit.lat),
        longitude: Number(hit.lon),
        countryCode: hit.address?.country_code?.toUpperCase(),
      } satisfies DestinationSuggestion;
    });

  // Prefer countries/cities, de-dupe by label.
  const ranked = [...mapped].sort((a, b) => {
    const rank = (kind: DestinationSuggestion['kind']) =>
      kind === 'city' ? 0 : kind === 'country' ? 1 : kind === 'region' ? 2 : 3;
    return rank(a.kind) - rank(b.kind);
  });

  const seen = new Set<string>();
  return ranked.filter((item) => {
    const key = item.label.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, 8);
}
