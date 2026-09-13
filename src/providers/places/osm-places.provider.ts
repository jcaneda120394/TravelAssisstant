import { fetchJson, fetchText } from '@/lib/http/fetch-json';
import { fetchNominatimJson } from '@/lib/http/nominatim';
import type {
  NearbyPlacesParams,
  PlacesProvider,
  SearchPlacesParams,
} from '@/providers/places/places.provider';
import { recallPlace, rememberPlace, rememberPlaces } from '@/services/places/place-cache';
import {
  searchCatalogNearby,
  searchPhotonNearby,
} from '@/services/places/photon-nearby.service';
import type { GeoPoint, Place, PlaceCategory } from '@/types/domain';
import {
  filterPlacesByCategory,
  placeMatchesCategory,
} from '@/utils/place-category-match';
import {
  formatBilingualPlaceName,
  hasNonLatinScript,
  resolveBilingualPlaceName,
} from '@/utils/place-name';
import { sortPlacesByCategoryPopularity } from '@/utils/place-popularity';
import { applyOsmPriceAndStars } from '@/utils/place-price-estimate';
import { filterPlacesWithinRadius } from '@/utils/geo';
import { dedupePlaces } from '@/utils/dedupe-places';

type NominatimResult = {
  place_id: number;
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  name?: string;
  importance?: number;
  extratags?: Record<string, string>;
  namedetails?: Record<string, string>;
  address?: Record<string, string>;
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const OVERPASS_ENDPOINTS = [
  // Prefer mirrors that respond when overpass-api.de / lz4 are down or 504.
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
] as const;

/** Nominatim free-text queries per category (Overpass is often blocked/slow). */
const NOMINATIM_QUERIES: Record<PlaceCategory, string[]> = {
  restaurant: [
    'restaurant',
    'cafe',
    'coffee shop',
    'fast food',
    'bakery',
    'food court',
    'bar',
    'grill',
  ],
  cafe: ['cafe', 'coffee shop', 'coffee', 'tea house', 'bakery cafe'],
  bakery: ['bakery', 'pastry shop', 'bread shop', 'patisserie'],
  attraction: [
    'theme park',
    'amusement park',
    'tourist attraction',
    'museum',
    'attraction',
    'park',
    'national park',
    'church',
    'cathedral',
    'temple',
    'shrine',
    'mosque',
    'plaza',
    'viewpoint',
    'lookout',
    'zoo',
    'aquarium',
    'garden',
    'botanical garden',
    'monument',
    'statue',
    'castle',
    'palace',
    'historic site',
    'heritage',
    'art gallery',
    'cinema',
    'stadium',
    'waterfall',
    'beach',
    'cultural center',
  ],
  shopping: [
    'shopping mall',
    'mall',
    'department store',
    'market',
    'night market',
    'boutique',
    'shopping center',
    'outlet',
  ],
  mall: ['shopping mall', 'mall', 'shopping center', 'department store', 'outlet mall'],
  park: ['park', 'city park', 'national park', 'garden', 'botanical garden', 'nature reserve'],
  museum: ['museum', 'art museum', 'history museum', 'science museum', 'gallery'],
  temple: ['temple', 'shrine', 'church', 'cathedral', 'mosque', 'pagoda', 'place of worship'],
  market: ['market', 'night market', 'farmers market', 'flea market', 'bazaar', 'wet market'],
  viewpoint: ['viewpoint', 'lookout', 'observation deck', 'scenic viewpoint'],
  zoo: ['zoo', 'aquarium', 'safari park', 'wildlife park'],
  nightlife: ['bar', 'nightclub', 'pub', 'karaoke', 'lounge'],
  beach: ['beach', 'seaside', 'baywalk', 'boardwalk'],
  hot_spring: ['hot spring', 'hotspring', 'onsen', 'thermal spring', 'hot springs'],
  cold_spring: ['cold spring', 'cold springs', 'natural spring'],
  spring: ['spring', 'natural spring', 'hot spring', 'cold spring'],
  lake: ['lake', 'lagoon', 'crater lake'],
  river: ['river', 'waterfall', 'falls', 'creek'],
  resort: ['resort', 'beach resort', 'island resort', 'eco resort'],
  spa: ['spa', 'massage', 'onsen', 'hot spring', 'wellness'],
  gym: ['gym', 'fitness center', 'fitness centre', 'sports centre', 'yoga studio'],
  hotel: ['hotel', 'resort', 'inn', 'hostel', 'guest house', 'apartment hotel'],
  hospital: ['hospital', 'medical center', 'medical centre'],
  clinic: ['clinic', 'doctors', 'health center'],
  pharmacy: ['pharmacy', 'drugstore'],
  police: ['police station', 'police'],
  fire: ['fire station'],
  embassy: ['embassy', 'consulate'],
  atm: ['atm', 'cash machine'],
  bank: ['bank', 'currency exchange'],
  convenience: [
    'convenience store',
    'convenience',
    'minimart',
    '7-eleven',
    '7 eleven',
    'family mart',
    'familymart',
    'lawson',
    'ministop',
    'supermarket',
    'grocery',
    'corner store',
  ],
  souvenir: ['souvenir', 'gift shop', 'souvenir shop', 'duty free'],
  coworking: ['coworking', 'coworking space'],
  transit_station: ['bus terminal', 'train station', 'MRT', 'LRT', 'railway station', 'ferry terminal'],
  airport: ['airport'],
  laundry: ['laundry', 'laundromat', 'dry clean'],
  fuel: ['gas station', 'petrol station', 'fuel'],
  parking: ['parking', 'car park', 'parking garage'],
  toilet: ['public toilet', 'restroom', 'toilet'],
  tourist_info: ['tourist information', 'visitor center', 'tourist office'],
  post_office: ['post office', 'postal service'],
  bicycle_rental: ['bicycle rental', 'bike rental', 'bike share', 'cycle hire'],
  other: ['point of interest', 'landmark'],
};

/** Overpass filters — may be multi-line (each line gets around:…). */
const CATEGORY_FILTERS: Record<PlaceCategory, string[]> = {
  restaurant: ['nwr["amenity"~"restaurant|cafe|fast_food|bar|pub|food_court"]'],
  cafe: ['nwr["amenity"="cafe"]', 'nwr["amenity"="ice_cream"]'],
  bakery: ['nwr["shop"="bakery"]', 'nwr["craft"="bakery"]'],
  attraction: [
    'nwr["tourism"~"attraction|museum|viewpoint|gallery|zoo|theme_park|artwork|aquarium|yes"]',
    'nwr["leisure"~"park|garden|nature_reserve|water_park|stadium|sports_centre|beach_resort"]',
    'nwr["amenity"~"place_of_worship|theatre|cinema|arts_centre|community_centre|fountain"]',
    'nwr["historic"]',
    'nwr["natural"~"beach|peak|waterfall|cave_entrance|spring"]',
    'nwr["boundary"="national_park"]',
    'nwr["boundary"="protected_area"]["protect_class"~"^(1|2|3|4|5)$"]',
    'nwr["aerialway"~"cable_car|gondola|chair_lift|mixed_lift"]',
    'nwr["railway"="funicular"]',
    'nwr["route"="ferry"]',
  ],
  shopping: [
    'nwr["shop"~"mall|department_store|clothes|shoes|gift|jewelry|books|electronics"]',
    'nwr["amenity"="marketplace"]',
  ],
  mall: ['nwr["shop"~"mall|department_store"]', 'nwr["building"="retail"]'],
  park: [
    'nwr["leisure"~"park|garden|nature_reserve"]',
    'nwr["landuse"="recreation_ground"]',
  ],
  museum: ['nwr["tourism"="museum"]', 'nwr["tourism"="gallery"]'],
  temple: [
    'nwr["amenity"="place_of_worship"]',
    'nwr["building"~"temple|shrine|church|cathedral|mosque"]',
  ],
  market: ['nwr["amenity"="marketplace"]', 'nwr["shop"="marketplace"]'],
  viewpoint: ['nwr["tourism"="viewpoint"]', 'nwr["man_made"="tower"]'],
  zoo: ['nwr["tourism"~"zoo|aquarium"]'],
  nightlife: ['nwr["amenity"~"bar|pub|nightclub|biergarten"]'],
  beach: ['nwr["natural"="beach"]', 'nwr["leisure"~"beach_resort|swimming_area"]'],
  hot_spring: [
    'nwr["natural"="hot_spring"]',
    'nwr["amenity"="public_bath"]["bath:type"="hot_spring"]',
    'nwr["leisure"="spa"]["hot_spring"="yes"]',
    'nwr["tourism"="hotel"]["hot_spring"="yes"]',
  ],
  cold_spring: [
    'nwr["natural"="spring"]',
    'nwr["amenity"="drinking_water"]["natural"="spring"]',
  ],
  spring: [
    'nwr["natural"~"spring|hot_spring"]',
    'nwr["amenity"="public_bath"]',
  ],
  lake: [
    'nwr["natural"="water"]["water"="lake"]',
    'nwr["landuse"="reservoir"]',
    'nwr["name"~"Lake|Lagoon",i]',
  ],
  river: [
    'nwr["waterway"~"river|stream"]',
    'nwr["natural"="waterfall"]',
    'nwr["waterway"="waterfall"]',
  ],
  resort: [
    'nwr["tourism"~"hotel|resort|chalet"]["resort"="yes"]',
    'nwr["leisure"="beach_resort"]',
    'nwr["tourism"="hotel"]["name"~"Resort",i]',
  ],
  spa: ['nwr["leisure"="spa"]', 'nwr["amenity"~"spa|public_bath"]', 'nwr["shop"="beauty"]'],
  gym: ['nwr["leisure"~"fitness_centre|sports_centre"]', 'nwr["amenity"="gym"]'],
  hotel: ['nwr["tourism"~"hotel|hostel|guest_house|motel|apartment"]'],
  hospital: ['nwr["amenity"="hospital"]'],
  clinic: ['nwr["amenity"~"clinic|doctors"]'],
  pharmacy: ['nwr["amenity"="pharmacy"]'],
  police: ['nwr["amenity"="police"]'],
  fire: ['nwr["amenity"="fire_station"]'],
  embassy: ['nwr["amenity"="embassy"]'],
  atm: ['nwr["amenity"="atm"]'],
  bank: ['nwr["amenity"~"bank|bureau_de_change"]'],
  convenience: [
    'nwr["shop"~"convenience|supermarket|grocery|general|kiosk"]',
  ],
  souvenir: ['nwr["shop"~"gift|souvenir"]'],
  coworking: ['nwr["amenity"="coworking_space"]'],
  transit_station: [
    'nwr["railway"~"station|halt|subway_entrance"]',
    'nwr["amenity"="bus_station"]',
    'nwr["public_transport"="station"]',
    'nwr["amenity"="ferry_terminal"]',
  ],
  airport: ['nwr["aeroway"="aerodrome"]'],
  laundry: ['nwr["shop"~"laundry|dry_cleaning"]'],
  fuel: ['nwr["amenity"="fuel"]'],
  parking: ['nwr["amenity"="parking"]'],
  toilet: ['nwr["amenity"="toilets"]'],
  tourist_info: ['nwr["tourism"="information"]'],
  post_office: ['nwr["amenity"="post_office"]'],
  bicycle_rental: [
    'nwr["amenity"="bicycle_rental"]',
    'nwr["shop"="bicycle"]',
  ],
  other: ['nwr["tourism"]', 'nwr["amenity"]'],
};

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function viewboxFor(origin: GeoPoint, radiusMeters: number): string {
  const latDelta = radiusMeters / 111_320;
  const lonDelta = radiusMeters / (111_320 * Math.max(0.2, Math.cos((origin.latitude * Math.PI) / 180)));
  const west = origin.longitude - lonDelta;
  const east = origin.longitude + lonDelta;
  const north = origin.latitude + latDelta;
  const south = origin.latitude - latDelta;
  return `${west},${north},${east},${south}`;
}

function inferCategory(tags: Record<string, string> = {}): PlaceCategory {
  const amenity = tags.amenity;
  const tourism = tags.tourism;
  const shop = tags.shop;
  const railway = tags.railway;
  const aeroway = tags.aeroway;
  const leisure = tags.leisure;
  const natural = tags.natural;
  const historic = tags.historic;
  const building = tags.building;
  const religion = tags.religion;

  if (amenity === 'hospital') return 'hospital';
  if (amenity === 'clinic' || amenity === 'doctors') return 'clinic';
  if (amenity === 'pharmacy') return 'pharmacy';
  if (amenity === 'police') return 'police';
  if (amenity === 'fire_station') return 'fire';
  if (amenity === 'embassy') return 'embassy';
  if (amenity === 'atm') return 'atm';
  if (amenity === 'bank' || amenity === 'bureau_de_change') return 'bank';
  if (amenity === 'coworking_space') return 'coworking';
  if (amenity === 'fuel') return 'fuel';
  if (amenity === 'parking') return 'parking';
  if (amenity === 'toilets') return 'toilet';
  if (amenity === 'marketplace') return 'market';
  if (amenity === 'gym') return 'gym';
  if (amenity === 'nightclub' || amenity === 'biergarten') return 'nightlife';
  if (amenity === 'bar' || amenity === 'pub') return 'nightlife';
  if (amenity === 'cafe' || amenity === 'ice_cream') return 'cafe';
  if (amenity === 'restaurant' || amenity === 'fast_food' || amenity === 'food_court') {
    return 'restaurant';
  }
  if (amenity === 'post_office') return 'post_office';
  if (amenity === 'bicycle_rental') return 'bicycle_rental';
  if (amenity === 'place_of_worship' || religion || building === 'temple' || building === 'shrine') {
    return 'temple';
  }
  if (amenity === 'theatre' || amenity === 'cinema' || amenity === 'arts_centre') {
    return 'attraction';
  }
  if (tourism === 'hotel' || tourism === 'hostel' || tourism === 'guest_house' || tourism === 'motel') {
    if (/resort/i.test(tags.name ?? '') || tags.resort === 'yes' || leisure === 'beach_resort') {
      return 'resort';
    }
    return 'hotel';
  }
  if (leisure === 'beach_resort' || tourism === 'resort') return 'resort';
  if (natural === 'hot_spring' || tags.hot_spring === 'yes') return 'hot_spring';
  if (natural === 'spring') {
    if (/cold/i.test(tags.name ?? '') || tags.spring_type === 'cold') return 'cold_spring';
    return 'spring';
  }
  if (natural === 'water' && (tags.water === 'lake' || tags.water === 'pond')) return 'lake';
  if (tags.waterway === 'river' || tags.waterway === 'stream') return 'river';
  if (natural === 'waterfall' || tags.waterway === 'waterfall') return 'river';
  if (tourism === 'museum' || tourism === 'gallery') return 'museum';
  if (tourism === 'viewpoint') return 'viewpoint';
  if (tourism === 'zoo' || tourism === 'aquarium') return 'zoo';
  if (tourism === 'information') return 'tourist_info';
  if (
    tourism === 'attraction' ||
    tourism === 'artwork' ||
    tourism === 'theme_park' ||
    tourism === 'yes'
  ) {
    return 'attraction';
  }
  if (leisure === 'spa' || amenity === 'spa' || amenity === 'public_bath') {
    if (/hot spring|onsen|thermal/i.test(tags.name ?? '')) return 'hot_spring';
    return 'spa';
  }
  if (leisure === 'fitness_centre' || leisure === 'sports_centre') return 'gym';
  if (leisure === 'park' || leisure === 'garden' || leisure === 'nature_reserve') return 'park';
  if (leisure === 'water_park') return 'attraction';
  if (natural === 'beach' || leisure === 'beach_resort') return 'beach';
  if (historic) return 'attraction';
  if (shop === 'mall' || shop === 'department_store') return 'mall';
  if (shop === 'marketplace') return 'market';
  if (shop === 'laundry' || shop === 'dry_cleaning') return 'laundry';
  if (shop === 'bakery') return 'bakery';
  if (shop === 'gift' || shop === 'souvenir') return 'souvenir';
  if (shop === 'convenience' || shop === 'supermarket' || shop === 'grocery' || shop === 'kiosk') {
    return 'convenience';
  }
  if (shop === 'bicycle') return 'bicycle_rental';
  if (shop === 'clothes' || shop === 'gift' || shop) return 'shopping';
  if (railway || amenity === 'bus_station' || amenity === 'ferry_terminal') return 'transit_station';
  if (aeroway === 'aerodrome') return 'airport';
  return 'other';
}

function categoryFromNominatim(item: NominatimResult): PlaceCategory {
  const type = item.type ?? '';
  const cls = item.class ?? '';
  if (cls === 'tourism' && ['hotel', 'hostel', 'guest_house', 'motel'].includes(type)) return 'hotel';
  if (cls === 'tourism' && type === 'museum') return 'museum';
  if (cls === 'tourism' && type === 'gallery') return 'museum';
  if (cls === 'tourism' && type === 'viewpoint') return 'viewpoint';
  if (cls === 'tourism' && (type === 'zoo' || type === 'aquarium')) return 'zoo';
  if (cls === 'tourism' && type === 'information') return 'tourist_info';
  if (cls === 'tourism') return 'attraction';
  if (cls === 'historic') return 'attraction';
  if (cls === 'natural' && type === 'beach') return 'beach';
  if (cls === 'natural' && type === 'hot_spring') return 'hot_spring';
  if (cls === 'natural' && type === 'spring') return 'spring';
  if (cls === 'natural' && (type === 'water' || type === 'lake')) return 'lake';
  if (cls === 'waterway' && (type === 'river' || type === 'stream')) return 'river';
  if (cls === 'waterway' && type === 'waterfall') return 'river';
  if (cls === 'leisure' && type === 'beach_resort') return 'resort';
  if (cls === 'tourism' && type === 'resort') return 'resort';
  if (cls === 'leisure' && ['park', 'garden', 'nature_reserve'].includes(type)) return 'park';
  if (cls === 'leisure' && ['fitness_centre', 'sports_centre'].includes(type)) return 'gym';
  if (cls === 'leisure' && type === 'water_park') return 'attraction';
  if (cls === 'leisure' && type === 'spa') return 'spa';
  if (cls === 'amenity' && type === 'cafe') return 'cafe';
  if (cls === 'amenity' && ['restaurant', 'fast_food', 'food_court'].includes(type)) {
    return 'restaurant';
  }
  if (cls === 'amenity' && type === 'post_office') return 'post_office';
  if (cls === 'amenity' && type === 'bicycle_rental') return 'bicycle_rental';
  if (cls === 'amenity' && ['bar', 'pub', 'nightclub', 'biergarten'].includes(type)) return 'nightlife';
  if (cls === 'amenity' && type === 'place_of_worship') return 'temple';
  if (cls === 'amenity' && ['theatre', 'cinema', 'arts_centre'].includes(type)) return 'attraction';
  if (cls === 'amenity' && type === 'marketplace') return 'market';
  if (cls === 'amenity' && type === 'toilets') return 'toilet';
  if (cls === 'amenity' && type === 'gym') return 'gym';
  if (type === 'hospital') return 'hospital';
  if (type === 'pharmacy') return 'pharmacy';
  if (type === 'police') return 'police';
  if (type === 'atm') return 'atm';
  if (type === 'bank' || type === 'bureau_de_change') return 'bank';
  if (type === 'fuel') return 'fuel';
  if (type === 'parking') return 'parking';
  if (cls === 'shop' && ['mall', 'department_store'].includes(type)) return 'mall';
  if (cls === 'shop' && type === 'marketplace') return 'market';
  if (cls === 'shop' && type === 'bakery') return 'bakery';
  if (cls === 'shop' && (type === 'gift' || type === 'souvenir')) return 'souvenir';
  if (cls === 'shop' && ['clothes', 'jewelry', 'books', 'electronics'].includes(type)) {
    return 'shopping';
  }
  if (cls === 'shop' && ['convenience', 'supermarket', 'grocery', 'kiosk', 'general'].includes(type)) {
    return 'convenience';
  }
  if (cls === 'shop' && (type === 'laundry' || type === 'dry_cleaning')) return 'laundry';
  if (cls === 'shop' && type === 'bicycle') return 'bicycle_rental';
  if (cls === 'shop') return 'shopping';
  if (cls === 'railway' || type.includes('station') || type === 'ferry_terminal') return 'transit_station';
  if (cls === 'aeroway') return 'airport';
  if (cls === 'leisure' && type === 'park') return 'park';
  if (['temple', 'shrine', 'church', 'cathedral', 'mosque', 'pagoda'].includes(type)) return 'temple';
  return 'other';
}

function elementToPlace(element: OverpassElement, origin?: GeoPoint): Place | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  const tags = element.tags ?? {};
  const displayName = resolveBilingualPlaceName({
    primary: tags.name,
    names: tags,
    tags,
  });
  if (lat == null || lon == null || !displayName || displayName.length < 2) {
    return null;
  }
  const point = { latitude: lat, longitude: lon };
  const usefulTags = [
    tags.cuisine,
    tags.tourism,
    tags.leisure,
    tags.aerialway,
    tags.railway === 'funicular' ? 'funicular' : null,
    tags.amenity && !['yes', 'no'].includes(tags.amenity) ? tags.amenity : null,
    tags.historic && !['yes', 'no', 'house'].includes(tags.historic) ? tags.historic : null,
  ].filter(
    (tag): tag is string =>
      Boolean(tag) && !/^(house|yes|no|building|residential)$/i.test(String(tag)),
  );

  const nameOriginal =
    (hasNonLatinScript(tags.name ?? '') ? tags.name : undefined) ||
    tags['name:ja'] ||
    tags['name:zh'] ||
    tags['name:ko'] ||
    tags['name:th'] ||
    tags['name:tl'] ||
    tags.name;
  const nameEnglish = tags['name:en']?.trim() || undefined;

  return {
    id: `osm-${element.type}-${element.id}`,
    provider: 'openstreetmap',
    providerPlaceId: `${element.type}/${element.id}`,
    name: displayName,
    nameOriginal: nameOriginal?.trim() || undefined,
    nameEnglish:
      nameEnglish && nameOriginal && nameEnglish !== nameOriginal ? nameEnglish : undefined,
    category: inferCategory(tags),
    latitude: lat,
    longitude: lon,
    address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']]
      .filter(Boolean)
      .join(', ') || undefined,
    phone: tags.phone ?? tags['contact:phone'],
    website: tags.website ?? tags['contact:website'],
    menuUrl: tags.menu ?? tags['contact:menu'] ?? tags['website:menu'],
    cuisine: tags.cuisine,
    openingHours: tags.opening_hours ? [tags.opening_hours] : undefined,
    description: tags.description ?? (tags.cuisine ? `Cuisine: ${tags.cuisine}` : undefined),
    distanceMeters: origin ? Math.round(haversineMeters(origin, point)) : undefined,
    tags: usefulTags.slice(0, 4),
  };
}

