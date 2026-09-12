import { OsmPlacesProvider } from '@/providers/places/osm-places.provider';
import type { HotelProvider, HotelSearchParams } from '@/providers/hotels/hotel.provider';
import type { GeoPoint, Hotel } from '@/types/domain';

function isGeoPoint(value: string | GeoPoint): value is GeoPoint {
  return typeof value === 'object' && value != null && 'latitude' in value;
}

function placeToHotel(place: {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  rating?: number;
  reviewCount?: number;
  website?: string;
}): Hotel {
  return {
    id: place.id,
    provider: 'openstreetmap',
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address,
    rating: place.rating,
    reviewCount: place.reviewCount,
    photos: [],
    amenities: [],
    cancellation: 'Live rates require a hotel partner API (Amadeus/Expedia). Showing OSM listings.',
    isMock: false,
  };
}

export class OsmHotelProvider implements HotelProvider {
  readonly name = 'openstreetmap-hotels';
  private readonly places = new OsmPlacesProvider();
  private cache = new Map<string, Hotel>();

  private async resolveLocation(location: string | GeoPoint): Promise<GeoPoint> {
    if (isGeoPoint(location)) {
      return location;
    }
    const results = await this.places.searchPlaces({ query: location, limit: 1 });
    const first = results[0];
    if (!first) {
      throw new Error(`Could not find hotels near "${location}"`);
    }
    return { latitude: first.latitude, longitude: first.longitude };
  }

  async searchHotels(params: HotelSearchParams): Promise<Hotel[]> {
    const location = await this.resolveLocation(params.location);
    const places = await this.places.getNearbyPlaces({
      location,
      radiusMeters: 2500,
      category: 'hotel',
      limit: 20,
    });
    const hotels = places.map(placeToHotel);
    hotels.forEach((hotel) => this.cache.set(hotel.id, hotel));
    return hotels;
  }

  async getHotel(hotelId: string): Promise<Hotel | null> {
    if (this.cache.has(hotelId)) {
      return this.cache.get(hotelId) ?? null;
    }
    const place = await this.places.getPlaceDetails(hotelId);
    if (!place) {
      return null;
    }
    const hotel = placeToHotel(place);
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
