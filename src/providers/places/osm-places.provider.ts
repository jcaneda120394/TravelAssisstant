import { fetchJson, fetchText } from '@/lib/http/fetch-json';
import type {
  NearbyPlacesParams,
  PlacesProvider,
  SearchPlacesParams,
} from '@/providers/places/places.provider';
import type { GeoPoint, Place, PlaceCategory } from '@/types/domain';

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
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const CATEGORY_FILTERS: Record<PlaceCategory, string> = {
  restaurant: 'node["amenity"~"restaurant|cafe|fast_food|bar"]',
  attraction: 'node["tourism"~"attraction|museum|viewpoint|gallery|zoo|theme_park|artwork"]',
  hotel: 'node["tourism"~"hotel|hostel|guest_house"]',
  hospital: 'node["amenity"="hospital"]',
  clinic: 'node["amenity"~"clinic|doctors"]',
  pharmacy: 'node["amenity"="pharmacy"]',
  police: 'node["amenity"="police"]',
  fire: 'node["amenity"="fire_station"]',
  embassy: 'node["amenity"="embassy"]',
  atm: 'node["amenity"="atm"]',
  bank: 'node["amenity"="bank"]',
  convenience: 'node["shop"~"convenience|supermarket"]',
  coworking: 'node["amenity"="coworking_space"]',
  transit_station: 'node["railway"~"station|halt|subway_entrance"]',
  airport: 'node["aeroway"="aerodrome"]',
  other: 'node["name"]',
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

function inferCategory(tags: Record<string, string> = {}): PlaceCategory {
  const amenity = tags.amenity;
  const tourism = tags.tourism;
  const shop = tags.shop;
  const railway = tags.railway;
  const aeroway = tags.aeroway;

  if (amenity === 'hospital') return 'hospital';
  if (amenity === 'clinic' || amenity === 'doctors') return 'clinic';
  if (amenity === 'pharmacy') return 'pharmacy';
  if (amenity === 'police') return 'police';
  if (amenity === 'fire_station') return 'fire';
  if (amenity === 'embassy') return 'embassy';
  if (amenity === 'atm') return 'atm';
  if (amenity === 'bank') return 'bank';
  if (amenity === 'coworking_space') return 'coworking';
  if (amenity === 'restaurant' || amenity === 'cafe' || amenity === 'fast_food' || amenity === 'bar') {
    return 'restaurant';
  }
  if (tourism === 'hotel' || tourism === 'hostel' || tourism === 'guest_house') return 'hotel';
  if (tourism === 'attraction' || tourism === 'museum' || tourism === 'viewpoint') return 'attraction';
  if (shop === 'convenience' || shop === 'supermarket') return 'convenience';
  if (railway) return 'transit_station';
  if (aeroway === 'aerodrome') return 'airport';
  return 'other';
}

function elementToPlace(element: OverpassElement, origin?: GeoPoint): Place | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  const tags = element.tags ?? {};
  const name = tags.name ?? tags['name:en'];
  if (lat == null || lon == null || !name) {
    return null;
  }
  const point = { latitude: lat, longitude: lon };
  const usefulTags = [
    tags.cuisine,
    tags.tourism,
    tags.leisure,
    tags.amenity && !['yes', 'no'].includes(tags.amenity) ? tags.amenity : null,
    tags.historic,
    tags.museum,
  ].filter((tag): tag is string => Boolean(tag));

  return {
    id: `osm-${element.type}-${element.id}`,
    provider: 'openstreetmap',
    providerPlaceId: `${element.type}/${element.id}`,
    name,
    category: inferCategory(tags),
    latitude: lat,
    longitude: lon,
    address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']]
      .filter(Boolean)
      .join(' ') || undefined,
    phone: tags.phone ?? tags['contact:phone'],
    website: tags.website ?? tags['contact:website'],
    openingHours: tags.opening_hours ? [tags.opening_hours] : undefined,
    description: tags.description,
    distanceMeters: origin ? Math.round(haversineMeters(origin, point)) : undefined,
    tags: usefulTags.slice(0, 4),
  };
}

