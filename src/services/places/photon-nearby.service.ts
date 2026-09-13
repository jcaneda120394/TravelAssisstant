import { fetchJson } from '@/lib/http/fetch-json';
import { getLocalNearbyPlaces, getLocalPlacePools } from '@/services/places/local-places.catalog';
import { getWorldNearbyPlaces } from '@/services/places/world-places.catalog';
import type { GeoPoint, Place, PlaceCategory } from '@/types/domain';
import {
  filterPlacesByCategory,
  isFoodCategory,
  isShoppingCategory,
  isSightseeingCategory,
} from '@/utils/place-category-match';
import {
  formatBilingualPlaceName,
  hasNonLatinScript,
} from '@/utils/place-name';

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Photon search intent — never map utility categories onto attractions. */
function resolveSearchCategory(category?: PlaceCategory): PlaceCategory {
  if (!category) return 'attraction';
  return category;
}

function queriesFor(category: PlaceCategory, city: string): string[] {
  const c = city.trim();
  switch (category) {
    case 'restaurant':
    case 'cafe':
    case 'bakery':
    case 'nightlife':
      return [
        `restaurant ${c}`,
        `cafe ${c}`,
        `coffee ${c}`,
        `bakery ${c}`,
        `ramen ${c}`,
        category === 'nightlife' ? `bar ${c}` : `pizza ${c}`,
        category === 'bakery' ? `pastry ${c}` : `grocery ${c}`,
      ];
    case 'hotel':
      return [`hotel ${c}`, `hostel ${c}`, `inn ${c}`, `ryokan ${c}`];
    case 'shopping':
    case 'mall':
    case 'market':
    case 'souvenir':
      return [
        `mall ${c}`,
        `market ${c}`,
        `shopping ${c}`,
        `souvenir ${c}`,
        `gift shop ${c}`,
        `department store ${c}`,
      ];
    case 'airport':
      return [`airport ${c}`, `international airport ${c}`, `aerodrome ${c}`];
    case 'transit_station':
      return [`train station ${c}`, `railway station ${c}`, `metro station ${c}`, `bus station ${c}`];
    case 'hospital':
      return [`hospital ${c}`, `medical center ${c}`];
    case 'clinic':
      return [`clinic ${c}`, `doctors ${c}`];
    case 'pharmacy':
      return [`pharmacy ${c}`, `drugstore ${c}`];
    case 'police':
      return [`police station ${c}`];
    case 'fire':
      return [`fire station ${c}`];
    case 'embassy':
      return [`embassy ${c}`, `consulate ${c}`];
    case 'atm':
      return [`atm ${c}`, `cash machine ${c}`];
    case 'bank':
      return [`bank ${c}`, `currency exchange ${c}`];
    case 'convenience':
      return [
        `convenience store ${c}`,
        `7-eleven ${c}`,
        `familymart ${c}`,
        `lawson ${c}`,
        `minimart ${c}`,
        `supermarket ${c}`,
        `grocery ${c}`,
      ];
    case 'coworking':
      return [`coworking ${c}`, `coworking space ${c}`];
    case 'laundry':
      return [`laundry ${c}`, `laundromat ${c}`];
    case 'fuel':
      return [`gas station ${c}`, `petrol station ${c}`];
    case 'parking':
      return [`parking ${c}`, `car park ${c}`];
    case 'toilet':
      return [`public toilet ${c}`, `restroom ${c}`];
    case 'spa':
      return [`spa ${c}`, `onsen ${c}`, `hot spring ${c}`];
    case 'gym':
      return [`gym ${c}`, `fitness center ${c}`];
    case 'museum':
      return [`museum ${c}`];
    case 'park':
      return [`park ${c}`, `garden ${c}`];
    case 'temple':
      return [`temple ${c}`, `shrine ${c}`];
    case 'viewpoint':
      return [`viewpoint ${c}`, `observation deck ${c}`];
    case 'zoo':
      return [`zoo ${c}`, `aquarium ${c}`];
    case 'beach':
      return [`beach ${c}`];
    case 'tourist_info':
      return [`tourist information ${c}`, `visitor center ${c}`];
    case 'post_office':
      return [`post office ${c}`];
    case 'bicycle_rental':
      return [`bicycle rental ${c}`, `bike rental ${c}`, `bike share ${c}`];
    case 'attraction':
    default:
      return [
        `theme park ${c}`,
        `museum ${c}`,
        `park ${c}`,
        `temple ${c}`,
        `tourist attraction ${c}`,
        `tower ${c}`,
        `palace ${c}`,
        `zoo ${c}`,
      ];
  }
}

