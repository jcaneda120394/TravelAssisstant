import { fetchJson } from '@/lib/http/fetch-json';
import type { WeatherProvider } from '@/providers/weather/weather.provider';
import type { GeoPoint, WeatherSnapshot } from '@/types/domain';

type OpenMeteoResponse = {
  latitude: number;
  longitude: number;
  timezone?: string;
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability?: number[];
    weather_code?: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
  };
};

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

function describeCode(code?: number): string {
  if (code == null) {
    return 'Unknown';
  }
  return WEATHER_CODES[code] ?? `Weather code ${code}`;
}

async function resolvePoint(location: GeoPoint | string): Promise<{
  point: GeoPoint;
  name: string;
}> {
  if (typeof location !== 'string') {
    return {
      point: location,
      name: `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`,
    };
  }

  const results = await fetchJson<
    Array<{ lat: string; lon: string; display_name: string }>
  >(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`,
  );
  const first = results[0];
  if (!first) {
    throw new Error(`Could not geocode "${location}"`);
  }
  return {
    point: { latitude: Number(first.lat), longitude: Number(first.lon) },
    name: first.display_name.split(',').slice(0, 2).join(',').trim(),
  };
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  readonly name = 'open-meteo';

  private async forecast(location: GeoPoint | string) {
    const { point, name } = await resolvePoint(location);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${point.latitude}` +
      `&longitude=${point.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
      `&hourly=temperature_2m,precipitation_probability,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7`;
    const data = await fetchJson<OpenMeteoResponse>(url, {
      cacheTtlMs: 10 * 60_000,
      timeoutMs: 12_000,
    });
    return { data, name };
  }

  async getCurrentWeather(location: GeoPoint | string): Promise<WeatherSnapshot> {
    const { data, name } = await this.forecast(location);
    const current = data.current;
    if (!current) {
      throw new Error('Current weather unavailable');
    }
    return {
      locationName: name,
      temperatureC: current.temperature_2m,
      condition: describeCode(current.weather_code),
      humidityPercent: current.relative_humidity_2m,
      windKph: current.wind_speed_10m,
      rainChancePercent: data.hourly?.precipitation_probability?.[0],
      fetchedAt: new Date().toISOString(),
      isMock: false,
    };
  }

  async getHourlyForecast(location: GeoPoint | string): Promise<WeatherSnapshot[]> {
    const { data, name } = await this.forecast(location);
    const hourly = data.hourly;
    if (!hourly) {
      return [];
    }
    return hourly.time.slice(0, 24).map((time, index) => ({
      locationName: `${name} · ${time}`,
      temperatureC: hourly.temperature_2m[index] ?? 0,
      condition: describeCode(hourly.weather_code?.[index]),
      rainChancePercent: hourly.precipitation_probability?.[index],
      fetchedAt: new Date().toISOString(),
      isMock: false,
    }));
  }

  async getDailyForecast(location: GeoPoint | string): Promise<WeatherSnapshot[]> {
    const { data, name } = await this.forecast(location);
    const daily = data.daily;
    if (!daily) {
      return [];
    }
    return daily.time.map((time, index) => {
      const max = daily.temperature_2m_max[index] ?? 0;
      const min = daily.temperature_2m_min[index] ?? 0;
      return {
        locationName: `${name} · ${time}`,
        temperatureC: Number(((max + min) / 2).toFixed(1)),
        condition: describeCode(daily.weather_code?.[index]),
        rainChancePercent: daily.precipitation_probability_max?.[index],
        fetchedAt: new Date().toISOString(),
        isMock: false,
      };
    });
  }
}
