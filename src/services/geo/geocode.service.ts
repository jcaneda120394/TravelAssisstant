import { fetchJson } from '@/lib/http/fetch-json';
import { fetchNominatimJson } from '@/lib/http/nominatim';

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

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

/** Always-available destinations so city search works even when Nominatim is rate-limited. */
export const LOCAL_DESTINATIONS: DestinationSuggestion[] = [
  {
    id: 'local-sjdm',
    label: 'San Jose del Monte, Bulacan, Philippines',
    shortName: 'San Jose del Monte',
    kind: 'city',
    latitude: 14.8139,
    longitude: 121.0453,
    countryCode: 'PH',
  },
  {
    id: 'local-malolos',
    label: 'Malolos, Bulacan, Philippines',
    shortName: 'Malolos',
    kind: 'city',
    latitude: 14.8433,
    longitude: 120.8114,
    countryCode: 'PH',
  },
  {
    id: 'local-meycauayan',
    label: 'Meycauayan, Bulacan, Philippines',
    shortName: 'Meycauayan',
    kind: 'city',
    latitude: 14.7369,
    longitude: 120.9608,
    countryCode: 'PH',
  },
  {
    id: 'local-marilao',
    label: 'Marilao, Bulacan, Philippines',
    shortName: 'Marilao',
    kind: 'city',
    latitude: 14.7578,
    longitude: 120.9483,
    countryCode: 'PH',
  },
  {
    id: 'local-bulacan',
    label: 'Bulacan, Philippines',
    shortName: 'Bulacan',
    kind: 'region',
    latitude: 14.7943,
    longitude: 120.8799,
    countryCode: 'PH',
  },
  {
    id: 'local-manila',
    label: 'Manila, Metro Manila, Philippines',
    shortName: 'Manila',
    kind: 'city',
    latitude: 14.5995,
    longitude: 120.9842,
    countryCode: 'PH',
  },
  {
    id: 'local-qc',
    label: 'Quezon City, Metro Manila, Philippines',
    shortName: 'Quezon City',
    kind: 'city',
    latitude: 14.676,
    longitude: 121.0437,
    countryCode: 'PH',
  },
  {
    id: 'local-makati',
    label: 'Makati, Metro Manila, Philippines',
    shortName: 'Makati',
    kind: 'city',
    latitude: 14.5547,
    longitude: 121.0244,
    countryCode: 'PH',
  },
  {
    id: 'local-taguig',
    label: 'Taguig, Metro Manila, Philippines',
    shortName: 'Taguig',
    kind: 'city',
    latitude: 14.5176,
    longitude: 121.0509,
    countryCode: 'PH',
  },
  {
    id: 'local-pasig',
    label: 'Pasig, Metro Manila, Philippines',
    shortName: 'Pasig',
    kind: 'city',
    latitude: 14.5764,
    longitude: 121.0851,
    countryCode: 'PH',
  },
  {
    id: 'local-cebu',
    label: 'Cebu City, Cebu, Philippines',
    shortName: 'Cebu City',
    kind: 'city',
    latitude: 10.3157,
    longitude: 123.8854,
    countryCode: 'PH',
  },
  {
    id: 'local-davao',
    label: 'Davao City, Davao del Sur, Philippines',
    shortName: 'Davao City',
    kind: 'city',
    latitude: 7.1907,
    longitude: 125.4553,
    countryCode: 'PH',
  },
  {
    id: 'local-baguio',
    label: 'Baguio, Benguet, Philippines',
    shortName: 'Baguio',
    kind: 'city',
    latitude: 16.4023,
    longitude: 120.596,
    countryCode: 'PH',
  },
  {
    id: 'local-sorsogon-city',
    label: 'Sorsogon City, Sorsogon, Philippines',
    shortName: 'Sorsogon City',
    kind: 'city',
    latitude: 12.9742,
    longitude: 124.0048,
    countryCode: 'PH',
  },
  {
    id: 'local-barcelona-sorsogon',
    label: 'Barcelona, Sorsogon, Philippines',
    shortName: 'Barcelona',
    kind: 'city',
    latitude: 12.8692,
    longitude: 124.1418,
    countryCode: 'PH',
  },
  {
    id: 'local-gubat',
    label: 'Gubat, Sorsogon, Philippines',
    shortName: 'Gubat',
    kind: 'city',
    latitude: 12.9185,
    longitude: 124.123,
    countryCode: 'PH',
  },
  {
    id: 'local-donsol',
    label: 'Donsol, Sorsogon, Philippines',
    shortName: 'Donsol',
    kind: 'city',
    latitude: 12.9082,
    longitude: 123.5978,
    countryCode: 'PH',
  },
  {
    id: 'local-bulusan',
    label: 'Bulusan, Sorsogon, Philippines',
    shortName: 'Bulusan',
    kind: 'city',
    latitude: 12.7518,
    longitude: 124.1565,
    countryCode: 'PH',
  },
  {
    id: 'local-legazpi',
    label: 'Legazpi, Albay, Philippines',
    shortName: 'Legazpi',
    kind: 'city',
    latitude: 13.1391,
    longitude: 123.7438,
    countryCode: 'PH',
  },
  {
    id: 'local-japan',
    label: 'Japan',
    shortName: 'Japan',
    kind: 'country',
    latitude: 36.2048,
    longitude: 138.2529,
    countryCode: 'JP',
  },
  {
    id: 'local-tokyo',
    label: 'Tokyo, Japan',
    shortName: 'Tokyo',
    kind: 'city',
    latitude: 35.6762,
    longitude: 139.6503,
    countryCode: 'JP',
  },
  {
    id: 'local-osaka',
    label: 'Osaka, Japan',
    shortName: 'Osaka',
    kind: 'city',
    latitude: 34.6937,
    longitude: 135.5023,
    countryCode: 'JP',
  },
  {
    id: 'local-kyoto',
    label: 'Kyoto, Japan',
    shortName: 'Kyoto',
    kind: 'city',
    latitude: 35.0116,
    longitude: 135.7681,
    countryCode: 'JP',
  },
  {
    id: 'local-hk',
    label: 'Hong Kong',
    shortName: 'Hong Kong',
    kind: 'city',
    latitude: 22.3193,
    longitude: 114.1694,
    countryCode: 'HK',
  },
  {
    id: 'local-singapore',
    label: 'Singapore',
    shortName: 'Singapore',
    kind: 'city',
    latitude: 1.3521,
    longitude: 103.8198,
    countryCode: 'SG',
  },
  {
    id: 'local-bangkok',
    label: 'Bangkok, Thailand',
    shortName: 'Bangkok',
    kind: 'city',
    latitude: 13.7563,
    longitude: 100.5018,
    countryCode: 'TH',
  },
  {
    id: 'local-seoul',
    label: 'Seoul, South Korea',
    shortName: 'Seoul',
    kind: 'city',
    latitude: 37.5665,
    longitude: 126.978,
    countryCode: 'KR',
  },
  {
    id: 'local-hanoi',
    label: 'Hanoi, Vietnam',
    shortName: 'Hanoi',
    kind: 'city',
    latitude: 21.0285,
    longitude: 105.8542,
    countryCode: 'VN',
  },
  {
    id: 'local-hcmc',
    label: 'Ho Chi Minh City, Vietnam',
    shortName: 'Ho Chi Minh City',
    kind: 'city',
    latitude: 10.8231,
    longitude: 106.6297,
    countryCode: 'VN',
  },
  {
    id: 'local-danang',
    label: 'Da Nang, Vietnam',
    shortName: 'Da Nang',
    kind: 'city',
    latitude: 16.0544,
    longitude: 108.2022,
    countryCode: 'VN',
  },
  {
    id: 'local-hoian',
    label: 'Hoi An, Vietnam',
    shortName: 'Hoi An',
    kind: 'city',
    latitude: 15.8801,
    longitude: 108.338,
    countryCode: 'VN',
  },
  {
    id: 'local-sapa',
    label: 'Sa Pa, Lao Cai, Vietnam',
    shortName: 'Sa Pa',
    kind: 'city',
    latitude: 22.3364,
    longitude: 103.8438,
    countryCode: 'VN',
  },
  {
    id: 'local-vietnam',
    label: 'Vietnam',
    shortName: 'Vietnam',
    kind: 'country',
    latitude: 21.0285,
    longitude: 105.8542,
    countryCode: 'VN',
  },
];

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
  if (hit.class === 'landuse' && ['residential', 'commercial', 'retail'].includes(type)) {
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
  const namedFromDisplay = hit.display_name.split(',')[0]?.trim();
  // Prefer the named POI (theme park, landmark) over the containing city.
  if (hit.class && !['place', 'boundary', 'administrative'].includes(hit.class)) {
    const named = address?.name || namedFromDisplay;
    if (named?.trim()) {
      return named.trim();
    }
  }
  return (
    address?.name ||
    namedFromDisplay ||
    address?.city ||
    address?.town ||
    address?.village ||
    address?.municipality ||
    address?.state ||
    address?.country ||
    'Place'
  );
}