function bareQueries(category: PlaceCategory): string[] {
  switch (category) {
    case 'restaurant':
    case 'cafe':
    case 'nightlife':
      return ['restaurant', 'cafe', 'coffee shop', 'bakery'];
    case 'hotel':
      return ['hotel', 'hostel'];
    case 'shopping':
    case 'mall':
    case 'market':
      return ['mall', 'market', 'shopping centre'];
    case 'airport':
      return ['airport', 'international airport'];
    case 'transit_station':
      return ['train station', 'metro station', 'bus station'];
    case 'hospital':
      return ['hospital'];
    case 'pharmacy':
      return ['pharmacy'];
    case 'police':
      return ['police station'];
    case 'atm':
      return ['atm'];
    case 'bank':
      return ['bank'];
    case 'attraction':
    default:
      if (
        category !== 'attraction' &&
        category !== 'park' &&
        category !== 'museum' &&
        category !== 'temple' &&
        category !== 'viewpoint' &&
        category !== 'zoo' &&
        category !== 'beach' &&
        category !== 'other'
      ) {
        return [category.replace(/_/g, ' ')];
      }
      return [
        'theme park',
        'museum',
        'park',
        'temple',
        'tourist attraction',
        'monument',
        'viewpoint',
      ];
  }
}

function categoryFromPhoton(
  props: NonNullable<PhotonFeature['properties']>,
  fallback: PlaceCategory,
): PlaceCategory {
  const key = `${props.osm_key ?? ''}:${props.osm_value ?? ''}`.toLowerCase();
  const type = (props.type ?? '').toLowerCase();
  if (key.includes('aerodrome') || key.includes('aeroway') || type.includes('airport')) {
    return 'airport';
  }
  if (key.includes('railway') && (key.includes('station') || type.includes('station'))) {
    return 'transit_station';
  }
  if (key.includes('bus_station') || type.includes('bus_station')) return 'transit_station';
  if (key.includes('hotel') || type.includes('hotel')) return 'hotel';
  if (key.includes('hospital') || type.includes('hospital')) return 'hospital';
  if (key.includes('clinic') || type.includes('clinic') || type.includes('doctors')) return 'clinic';
  if (key.includes('pharmacy') || type.includes('pharmacy')) return 'pharmacy';
  if (key.includes('police') || type.includes('police')) return 'police';
  if (key.includes('embassy') || type.includes('embassy')) return 'embassy';
  if (key.includes('atm') || type.includes('atm')) return 'atm';
  if (key.includes('bank') || type.includes('bank')) return 'bank';
  if (key.includes('fuel') || type.includes('fuel')) return 'fuel';
  if (key.includes('parking') || type.includes('parking')) return 'parking';
  if (key.includes('laundry') || type.includes('laundry')) return 'laundry';
  if (
    key.includes('convenience') ||
    key.includes('supermarket') ||
    key.includes('grocery') ||
    type.includes('convenience') ||
    type.includes('supermarket')
  ) {
    return 'convenience';
  }
  if (key.includes('bakery') || type.includes('bakery')) return 'bakery';
  if (key.includes('souvenir') || key.includes('gift') || type.includes('souvenir')) {
    return 'souvenir';
  }
  if (key.includes('post_office') || type.includes('post_office')) return 'post_office';
  if (key.includes('bicycle_rental') || type.includes('bicycle_rental') || type.includes('bike')) {
    return 'bicycle_rental';
  }
  if (key.includes('restaurant') || type.includes('restaurant')) return 'restaurant';
  if (key.includes('cafe') || type.includes('cafe')) return 'cafe';
  if (key.includes('museum') || type.includes('museum')) return 'museum';
  if (key.includes('park') || type.includes('park')) return 'park';
  if (key.includes('temple') || key.includes('shrine') || type.includes('place_of_worship')) {
    return 'temple';
  }
  if (key.includes('attraction') || type.includes('attraction')) return 'attraction';
  if (key.includes('viewpoint') || type.includes('viewpoint')) return 'viewpoint';
  if (key.includes('zoo') || type.includes('zoo')) return 'zoo';
  if (key.includes('mall') || type.includes('mall')) return 'mall';
  if (key.includes('marketplace') || type.includes('marketplace')) return 'market';
  return fallback;
}

