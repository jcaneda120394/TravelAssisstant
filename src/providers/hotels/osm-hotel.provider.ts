import { fetchJson } from '@/lib/http/fetch-json';
import type { HotelProvider, HotelSearchParams } from '@/providers/hotels/hotel.provider';
import type { GeoPoint, Hotel } from '@/types/domain';
import { resolveBilingualPlaceName } from '@/utils/place-name';

type NominatimHit = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  class?: string;
  namedetails?: Record<string, string>;
  extratags?: Record<string, string>;
};

function isGeoPoint(value: string | GeoPoint): value is GeoPoint {
  return typeof value === 'object' && value != null && 'latitude' in value;
}

function hitToHotel(hit: NominatimHit): Hotel {
  const name =
    resolveBilingualPlaceName({
      primary: hit.name,
      displayName: hit.display_name,
      names: hit.namedetails,
      tags: hit.extratags,
    }) ||
    hit.name ||
    hit.display_name.split(',')[0] ||
    'Hotel';

  return {
    id: `nominatim-${hit.place_id}`,
    provider: 'openstreetmap',
    name,
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
    address: hit.display_name,
    photos: [],
    amenities: [],
    cancellation: 'Live rates require a hotel partner API. Showing OpenStreetMap listings.',
    isMock: false,
  };
}

function viewbox(origin: GeoPoint, radiusMeters: number): string {
  const latDelta = radiusMeters / 111_320;
  const lonDelta =
    radiusMeters / (111_320 * Math.max(0.2, Math.cos((origin.latitude * Math.PI) / 180)));
  return `${origin.longitude - lonDelta},${origin.latitude + latDelta},${origin.longitude + lonDelta},${origin.latitude - latDelta}`;
}

export class OsmHotelProvider implements HotelProvider {
  readonly name = 'openstreetmap-hotels';
  private cache = new Map<string, Hotel>();

  private async geocode(query: string): Promise<GeoPoint> {
    const url =
      `https://nominatim.openstreetmap.org/search?format=json&limit=1` +
      `&q=${encodeURIComponent(query)}`;
    const results = await fetchJson<NominatimHit[]>(url, {
      cacheTtlMs: 10 * 60_000,
      timeoutMs: 10_000,
    });
    const first = results[0];
    if (!first) {
      throw new Error(`Could not find “${query}”`);
    }
    return { latitude: Number(first.lat), longitude: Number(first.lon) };
  }

  async searchHotels(params: HotelSearchParams): Promise<Hotel[]> {
    const origin = isGeoPoint(params.location)
      ? params.location
      : await this.geocode(String(params.location));

    // One fast Nominatim call — avoid the multi-phrase nearby fan-out that stalls Hotels.
    const url =
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&namedetails=1` +
      `&limit=20&q=${encodeURIComponent('hotel')}` +
      `&viewbox=${viewbox(origin, 15_000)}&bounded=1`;

    let results = await fetchJson<NominatimHit[]>(url, {
      cacheTtlMs: 3 * 60_000,
      timeoutMs: 12_000,
    }).catch(() => [] as NominatimHit[]);

    if (results.length === 0 && !isGeoPoint(params.location)) {
      const fallbackUrl =
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&namedetails=1` +
        `&limit=20&q=${encodeURIComponent(`hotel ${String(params.location)}`)}`;
      results = await fetchJson<NominatimHit[]>(fallbackUrl, {
        cacheTtlMs: 3 * 60_000,
        timeoutMs: 12_000,
      }).catch(() => [] as NominatimHit[]);
    }

    if (results.length > 0) {
      const hotels = results.map(hitToHotel);
      hotels.forEach((hotel) => this.cache.set(hotel.id, hotel));
      return hotels;
    }

    // Photon worldwide fallback when Nominatim is empty/rate-limited.
    const { searchPhotonNearby } = await import('@/services/places/photon-nearby.service');
    const cityLabel = isGeoPoint(params.location) ? null : String(params.location);
    const places = await searchPhotonNearby({
      location: origin,
      category: 'hotel',
      cityLabel,
      radiusMeters: 25_000,
      limit: 20,
    }).catch(() => []);

    const hotels = places.map((place) => {
      const hotel: Hotel = {
        id: place.id,
        provider: 'photon',
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        address: place.address,
        photos: [],
        amenities: [],
        cancellation: 'Live rates require a hotel partner API. Showing map listings.',
        isMock: false,
      };
      this.cache.set(hotel.id, hotel);
      return hotel;
    });
    return hotels;
  }

  async getHotel(hotelId: string): Promise<Hotel | null> {
    if (this.cache.has(hotelId)) {
      return this.cache.get(hotelId) ?? null;
    }
    if (!hotelId.startsWith('nominatim-')) {
      return null;
    }
    const id = hotelId.replace('nominatim-', '');
    const results = await fetchJson<NominatimHit[]>(
      `https://nominatim.openstreetmap.org/lookup?format=json&place_ids=${id}`,
      { cacheTtlMs: 10 * 60_000, timeoutMs: 10_000 },
    ).catch(() => [] as NominatimHit[]);
    const first = results[0];
    if (!first) {
      return null;
    }
    const hotel = hitToHotel(first);
    this.cache.set(hotel.id, hotel);
    return hotel;
  }

  async getAvailability(hotelId: string, _params: HotelSearchParams): Promise<Hotel | null> {
    return this.getHotel(hotelId);
  }

  async getRates(hotelId: string, params: HotelSearchParams): Promise<Hotel[]> {
    const hotel = await this.getAvailability(hotelId, params);
    return hotel ? [hotel] : [];
  }

  async getRooms(hotelId: string, params: HotelSearchParams): Promise<Hotel[]> {
    return this.getRates(hotelId, params);
  }

  async getPhotos(hotelId: string): Promise<string[]> {
    const hotel = await this.getHotel(hotelId);
    return hotel?.photos ?? [];
  }
}
