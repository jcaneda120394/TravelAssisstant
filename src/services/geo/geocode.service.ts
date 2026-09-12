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
  // Prefer the named POI (theme park, landmark) over the containing city.
  if (hit.class && !['place', 'boundary', 'administrative'].includes(hit.class)) {
    const named = address?.name || hit.display_name.split(',')[0];
    if (named?.trim()) {
      return named.trim();
    }
  }
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

function isUsefulHit(hit: NominatimHit, includePlaces: boolean): boolean {
  const type = hit.type ?? '';
  const cls = hit.class ?? '';
  if (cls === 'place') return true;
  if (cls === 'boundary' && type === 'administrative') return true;
  if (['country', 'state', 'city', 'town', 'village', 'municipality', 'region'].includes(type)) {
    return true;
  }
  if (!includePlaces) {
    return false;
  }
  // Theme parks, landmarks, stations, museums, etc. for Directions / place search.
  if (['tourism', 'leisure', 'amenity', 'historic', 'attraction', 'aeroway'].includes(cls)) {
    return true;
  }
  if (cls === 'landuse' && (type === 'commercial' || type === 'retail' || type === 'recreation_ground')) {
    return true;
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

function searchLocalDestinations(query: string): DestinationSuggestion[] {
  const q = normalizeQuery(query);
  if (q.length < 2) {
    return [];
  }
  const tokens = q.split(' ').filter(Boolean);

  return LOCAL_DESTINATIONS.filter((item) => {
    const hay = normalizeQuery(`${item.shortName} ${item.label}`);
    return tokens.every((token) => hay.includes(token));
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

  try {
    if (includePlaces) {
      const [nominatim, photon] = await Promise.all([
        searchNominatimDestinations(q, options).catch(() => [] as DestinationSuggestion[]),
        searchPhotonDestinations(q, options).catch(() => [] as DestinationSuggestion[]),
      ]);
      const merged = dedupeSuggestions([...local, ...photon, ...nominatim]).sort(
        (a, b) => placeQualityRank(a) - placeQualityRank(b),
      );
      if (merged.length > 0) {
        return merged.slice(0, limit);
      }
    }

    const remote = await searchNominatimDestinations(q, options);
    return dedupeSuggestions([...local, ...remote]).slice(0, limit);
  } catch {
    try {
      const photon = await searchPhotonDestinations(q, options);
      return dedupeSuggestions([...local, ...photon]).slice(0, limit);
    } catch {
      return local;
    }
  }
}