function osmTypePrefix(osmType?: string): 'node' | 'way' | 'relation' | null {
  if (osmType === 'node' || osmType === 'N') return 'node';
  if (osmType === 'way' || osmType === 'W') return 'way';
  if (osmType === 'relation' || osmType === 'R') return 'relation';
  return null;
}

function placeIdFromNominatim(item: NominatimResult): string {
  const kind = osmTypePrefix(item.osm_type);
  if (kind && item.osm_id != null) {
    return `osm-${kind}-${item.osm_id}`;
  }
  return `nominatim-${item.place_id}`;
}

function enrichFromTags(
  base: Place,
  tags: Record<string, string> | undefined,
): Place {
  if (!tags) {
    return base;
  }
  const cuisine = tags.cuisine ?? base.cuisine;
  const hours = tags.opening_hours;
  const menuUrl = tags.menu ?? tags['contact:menu'] ?? tags['website:menu'] ?? base.menuUrl;
  const phone = tags.phone ?? tags['contact:phone'] ?? base.phone;
  const website = tags.website ?? tags['contact:website'] ?? base.website;
  const address =
    base.address ||
    [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:province']]
      .filter(Boolean)
      .join(', ') ||
    undefined;
  const tagList = [
    ...(base.tags ?? []),
    cuisine,
    tags.amenity,
    tags.tourism,
    tags.aerialway,
    tags.railway === 'funicular' ? 'funicular' : null,
  ].filter(
    (tag): tag is string =>
      typeof tag === 'string' &&
      tag.length > 0 &&
      !['yes', 'no', 'house', 'building', 'residential'].includes(tag),
  );

  return applyOsmPriceAndStars(
    {
      ...base,
      address,
      phone,
      website,
      menuUrl,
      cuisine,
      openingHours: hours ? [hours] : base.openingHours,
      tags: [...new Set(tagList)].slice(0, 6),
      description:
        base.description ||
        tags.description ||
        (cuisine ? `Cuisine: ${cuisine.replace(/;/g, ', ')}` : undefined),
    },
    tags,
  );
}

function resolvePlaceName(
  primary: string | null | undefined,
  fallbackDisplay?: string | null,
  _category?: PlaceCategory,
  names?: Record<string, string> | null,
  tags?: Record<string, string> | null,
): string | null {
  return resolveBilingualPlaceName({
    primary,
    displayName: fallbackDisplay,
    names: names ?? undefined,
    tags: tags ?? undefined,
  });
}

function isUsefulNominatimHit(item: NominatimResult, category: PlaceCategory): boolean {
  const cls = item.class ?? '';
  const type = item.type ?? '';

  // Skip admin / residential areas that look like barangays, not POIs.
  if (
    cls === 'boundary' ||
    (cls === 'place' &&
      [
        'suburb',
        'village',
        'neighbourhood',
        'quarter',
        'city',
        'town',
        'municipality',
        'county',
        'state',
        'country',
        'region',
        'province',
        'district',
        'hamlet',
      ].includes(type))
  ) {
    return false;
  }
  if (cls === 'highway' && ['residential', 'tertiary', 'secondary', 'primary', 'unclassified'].includes(type)) {
    return false;
  }
  if (cls === 'landuse' && type === 'residential') {
    return false;
  }

  // Soft preference: keep tourism/leisure/amenity/shop hits for attractions.
  if (category === 'attraction') {
    // Bars/restaurants named like landmarks (e.g. "Cable Car" bar) must not fill Discover.
    if (
      cls === 'amenity' &&
      [
        'bar',
        'pub',
        'nightclub',
        'biergarten',
        'restaurant',
        'fast_food',
        'cafe',
        'food_court',
        'bbq',
        'ice_cream',
      ].includes(type)
    ) {
      return false;
    }
    if (cls === 'building' && ['house', 'apartments', 'residential', 'garage'].includes(type)) {
      return false;
    }
    if (['tourism', 'leisure', 'historic', 'natural', 'aerialway'].includes(cls)) {
      return true;
    }
    // Amenity only when it is a cultural/civic POI — not food/nightlife.
    if (
      cls === 'amenity' &&
      ['place_of_worship', 'theatre', 'cinema', 'arts_centre', 'community_centre', 'library'].includes(
        type,
      )
    ) {
      return true;
    }
    if (cls === 'man_made' || (cls === 'building' && !['house', 'apartments'].includes(type))) {
      return true;
    }
    return Boolean(item.name && item.name.trim().length >= 3);
  }

  return true;
}

function nominatimToPlace(item: NominatimResult, origin?: GeoPoint, category?: PlaceCategory): Place | null {
  if (category && !isUsefulNominatimHit(item, category)) {
    return null;
  }
  const point = { latitude: Number(item.lat), longitude: Number(item.lon) };
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
    return null;
  }
  const kind = osmTypePrefix(item.osm_type);
  const name = resolvePlaceName(
    item.name,
    item.display_name,
    category,
    item.namedetails,
    item.extratags,
  );
  if (!name) {
    return null;
  }
  const nameEnglish = item.namedetails?.['name:en'] ?? item.extratags?.['name:en'];
  const nameOriginal =
    item.namedetails?.name ||
    item.name ||
    (nameEnglish && name.includes(`(${nameEnglish})`)
      ? name.replace(` (${nameEnglish})`, '')
      : undefined);

  // Prefer OSM's real category so nightlife/food never get forced into "attraction".
  const derived = categoryFromNominatim(item);
  const resolvedCategory =
    derived !== 'other' ? derived : category && category !== 'other' ? category : 'other';

  const base: Place = {
    id: placeIdFromNominatim(item),
    provider: 'openstreetmap',
    providerPlaceId:
      kind && item.osm_id != null ? `${kind}/${item.osm_id}` : String(item.place_id),
    name,
    nameOriginal: nameOriginal?.trim() || undefined,
    nameEnglish:
      nameEnglish && nameOriginal && nameEnglish.trim() !== nameOriginal.trim()
        ? nameEnglish.trim()
        : undefined,
    category: resolvedCategory,
    latitude: point.latitude,
    longitude: point.longitude,
    address: item.display_name,
    distanceMeters: origin ? Math.round(haversineMeters(origin, point)) : undefined,
    // Nominatim importance ≈ relative popularity (map into a 1–5 style score).
    rating:
      item.importance != null
        ? Math.round(Math.min(5, Math.max(1, item.importance * 8)) * 10) / 10
        : undefined,
  };

  if (category && !placeMatchesCategory(base, category)) {
    return null;
  }

  return enrichFromTags(base, item.extratags);
}