function nominatimToPlace(item: NominatimResult): Place {
  return {
    id: `nominatim-${item.place_id}`,
    provider: 'nominatim',
    providerPlaceId: String(item.place_id),
    name: item.name ?? item.display_name.split(',')[0] ?? 'Place',
    category: 'other',
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    address: item.display_name,
    description: `${item.class ?? ''}/${item.type ?? ''}`.replace(/^\/$/, ''),
  };
}

export class OsmPlacesProvider implements PlacesProvider {
  readonly name = 'openstreetmap';

  async searchPlaces(params: SearchPlacesParams): Promise<Place[]> {
    const limit = params.limit ?? 12;
    let url =
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1` +
      `&limit=${limit}&q=${encodeURIComponent(params.query)}`;
    if (params.location) {
      url += `&viewbox=${params.location.longitude - 0.15},${params.location.latitude + 0.15},${params.location.longitude + 0.15},${params.location.latitude - 0.15}&bounded=0`;
    }
    const results = await fetchJson<NominatimResult[]>(url, {
      cacheTtlMs: 5 * 60_000,
      timeoutMs: 12_000,
    });
    return results.map(nominatimToPlace);
  }

  async getNearbyPlaces(params: NearbyPlacesParams): Promise<Place[]> {
    const limit = params.limit ?? 20;
    const radius = Math.min(Math.max(params.radiusMeters, 200), 5000);
    const filterKey = params.category ?? (params.query ? 'other' : 'restaurant');
    const filter =
      params.query && !params.category
        ? `node["name"~"${params.query.replace(/"/g, '')}",i]`
        : CATEGORY_FILTERS[filterKey] ?? CATEGORY_FILTERS.other;

    const query = `
      [out:json][timeout:25];
      (
        ${filter}(around:${radius},${params.location.latitude},${params.location.longitude});
      );
      out center ${limit};
    `;

    const raw = await fetchText('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `data=${encodeURIComponent(query)}`,
      cacheTtlMs: 3 * 60_000,
      timeoutMs: 20_000,
    });
    const parsed = JSON.parse(raw) as { elements?: OverpassElement[] };
    const places = (parsed.elements ?? [])
      .map((element) => elementToPlace(element, params.location))
      .filter((place): place is Place => place != null)
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));

    if (params.query) {
      const q = params.query.toLowerCase();
      return places.filter((place) => place.name.toLowerCase().includes(q)).slice(0, limit);
    }
    return places.slice(0, limit);
  }

  async getPlaceDetails(placeId: string): Promise<Place | null> {
    if (placeId.startsWith('nominatim-')) {
      const id = placeId.replace('nominatim-', '');
      const results = await fetchJson<NominatimResult[]>(
        `https://nominatim.openstreetmap.org/lookup?osm_ids=&format=json&place_ids=${id}`,
        { cacheTtlMs: 10 * 60_000 },
      ).catch(() => [] as NominatimResult[]);
      if (results[0]) {
        return nominatimToPlace(results[0]);
      }
      return null;
    }

    const match = /^osm-(node|way|relation)-(\d+)$/.exec(placeId);
    if (!match) {
      return null;
    }
    const [, type, id] = match;
    const query = `
      [out:json][timeout:25];
      ${type}(${id});
      out center tags;
    `;
    const raw = await fetchText('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `data=${encodeURIComponent(query)}`,
      cacheTtlMs: 10 * 60_000,
      timeoutMs: 20_000,
    });
    const parsed = JSON.parse(raw) as { elements?: OverpassElement[] };
    const element = parsed.elements?.[0];
    return element ? elementToPlace(element) : null;
  }

  async getPlacePhotos(_placeId: string): Promise<string[]> {
    return [];
  }
}
