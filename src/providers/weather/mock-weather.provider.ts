import type {
  DailyForecastOptions,
  WeatherProvider,
} from '@/providers/weather/weather.provider';
import type { GeoPoint, WeatherSnapshot } from '@/types/domain';
import { addDaysIso, eachDayBetween, toLocalIsoDate } from '@/utils/dates';

function mockSnapshot(locationName = 'Sample City', date?: string): WeatherSnapshot {
  return {
    locationName,
    date,
    temperatureC: 22,
    temperatureMaxC: 26,
    temperatureMinC: 18,
    condition: 'Partly cloudy (mock)',
    humidityPercent: 58,
    windKph: 12,
    uvIndex: 4,
    rainChancePercent: 40,
    fetchedAt: new Date().toISOString(),
    isMock: true,
  };
}

export class MockWeatherProvider implements WeatherProvider {
  readonly name = 'mock-weather';

  async getCurrentWeather(location: GeoPoint | string): Promise<WeatherSnapshot> {
    const name = typeof location === 'string' ? location : 'Current location';
    return mockSnapshot(name, toLocalIsoDate());
  }

  async getHourlyForecast(location: GeoPoint | string): Promise<WeatherSnapshot[]> {
    const base = await this.getCurrentWeather(location);
    return [
      base,
      { ...base, temperatureC: base.temperatureC + 1, rainChancePercent: 55 },
      {
        ...base,
        temperatureC: base.temperatureC - 1,
        condition: 'Light rain expected (mock)',
        rainChancePercent: 70,
      },
    ];
  }

  async getDailyForecast(
    location: GeoPoint | string,
    options?: DailyForecastOptions,
  ): Promise<WeatherSnapshot[]> {
    const name = typeof location === 'string' ? location : 'Current location';
    const start = options?.startDate ?? toLocalIsoDate();
    const end = options?.endDate ?? addDaysIso(6);
    const days = eachDayBetween(start, end).slice(0, 16);
    return days.map((date, index) => ({
      ...mockSnapshot(name, date),
      temperatureC: 20 + (index % 5),
      temperatureMaxC: 24 + (index % 5),
      temperatureMinC: 16 + (index % 4),
      condition: index % 3 === 0 ? 'Drizzle (mock)' : 'Partly cloudy (mock)',
    }));
  }
}
