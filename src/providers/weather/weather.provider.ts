import type { GeoPoint, WeatherSnapshot } from '@/types/domain';

export type DailyForecastOptions = {
  /** Inclusive start date YYYY-MM-DD */
  startDate: string;
  /** Inclusive end date YYYY-MM-DD */
  endDate: string;
};

export interface WeatherProvider {
  readonly name: string;
  getCurrentWeather(location: GeoPoint | string): Promise<WeatherSnapshot>;
  getHourlyForecast(location: GeoPoint | string): Promise<WeatherSnapshot[]>;
  getDailyForecast(
    location: GeoPoint | string,
    options?: DailyForecastOptions,
  ): Promise<WeatherSnapshot[]>;
}