function labelFromHit(hit: NominatimHit): string {
  const address = hit.address;
  const primary =
    address?.name ||
    hit.display_name.split(',')[0]?.trim() ||
    address?.city ||
    address?.town ||
    address?.village ||
    address?.municipality;
  const city =
    address?.city || address?.town || address?.village || address?.municipality;
  const state = address?.state;
  const country = address?.country;
  const parts = [primary];
  if (city && city !== primary) parts.push(city);
  if (state) parts.push(state);
  if (country) parts.push(country);
  return parts.filter(Boolean).join(', ') || hit.display_name;
}

function isUsefulHit(hit: NominatimHit, includePlaces: boolean): boolean {
  const type = hit.type ?? '';
  const cls = hit.class ?? '';
  const addresstype = (hit as { addresstype?: string }).addresstype ?? '';

  if (cls === 'place') return true;
  if (cls === 'boundary' && type === 'administrative') return true;
  if (
    [
      'country',
      'state',
      'city',
      'town',
      'village',
      'municipality',
      'region',
      'hamlet',
      'suburb',
      'neighbourhood',
      'quarter',
      'locality',
    ].includes(type)
  ) {
    return true;
  }
  if (
    ['city', 'town', 'village', 'municipality', 'suburb', 'neighbourhood', 'county', 'state', 'country'].includes(
      addresstype,
    )
  ) {
    return true;
  }
  // Named settlement areas (Sa Pa often returns as landuse=residential).
  if (
    cls === 'landuse' &&
    ['residential', 'commercial', 'retail', 'recreation_ground', 'village_green'].includes(type) &&
    Boolean(hit.display_name || hit.address?.name || hit.address?.city)
  ) {
    return true;
  }
  if (!includePlaces) {
    return false;
  }
  if (['tourism', 'leisure', 'amenity', 'historic', 'attraction', 'aeroway'].includes(cls)) {
    return true;
  }
  if (cls === 'landuse') {
    return Boolean(hit.display_name);
  }
  if (cls === 'railway' && (type === 'station' || type === 'halt')) {
    return true;
  }
  if (cls === 'shop' || cls === 'building') {
    return Boolean(hit.display_name);
  }
  return false;
}