/** Structured Nominatim amenity/tourism keys (more reliable than free-text alone). */
const NOMINATIM_STRUCTURED: Partial<
  Record<PlaceCategory, Array<Record<string, string>>>
> = {
  attraction: [
    { tourism: 'theme_park' },
    { tourism: 'attraction' },
    { tourism: 'museum' },
    { tourism: 'viewpoint' },
    { aerialway: 'cable_car' },
  ],
  restaurant: [{ amenity: 'restaurant' }, { amenity: 'fast_food' }, { amenity: 'cafe' }],
  cafe: [{ amenity: 'cafe' }],
  hotel: [{ tourism: 'hotel' }, { tourism: 'guest_house' }],
  hospital: [{ amenity: 'hospital' }],
  clinic: [{ amenity: 'clinic' }, { amenity: 'doctors' }],
  pharmacy: [{ amenity: 'pharmacy' }],
  police: [{ amenity: 'police' }],
  fire: [{ amenity: 'fire_station' }],
  embassy: [{ amenity: 'embassy' }],
  atm: [{ amenity: 'atm' }],
  bank: [{ amenity: 'bank' }],
  fuel: [{ amenity: 'fuel' }],
  parking: [{ amenity: 'parking' }],
  toilet: [{ amenity: 'toilets' }],
  laundry: [{ shop: 'laundry' }],
  convenience: [
    { shop: 'convenience' },
    { shop: 'supermarket' },
    { shop: 'grocery' },
    { shop: 'kiosk' },
  ],
  bakery: [{ shop: 'bakery' }],
  souvenir: [{ shop: 'gift' }, { shop: 'souvenir' }],
  post_office: [{ amenity: 'post_office' }],
  bicycle_rental: [{ amenity: 'bicycle_rental' }, { shop: 'bicycle' }],
  mall: [{ shop: 'mall' }],
  market: [{ amenity: 'marketplace' }],
  nightlife: [{ amenity: 'bar' }, { amenity: 'pub' }, { amenity: 'nightclub' }],
  spa: [{ leisure: 'spa' }],
  gym: [{ leisure: 'fitness_centre' }],
  park: [{ leisure: 'park' }],
  museum: [{ tourism: 'museum' }],
  temple: [{ amenity: 'place_of_worship' }],
  viewpoint: [{ tourism: 'viewpoint' }],
  zoo: [{ tourism: 'zoo' }],
  beach: [{ natural: 'beach' }],
  hot_spring: [{ natural: 'hot_spring' }],
  cold_spring: [{ natural: 'spring' }],
  spring: [{ natural: 'spring' }, { natural: 'hot_spring' }],
  lake: [{ natural: 'water' }],
  river: [{ waterway: 'river' }, { waterway: 'waterfall' }],
  resort: [{ leisure: 'beach_resort' }, { tourism: 'hotel' }],
  airport: [{ aeroway: 'aerodrome' }],
  tourist_info: [{ tourism: 'information' }],
  coworking: [{ amenity: 'coworking_space' }],
  transit_station: [{ railway: 'station' }, { amenity: 'bus_station' }],
};

