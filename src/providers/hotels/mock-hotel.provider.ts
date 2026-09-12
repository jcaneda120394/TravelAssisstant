import type { HotelProvider, HotelSearchParams } from '@/providers/hotels/hotel.provider';
import type { Hotel } from '@/types/domain';

const MOCK_HOTELS: Hotel[] = [
  {
    id: 'mock-hotel-1',
    provider: 'mock',
    name: 'Sample Station Hotel',
    latitude: 35.6812,
    longitude: 139.7671,
    address: '3-1 Station Front',
    rating: 4.4,
    reviewCount: 812,
    pricePerNight: 140,
    currency: 'USD',
    amenities: ['Wi-Fi', 'Breakfast', 'Luggage storage'],
    roomType: 'Superior Twin',
    cancellation: 'Free cancellation (mock)',
    distanceFromStationMeters: 180,
    isMock: true,
  },
  {
    id: 'mock-hotel-2',
    provider: 'mock',
    name: 'Harbor View Stay',
    latitude: 35.66,
    longitude: 139.71,
    address: '8-2 Harbor Road',
    rating: 4.7,
    reviewCount: 1204,
    pricePerNight: 210,
    currency: 'USD',
    amenities: ['Wi-Fi', 'Gym', 'Laundry'],
    roomType: 'Deluxe King',
    cancellation: 'Non-refundable (mock)',
    distanceFromStationMeters: 650,
    isMock: true,
  },
];

export class MockHotelProvider implements HotelProvider {
  readonly name = 'mock-hotels';

  async searchHotels(_params: HotelSearchParams): Promise<Hotel[]> {
    return MOCK_HOTELS;
  }

  async getHotel(hotelId: string): Promise<Hotel | null> {
    return MOCK_HOTELS.find((hotel) => hotel.id === hotelId) ?? null;
  }

  async getAvailability(hotelId: string, _params: HotelSearchParams): Promise<Hotel | null> {
    return this.getHotel(hotelId);
  }

  async getRates(hotelId: string, _params: HotelSearchParams): Promise<Hotel[]> {
    const hotel = await this.getHotel(hotelId);
    return hotel ? [hotel] : [];
  }

  async getRooms(hotelId: string, params: HotelSearchParams): Promise<Hotel[]> {
    return this.getRates(hotelId, params);
  }

  async getPhotos(_hotelId: string): Promise<string[]> {
    return [];
  }
}