function featureToPlace(
  feature: PhotonFeature,
  origin: GeoPoint,
  fallbackCategory: PlaceCategory,
): Place | null {
  const props = feature.properties;
  const coords = feature.geometry?.coordinates;
  if (!props?.name || !coords) {
    return null;
  }
  const name = props.name.trim();
  if (name.length < 2) {
    return null;
  }
  if (
    /^(unnamed|yes|no|restaurant|cafe|park|museum|temple|hotel)$/i.test(name) ||
    /tourist information|information center/i.test(name)
  ) {
    return null;
  }

  const [lon, lat] = coords;
  const point = { latitude: lat, longitude: lon };
  const distanceMeters = Math.round(haversineMeters(origin, point));
  const osmType =
    props.osm_type === 'N' || props.osm_type === 'node'
      ? 'node'
      : props.osm_type === 'W' || props.osm_type === 'way'
        ? 'way'
        : props.osm_type === 'R' || props.osm_type === 'relation'
          ? 'relation'
          : 'node';
  const id =
    props.osm_id != null
      ? `osm-${osmType}-${props.osm_id}`
      : `photon-${lat.toFixed(5)}-${lon.toFixed(5)}`;

  const displayName = hasNonLatinScript(name) ? formatBilingualPlaceName(name, null) : name;

  return {
    id,
    provider: 'photon',
    providerPlaceId: id,
    name: displayName,
    nameOriginal: hasNonLatinScript(name) ? name : undefined,
    category: categoryFromPhoton(props, fallbackCategory),
    latitude: lat,
    longitude: lon,
    address:
      [props.street, props.city ?? props.district, props.state, props.country]
        .filter(Boolean)
        .join(', ') || undefined,
    distanceMeters,
    tags: [props.osm_value, props.type].filter((tag): tag is string => Boolean(tag)).slice(0, 3),
  };
}

async function photonQuery(
  query: string,
  origin: GeoPoint,
  limit: number,
): Promise<PhotonFeature[]> {
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}` +
    `&lat=${origin.latitude}&lon=${origin.longitude}&limit=${limit}`;
  const data = await fetchJson<PhotonResponse>(url, {
    cacheTtlMs: 10 * 60_000,
    timeoutMs: 8_000,
  });
  return data.features ?? [];
}

/** Resolve a city/region label from coords so Photon queries stay local worldwide. */
export async function reverseCityLabel(location: GeoPoint): Promise<string | null> {
  try {
    const url =
      `https://photon.komoot.io/reverse?lon=${location.longitude}&lat=${location.latitude}`;
    const data = await fetchJson<PhotonResponse>(url, {
      cacheTtlMs: 30 * 60_000,
      timeoutMs: 6_000,
    });
    const props = data.features?.[0]?.properties;
    if (!props) {
      return null;
    }
    const label =
      props.city ||
      props.district ||
      props.state ||
      props.name ||
      props.country ||
      null;
    return label?.trim() || null;
  } catch {
    return null;
  }
}