async function overpassNearby(
  params: NearbyPlacesParams,
  filters: string[],
  radius: number,
  limit: number,
): Promise<Place[]> {
  const aroundBlocks = filters
    .map((filter) => `${filter}(around:${radius},${params.location.latitude},${params.location.longitude});`)
    .join('\n');
  const query = `
    [out:json][timeout:8];
    (
      ${aroundBlocks}
    );
    out center ${Math.min(Math.max(limit, 30), 80)};
  `;
  const body = `data=${encodeURIComponent(query)}`;

  const tryEndpoint = async (endpoint: string): Promise<Place[]> => {
    const raw = await fetchText(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
      timeoutMs: 7_000,
    });
    const parsed = JSON.parse(raw) as { elements?: OverpassElement[] };
    return (parsed.elements ?? [])
      .map((element) => elementToPlace(element, params.location))
      .filter((place): place is Place => place != null);
  };

  // Race top mirrors; first non-empty wins (public Overpass is often down/504).
  const mirrors = OVERPASS_ENDPOINTS.slice(0, 3);
  try {
    return await Promise.any(
      mirrors.map(async (endpoint) => {
        const places = await tryEndpoint(endpoint);
        if (places.length === 0) {
          throw new Error('empty');
        }
        return places;
      }),
    );
  } catch {
    return [];
  }
}

