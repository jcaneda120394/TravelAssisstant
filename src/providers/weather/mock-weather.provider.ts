import type { WeatherProvider } from '@/providers/weather/weather.provider';
import type { GeoPoint, WeatherSnapshot } from '@/types/domain';

function mockSnapshot(locationName = 'Sample City'): WeatherSnapshot {
  return {
    locationName,
    temperatureC: 22,
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
    return mockSnapshot(name);
  }

  async getHourlyForecast(location: GeoPoint | string): Promise<WeatherSnapshot[]> {
    const base = await this.getCurrentWeather(location);
    return [
      base,
      { ...base, temperatureC: base.temperatureC + 1, rainChancePercent: 55 },
      { ...base, temperatureC: base.temperatureC - 1, condition: 'Light rain expected (mock)', rainChancePercent: 70 },
    ];
  }

  async getDailyForecast(location: GeoPoint | string): Promise<WeatherSnapshot[]> {
    return this.getHourlyForecast(location);
  }
}
