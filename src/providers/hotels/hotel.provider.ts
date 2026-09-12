import type { GeoPoint, Hotel } from '@/types/domain';

export type HotelSearchParams = {
  location: string | GeoPoint;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  rooms?: number;
};

export interface HotelProvider {
  readonly name: string;
  searchHotels(params: HotelSearchParams): Promise<Hotel[]>;
  getHotel(hotelId: string): Promise<Hotel | null>;
  getAvailability(hotelId: string, params: HotelSearchParams): Promise<Hotel | null>;
  getRates(hotelId: string, params: HotelSearchParams): Promise<Hotel[]>;
  getRooms(hotelId: string, params: HotelSearchParams): Promise<Hotel[]>;
  getPhotos(hotelId: string): Promise<string[]>;
}
