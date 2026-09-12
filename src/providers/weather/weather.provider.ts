import type { GeoPoint, WeatherSnapshot } from '@/types/domain';

export interface WeatherProvider {
  readonly name: string;
  getCurrentWeather(location: GeoPoint | string): Promise<WeatherSnapshot>;
  getHourlyForecast(location: GeoPoint | string): Promise<WeatherSnapshot[]>;
  getDailyForecast(location: GeoPoint | string): Promise<WeatherSnapshot[]>;
}