function dedupePlaces(places: Place[]): Place[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = `${place.name.toLowerCase()}|${place.latitude.toFixed(3)}|${place.longitude.toFixed(3)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Keep Photon results inside the traveler's selected radius.
 * Do not expand to 25–100 km — that mixed far-away cities into "nearby".
 */
function withinExpandingRadius(places: Place[], startRadius: number, limit: number): Place[] {
  const radius = Math.max(500, startRadius);
  return places
    .filter((place) => (place.distanceMeters ?? Number.POSITIVE_INFINITY) <= radius)
    .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
    .slice(0, limit);
}

/**
 * Worldwide nearby via Photon. Works for any city — reverse-geocodes when label missing.
 * Uses full destination context (not only the first comma segment) and drops
 * results whose country clearly conflicts with the traveler's country.
 */
export async function searchPhotonNearby(params: {
  location: GeoPoint;
  category?: PlaceCategory | 'attraction' | 'restaurant';
  cityLabel?: string | null;
  countryCode?: string | null;
  radiusMeters?: number;
  limit?: number;
}): Promise<Place[]> {
  const limit = Math.min(Math.max(params.limit ?? 15, 1), 40);
  const searchCategory = resolveSearchCategory(params.category as PlaceCategory | undefined);
  const fallbackCategory = searchCategory;
  const radius = params.radiusMeters ?? 15_000;

  const fullLabel = params.cityLabel?.trim() || '';
  let city =
    fullLabel.split(',')[0]?.trim() ||
    fullLabel ||
    '';
  // Prefer "City, Region" when available so "Barcelona" alone does not mean Spain.
  const cityWithRegion =
    fullLabel
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(', ') || city;

  if (city.length < 2) {
    city = (await reverseCityLabel(params.location)) ?? '';
  }

  const queryCity = cityWithRegion.length >= 3 ? cityWithRegion : city;
  const queryList =
    queryCity.length >= 2
      ? queriesFor(searchCategory, queryCity).slice(0, 8)
      : bareQueries(searchCategory).slice(0, 6);

  const settled = await Promise.allSettled(
    queryList.map((query) => photonQuery(query, params.location, 8)),
  );

  const features = settled.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );

  const expectedCountry = (params.countryCode ?? '').toLowerCase();
  const labelLower = fullLabel.toLowerCase();

  const places = dedupePlaces(
    features
      .filter((feature) => {
        const props = feature.properties;
        const featureCountry = (props?.countrycode ?? '').toLowerCase();
        if (expectedCountry && featureCountry && featureCountry !== expectedCountry) {
          return false;
        }
        if (labelLower.includes('philippines') || expectedCountry === 'ph') {
          const addr = `${props?.country ?? ''} ${props?.state ?? ''} ${props?.city ?? ''}`.toLowerCase();
          if (/\b(japan|spain|france|united states|korea|thailand)\b/.test(addr)) {
            return false;
          }
        }
        return true;
      })
      .map((feature) => featureToPlace(feature, params.location, fallbackCategory))
      .filter((place): place is Place => place != null),
  );

  // Never fall back to wrong categories (e.g. Disneyland under Airport).
  const matched = filterPlacesByCategory(places, searchCategory);
  return withinExpandingRadius(matched, radius, limit);
}

/**
 * Curated catalogs for sightseeing / food / hotel / shopping only.
 * Utility categories (airport, hospital, …) return [] — live OSM/Photon must supply them.
 */
export function searchCatalogNearby(params: {
  location: GeoPoint;
  category?: PlaceCategory | 'attraction' | 'restaurant';
  radiusMeters?: number;
  limit?: number;
}): Place[] {
  const limit = params.limit ?? 15;
  const category = (params.category as PlaceCategory | undefined) ?? 'attraction';
  const radiusMeters = params.radiusMeters ?? 40_000;

  if (isFoodCategory(category)) {
    const world = getWorldNearbyPlaces({
      location: params.location,
      category: 'restaurant',
      radiusMeters,
      limit,
    });
    const local = getLocalNearbyPlaces({
      location: params.location,
      category: 'restaurant',
      radiusMeters,
      limit,
    });
    return filterPlacesByCategory(dedupePlaces([...world, ...local]), category).slice(0, limit);
  }

  if (category === 'hotel') {
    const pools = getLocalPlacePools(params.location);
    return filterPlacesByCategory(dedupePlaces(pools.hotels), 'hotel').slice(0, limit);
  }

  if (isShoppingCategory(category)) {
    const pools = getLocalPlacePools(params.location);
    return filterPlacesByCategory(dedupePlaces(pools.shopping), category).slice(0, limit);
  }

  if (!isSightseeingCategory(category) && category !== 'tourist_info') {
    return [];
  }

  const world = getWorldNearbyPlaces({
    location: params.location,
    category: 'attraction',
    radiusMeters,
    limit,
  });
  const local = getLocalNearbyPlaces({
    location: params.location,
    category: 'attraction',
    radiusMeters,
    limit,
  });
  return filterPlacesByCategory(dedupePlaces([...world, ...local]), category).slice(0, limit);
}