function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchLocalDestinations(query: string): DestinationSuggestion[] {
  const q = normalizeQuery(query);
  if (q.length < 2) {
    return [];
  }
  const tokens = q.split(' ').filter(Boolean);
  const compact = (value: string) => normalizeQuery(value).replace(/\s+/g, '');

  return LOCAL_DESTINATIONS.filter((item) => {
    const hay = normalizeQuery(`${item.shortName} ${item.label}`);
    const hayCompact = compact(`${item.shortName} ${item.label}`);
    // Ambiguous short names (Barcelona, Springfield…) must match an extra token
    // from the full label unless the query already includes country/region context.
    const ambiguous =
      item.shortName.toLowerCase() === 'barcelona' ||
      normalizeQuery(item.shortName).split(' ').length === 1;
    if (ambiguous && tokens.length === 1 && normalizeQuery(item.shortName) === tokens[0]) {
      // Bare "Barcelona" — only keep if label is uniquely that shortName worldwide;
      // prefer requiring region/country for known homonyms.
      if (item.id.includes('barcelona-sorsogon') || item.id.includes('barcelona')) {
        return false;
      }
    }
    return tokens.every(
      (token) => hay.includes(token) || hayCompact.includes(compact(token)),
    );
  }).slice(0, 8);
}

function dedupeSuggestions(items: DestinationSuggestion[]): DestinationSuggestion[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.label.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

type SearchDestinationsOptions = {
  /** Include theme parks, landmarks, stations, and other POIs (not only cities). */
  includePlaces?: boolean;
  /** Bias results toward a map location (e.g. current GPS). */
  near?: { latitude: number; longitude: number };
};

function placeQualityRank(item: DestinationSuggestion): number {
  const hay = `${item.shortName} ${item.label}`.toLowerCase();
  if (hay.includes('theme park') || item.kind === 'place' && hay.includes('universal studios')) {
    return 0;
  }
  if (item.kind === 'place') return 1;
  if (item.kind === 'city') return 2;
  if (item.kind === 'region') return 3;
  return 4;
}

async function searchNominatimDestinations(
  query: string,
  options: SearchDestinationsOptions = {},
): Promise<DestinationSuggestion[]> {
  const includePlaces = Boolean(options.includePlaces);
  let url =
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1` +
    `&limit=12&q=${encodeURIComponent(query)}`;
  if (options.near) {
    const { latitude, longitude } = options.near;
    const d = 0.35;
    url +=
      `&viewbox=${longitude - d},${latitude + d},${longitude + d},${latitude - d}` +
      `&bounded=0`;
  }

  const results = await fetchNominatimJson<NominatimHit[]>(url, {
    cacheTtlMs: 10 * 60_000,
    timeoutMs: 10_000,
  });

  return results
    .filter((hit) => isUsefulHit(hit, includePlaces))
    .map((hit) => {
      const kind = kindFromHit(hit);
      return {
        id: `nom-${hit.place_id}`,
        label: includePlaces ? hit.display_name : labelFromHit(hit),
        shortName: shortNameFromHit(hit),
        kind,
        latitude: Number(hit.lat),
        longitude: Number(hit.lon),
        countryCode: hit.address?.country_code?.toUpperCase(),
      } satisfies DestinationSuggestion;
    });
}

async function searchPhotonDestinations(
  query: string,
  options: SearchDestinationsOptions = {},
): Promise<DestinationSuggestion[]> {
  const includePlaces = Boolean(options.includePlaces);
  let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=12`;
  if (options.near) {
    url += `&lat=${options.near.latitude}&lon=${options.near.longitude}`;
  }
  const data = await fetchJson<PhotonResponse>(url, {
    cacheTtlMs: 10 * 60_000,
    timeoutMs: 8_000,
  });

  const cityTypes = new Set([
    'city',
    'town',
    'village',
    'municipality',
    'county',
    'state',
    'country',
    'district',
    'locality',
  ]);
  const poiKeys = new Set([
    'tourism',
    'leisure',
    'amenity',
    'historic',
    'railway',
    'aeroway',
    'attraction',
    'shop',
    'landuse',
  ]);

  return (data.features ?? [])
    .map((feature, index): DestinationSuggestion | null => {
      const props = feature.properties ?? {};
      const coords = feature.geometry?.coordinates;
      if (!coords || !props.name) {
        return null;
      }
      const type = (props.type ?? '').toLowerCase();
      const osmKey = (props.osm_key ?? '').toLowerCase();
      const osmValue = (props.osm_value ?? '').toLowerCase();

      if (includePlaces) {
        // Photon often tags theme parks as type=house — keep those when osm_key is a POI.
        if (osmKey === 'highway' || type === 'street' || type === 'highway') {
          return null;
        }
        if (type === 'house' && !poiKeys.has(osmKey)) {
          return null;
        }
      } else if (type && !cityTypes.has(type)) {
        // Photon often returns highways/POIs for city names — skip those.
        return null;
      }

      const [lon, lat] = coords;
      const label = [props.name, props.city, props.state, props.country].filter(Boolean).join(', ');
      const isPoi =
        includePlaces &&
        (poiKeys.has(osmKey) ||
          osmValue === 'theme_park' ||
          osmValue === 'attraction' ||
          (type === 'house' && poiKeys.has(osmKey)));
      const kind: DestinationSuggestion['kind'] =
        type === 'country'
          ? 'country'
          : type === 'state' || type === 'county'
            ? 'region'
            : isPoi || (includePlaces && type && !cityTypes.has(type))
              ? 'place'
              : 'city';
      return {
        id: `photon-${props.osm_id ?? index}`,
        label,
        shortName: props.name,
        kind,
        latitude: lat,
        longitude: lon,
        countryCode: props.countrycode?.toUpperCase(),
      };
    })
    .filter((item): item is DestinationSuggestion => item != null);
}

export async function searchDestinations(
  query: string,
  options: SearchDestinationsOptions = {},
): Promise<DestinationSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }

  const local = searchLocalDestinations(q);
  const includePlaces = Boolean(options.includePlaces);
  const limit = includePlaces ? 12 : 10;

  // Always query Nominatim + Photon in parallel so worldwide cities work
  // even when one provider is down / rate-limited / filters oddly.
  const [nominatim, photon] = await Promise.all([
    searchNominatimDestinations(q, options).catch(() => [] as DestinationSuggestion[]),
    searchPhotonDestinations(q, options).catch(() => [] as DestinationSuggestion[]),
  ]);

  let merged = dedupeSuggestions([...local, ...nominatim, ...photon]);
  if (includePlaces) {
    merged = merged.sort((a, b) => placeQualityRank(a) - placeQualityRank(b));
  } else {
    // Location picker: prefer cities/regions over stray POIs.
    merged = merged.sort((a, b) => {
      const rank = (k: DestinationSuggestion['kind']) =>
        k === 'city' ? 0 : k === 'region' ? 1 : k === 'country' ? 2 : 3;
      return rank(a.kind) - rank(b.kind);
    });
  }

  if (merged.length > 0) {
    return merged.slice(0, limit);
  }

  // Last resort: looser Nominatim query (drop feature-type filter by including places).
  if (!includePlaces) {
    const loose = await searchNominatimDestinations(q, {
      ...options,
      includePlaces: true,
    }).catch(() => [] as DestinationSuggestion[]);
    return dedupeSuggestions([...local, ...loose]).slice(0, limit);
  }

  return local;
}