async function nominatimSearchUrl(
  url: string,
  params: NearbyPlacesParams,
  category: PlaceCategory,
): Promise<Place[]> {
  try {
    const results = await fetchNominatimJson<NominatimResult[]>(url, {
      cacheTtlMs: 10 * 60_000,
      timeoutMs: 8_000,
    });
    return results
      .map((item) => nominatimToPlace(item, params.location, category))
      .filter((place): place is Place => place != null);
  } catch {
    return [];
  }
}

/** Nearby Nominatim: 1 call first (throttled). Second call only if empty. */
async function nominatimNearby(
  params: NearbyPlacesParams,
  category: PlaceCategory,
  radius: number,
  limit: number,
): Promise<Place[]> {
  const phrases = params.query
    ? [params.query]
    : (NOMINATIM_QUERIES[category] ?? NOMINATIM_QUERIES.other).slice(
        0,
        category === 'attraction' ? 4 : 2,
      );

  const searchRadius = Math.max(radius * 1.2, Math.min(radius + 8_000, 200_000));
  const box = viewboxFor(params.location, searchRadius);
  const perQueryLimit = Math.min(Math.max(limit, 12), 30);

  const structuredList = NOMINATIM_STRUCTURED[category] ?? [];
  const structured = structuredList[0];
  const primaryUrl = structured
    ? `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&namedetails=1` +
      `&limit=${perQueryLimit}&${Object.entries(structured)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')}&viewbox=${box}&bounded=1`
    : `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&namedetails=1` +
      `&limit=${perQueryLimit}&q=${encodeURIComponent(phrases[0] ?? category)}&viewbox=${box}&bounded=1`;

  let collected = await nominatimSearchUrl(primaryUrl, params, category);
  let inRadius = withinRadius(
    dedupePlaces(collected),
    params.location,
    Math.round(radius * 1.15),
  );

  // Second structured key (e.g. theme_park → attraction) or phrase when thin.
  if (inRadius.length < Math.min(8, limit)) {
    const secondStructured = structuredList[1];
    if (secondStructured) {
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&namedetails=1` +
        `&limit=${perQueryLimit}&${Object.entries(secondStructured)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&')}&viewbox=${box}&bounded=1`;
      collected = [...collected, ...(await nominatimSearchUrl(url, params, category))];
    } else if (phrases[1]) {
      const secondUrl =
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&namedetails=1` +
        `&limit=${perQueryLimit}&q=${encodeURIComponent(phrases[1])}&viewbox=${box}&bounded=1`;
      collected = [...collected, ...(await nominatimSearchUrl(secondUrl, params, category))];
    }
    inRadius = withinRadius(
      dedupePlaces(collected),
      params.location,
      Math.round(radius * 1.25),
    );
  }

  // Extra attraction phrases when still sparse — still bounded to the viewbox.
  if (category === 'attraction' && inRadius.length < 10) {
    for (const phrase of phrases.slice(2, 4)) {
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&namedetails=1` +
        `&limit=${perQueryLimit}&q=${encodeURIComponent(phrase)}&viewbox=${box}&bounded=1`;
      collected = [...collected, ...(await nominatimSearchUrl(url, params, category))];
    }
    inRadius = withinRadius(
      dedupePlaces(collected),
      params.location,
      Math.round(radius * 1.35),
    );
  }

  return inRadius.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
}

/** Keep only places inside the user-selected radius — always recompute haversine. */
function withinRadius(
  places: Place[],
  origin: GeoPoint,
  radiusMeters: number,
): Place[] {
  return filterPlacesWithinRadius(places, origin, radiusMeters, 80);
}

export class OsmPlacesProvider implements PlacesProvider {
  readonly name = 'openstreetmap';

  async searchPlaces(params: SearchPlacesParams): Promise<Place[]> {
    const limit = params.limit ?? 12;
    let url =
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&namedetails=1` +
      `&limit=${limit}&q=${encodeURIComponent(params.query)}`;
    if (params.location) {
      url += `&viewbox=${viewboxFor(params.location, 20_000)}&bounded=1`;
    }

    const photonFallback = async (): Promise<Place[]> => {
      if (!params.location) {
        return [];
      }
      const q = params.query.toLowerCase();
      const category: PlaceCategory | undefined = /restaurant|cafe|food|ramen|dining/.test(q)
        ? 'restaurant'
        : /hotel|hostel|inn/.test(q)
          ? 'hotel'
          : /mall|market|shop/.test(q)
            ? 'shopping'
            : 'attraction';
      const photon = await searchPhotonNearby({
        location: params.location,
        category,
        cityLabel: params.query.replace(/^(restaurants?|places to visit|hotels?|cafes?)\s+/i, ''),
        radiusMeters: 40_000,
        limit,
      }).catch(() => [] as Place[]);
      if (photon.length > 0) {
        rememberPlaces(photon);
        return photon;
      }
      const catalog = searchCatalogNearby({
        location: params.location,
        category,
        radiusMeters: 80_000,
        limit,
      });
      rememberPlaces(catalog);
      return catalog;
    };

    try {
      const results = await fetchNominatimJson<NominatimResult[]>(url, {
        cacheTtlMs: 10 * 60_000,
        timeoutMs: 10_000,
      });
      const places = results
        .map((item) => nominatimToPlace(item, params.location))
        .filter((place): place is Place => place != null);
      if (places.length > 0) {
        rememberPlaces(places);
        return places;
      }
      return photonFallback();
    } catch {
      return photonFallback();
    }
  }

  async getNearbyPlaces(params: NearbyPlacesParams): Promise<Place[]> {
    const limit = Math.min(Math.max(params.limit ?? 20, 8), 100);
    const radius = Math.min(Math.max(params.radiusMeters, 200), 200_000);
    const category: PlaceCategory | undefined = params.category;
    const effectiveCategory: PlaceCategory = category ?? (params.query ? 'other' : 'attraction');

    const primary =
      category === 'attraction'
        ? 'attraction'
        : category === 'restaurant'
          ? 'restaurant'
          : category === 'shopping'
            ? 'shopping'
            : effectiveCategory;

    // Start Photon immediately so any city still fills if OSM is slow/429/504.
    const photonPromise = searchPhotonNearby({
      location: params.location,
      category: primary,
      cityLabel: params.cityLabel,
      countryCode: params.countryCode,
      radiusMeters: Math.max(radius, 15_000),
      limit: Math.max(limit, 40),
    }).catch(() => [] as Place[]);

    const livePromise = (async (): Promise<Place[]> => {
      const filters = CATEGORY_FILTERS[primary] ?? CATEGORY_FILTERS.other;
      const [overpass, nominatim] = await Promise.all([
        overpassNearby(params, filters, radius, limit),
        nominatimNearby(params, primary, radius, limit),
      ]);

      let places = withinRadius(
        dedupePlaces([...overpass, ...nominatim]),
        params.location,
        Math.round(radius * 1.2),
      );

      if (params.query) {
        const q = params.query.toLowerCase();
        places = places.filter((place) => place.name.toLowerCase().includes(q));
      }

      if (category && category !== 'other') {
        places = filterPlacesByCategory(places, category);
      }

      // Blend curated landmarks only for categories that have catalog data.
      const catalog = searchCatalogNearby({
        location: params.location,
        category: primary,
        radiusMeters: Math.max(radius, 40_000),
        limit: Math.max(limit, 40),
      });
      places = dedupePlaces([...catalog, ...places]);
      places = withinRadius(places, params.location, radius + 120);
      if (category && category !== 'other') {
        places = filterPlacesByCategory(places, category);
      }

      return sortPlacesByCategoryPopularity(places, category ?? primary).slice(0, limit);
    })().catch(() => [] as Place[]);

    const live = await Promise.race([
      livePromise,
      new Promise<Place[] | null>((resolve) => {
        setTimeout(() => resolve(null), 6_000);
      }),
    ]);

    if (live && live.length > 0) {
      rememberPlaces(live);
      return live;
    }

    const photon = await photonPromise;
    if (photon.length > 0) {
      const catalog = searchCatalogNearby({
        location: params.location,
        category: primary,
        radiusMeters: Math.max(radius, 40_000),
        limit,
      });
      let merged = dedupePlaces([...catalog, ...photon]);
      if (category && category !== 'other') {
        merged = filterPlacesByCategory(merged, category);
      }
      merged = withinRadius(merged, params.location, radius + 150).slice(0, limit);
      rememberPlaces(merged);
      return merged;
    }

    // Live may still finish after budget — prefer it over catalog if it has data.
    const lateLive = await livePromise;
    if (lateLive.length > 0) {
      rememberPlaces(lateLive);
      return lateLive;
    }

    const catalog = searchCatalogNearby({
      location: params.location,
      category: primary,
      radiusMeters: Math.max(radius, 40_000),
      limit,
    });
    const filtered =
      category && category !== 'other' ? filterPlacesByCategory(catalog, category) : catalog;
    const localCatalog = withinRadius(filtered, params.location, radius + 150);
    rememberPlaces(localCatalog);
    return localCatalog;
  }

  async getPlaceDetails(placeId: string): Promise<Place | null> {
    const cached = recallPlace(placeId);

    const osmMatch = /^osm-(node|way|relation)-(\d+)$/.exec(placeId);
    if (osmMatch) {
      const type = osmMatch[1]!;
      const osmId = osmMatch[2]!;
      const enriched = await fetchOverpassElement(type, osmId);
      if (enriched) {
        const merged = cached ? { ...cached, ...enriched, id: placeId } : enriched;
        rememberPlace(merged);
        return merged;
      }
      if (cached) {
        return cached;
      }
    }

    if (placeId.startsWith('nominatim-')) {
      const id = placeId.replace('nominatim-', '');
      // Correct Nominatim lookup uses osm_ids; place_ids is invalid and always failed.
      const details = await fetchJson<{
        place_id?: number;
        osm_type?: string;
        osm_id?: number;
        localname?: string;
        names?: Record<string, string>;
        extratags?: Record<string, string>;
        addresstags?: Record<string, string>;
        centroid?: { coordinates?: [number, number] };
        geometry?: { coordinates?: [number, number] };
      }>(
        `https://nominatim.openstreetmap.org/details?place_id=${id}&format=json&addressdetails=1&extratags=1&namedetails=1`,
        { cacheTtlMs: 10 * 60_000, timeoutMs: 10_000 },
      ).catch(() => null);

      if (details) {
        const coords =
          details.centroid?.coordinates ?? details.geometry?.coordinates ?? null;
        const lon = coords?.[0];
        const lat = coords?.[1];
        if (lat != null && lon != null) {
          const kind = osmTypePrefix(details.osm_type);
          let place: Place = {
            id:
              kind && details.osm_id != null
                ? `osm-${kind}-${details.osm_id}`
                : placeId,
            provider: 'openstreetmap',
            providerPlaceId:
              kind && details.osm_id != null
                ? `${kind}/${details.osm_id}`
                : String(details.place_id ?? id),
            name: resolveBilingualPlaceName({
              primary: details.localname || details.names?.name || cached?.name,
              names: details.names,
              tags: details.extratags,
            }) ||
              details.localname ||
              details.names?.name ||
              cached?.name ||
              'Place',
            category: cached?.category ?? 'other',
            latitude: lat,
            longitude: lon,
            address: cached?.address,
            distanceMeters: cached?.distanceMeters,
          };
          place = enrichFromTags(place, details.extratags);
          if (kind && details.osm_id != null) {
            const osm = await fetchOverpassElement(kind, String(details.osm_id));
            if (osm) {
              place = { ...place, ...osm, id: place.id, distanceMeters: place.distanceMeters };
            }
          }
          rememberPlace(place);
          return place;
        }
      }
      return cached;
    }

    return cached;
  }

  async getPlacePhotos(_placeId: string): Promise<string[]> {
    return [];
  }
}

async function fetchOverpassElement(
  type: string,
  id: string,
): Promise<Place | null> {
  const query = `
    [out:json][timeout:10];
    ${type}(${id});
    out center tags;
  `;
  const body = `data=${encodeURIComponent(query)}`;
  for (const endpoint of OVERPASS_ENDPOINTS.slice(0, 4)) {
    try {
      const raw = await fetchText(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body,
        timeoutMs: 8_000,
      });
      const parsed = JSON.parse(raw) as { elements?: OverpassElement[] };
      const element = parsed.elements?.[0];
      if (element) {
        return elementToPlace(element);
      }
    } catch {
      // next mirror
    }
  }
  return null;
}
