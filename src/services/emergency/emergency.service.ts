import { LOCAL_EMERGENCY_NUMBERS } from '@/constants/app';
import { COUNTRIES } from '@/constants/preferences';
import { providers } from '@/providers/registry';
import type { GeoPoint, Place } from '@/types/domain';
import { filterPlacesWithinRadius } from '@/utils/geo';

export type EmergencyNumbers = {
  countryCode: string;
  countryName: string;
  police: string;
  ambulance: string;
  fire: string;
};

const NEAR_ME_CATEGORIES = ['hospital', 'clinic', 'pharmacy'] as const;

export function countryNameForCode(code: string): string {
  return COUNTRIES.find((item) => item.code === code)?.label ?? code;
}

export function countryCodeFromName(name: string | null | undefined): string | null {
  if (!name?.trim()) {
    return null;
  }
  const normalized = name.trim().toLowerCase();
  const exact = COUNTRIES.find((item) => item.label.toLowerCase() === normalized);
  if (exact) {
    return exact.code;
  }
  const partial = COUNTRIES.find(
    (item) =>
      normalized.includes(item.label.toLowerCase()) ||
      item.label.toLowerCase().includes(normalized),
  );
  return partial?.code ?? null;
}

export function getEmergencyNumbers(countryCode: string): EmergencyNumbers {
  const code = countryCode.toUpperCase();
  const table = LOCAL_EMERGENCY_NUMBERS as Record<
    string,
    { police: string; ambulance: string; fire: string }
  >;
  const numbers = table[code] ?? table.DEFAULT ?? { police: '112', ambulance: '112', fire: '112' };
  return {
    countryCode: code,
    countryName: countryNameForCode(code),
    police: numbers.police,
    ambulance: numbers.ambulance,
    fire: numbers.fire,
  };
}

export async function loadNearMeEmergencyPlaces(location: GeoPoint): Promise<
  Array<{ category: (typeof NEAR_ME_CATEGORIES)[number]; places: Place[] }>
> {
  const groups = await Promise.all(
    NEAR_ME_CATEGORIES.map(async (category) => {
      const places = await providers.places.getNearbyPlaces({
        location,
        radiusMeters: 10_000,
        category,
        limit: 5,
      });
      return {
        category,
        places: filterPlacesWithinRadius(places, location, 10_000).slice(0, 5),
      };
    }),
  );
  return groups;
}

/** Country-level police listings (not GPS-radius nearby). */
export async function loadCountryPolice(countryCode: string): Promise<Place[]> {
  const countryName = countryNameForCode(countryCode);
  const places = await providers.places.searchPlaces({
    query: `police station ${countryName}`,
    limit: 8,
  });
  return places
    .filter((place) => place.category === 'police' || /police|station/i.test(place.name))
    .slice(0, 6)
    .map((place) => ({ ...place, category: 'police' as const, distanceMeters: undefined }));
}

/**
 * Embassies for the traveler's home nationality in the host country.
 * Not based on GPS nearby radius.
 */
export async function loadCountryEmbassies(input: {
  homeCountryCode: string;
  hostCountryCode: string;
}): Promise<Place[]> {
  const home = countryNameForCode(input.homeCountryCode);
  const host = countryNameForCode(input.hostCountryCode);

  if (input.homeCountryCode.toUpperCase() === input.hostCountryCode.toUpperCase()) {
    return [];
  }

  const queries = [
    `${home} embassy ${host}`,
    `embassy of ${home} in ${host}`,
    `${home} consulate ${host}`,
  ];

  const batches = await Promise.all(
    queries.map((query) =>
      providers.places.searchPlaces({
        query,
        limit: 5,
      }),
    ),
  );

  const seen = new Set<string>();
  const merged: Place[] = [];
  for (const place of batches.flat()) {
    if (seen.has(place.id)) {
      continue;
    }
    seen.add(place.id);
    merged.push({
      ...place,
      category: 'embassy',
      distanceMeters: undefined,
    });
  }
  return merged.slice(0, 6);
}
