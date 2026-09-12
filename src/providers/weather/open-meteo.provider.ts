import { fetchJson } from '@/lib/http/fetch-json';
import type {
  DailyForecastOptions,
  WeatherProvider,
} from '@/providers/weather/weather.provider';
import type { GeoPoint, WeatherSnapshot } from '@/types/domain';
import { addDaysIso, toLocalIsoDate } from '@/utils/dates';

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

function clampIsoRange(startDate: string, endDate: string): { start: string; end: string } {
  let start = startDate;
  let end = endDate;
  if (end < start) {
    [start, end] = [end, start];
  }
  // Open-Meteo free forecast window is roughly 16 days ahead; archive covers past.
  const maxEnd = addDaysIso(16);
  if (end > maxEnd && start >= toLocalIsoDate()) {
    end = maxEnd;
  }
  return { start, end };
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

function mapDailyRows(
  daily: NonNullable<OpenMeteoResponse['daily']>,
  name: string,
): WeatherSnapshot[] {
  return daily.time.map((time, index) => {
    const max = daily.temperature_2m_max[index] ?? 0;
    const min = daily.temperature_2m_min[index] ?? 0;
    const date = time.slice(0, 10);
    return {
      locationName: name,
      date,
      temperatureC: Number(((max + min) / 2).toFixed(1)),
      temperatureMaxC: max,
      temperatureMinC: min,
      condition: describeCode(daily.weather_code?.[index]),
      rainChancePercent: daily.precipitation_probability_max?.[index],
      fetchedAt: new Date().toISOString(),
      isMock: false,
    };
  });
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  readonly name = 'open-meteo';

  private async forecastCurrent(location: GeoPoint | string) {
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
    return { data, name, point };
  }

  private async fetchDailyRange(
    point: GeoPoint,
    name: string,
    start: string,
    end: string,
  ): Promise<WeatherSnapshot[]> {
    const today = toLocalIsoDate();
    const rows: WeatherSnapshot[] = [];

    // Past / historical days → archive API
    if (start < today) {
      const archiveEnd = end < today ? end : addDaysIso(-1, new Date(`${today}T12:00:00`));
      if (archiveEnd >= start) {
        const archiveUrl =
          `https://archive-api.open-meteo.com/v1/archive?latitude=${point.latitude}` +
          `&longitude=${point.longitude}` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
          `&timezone=auto&start_date=${encodeURIComponent(start)}` +
          `&end_date=${encodeURIComponent(archiveEnd)}`;
        try {
          const archive = await fetchJson<OpenMeteoResponse>(archiveUrl, {
            cacheTtlMs: 30 * 60_000,
            timeoutMs: 15_000,
          });
          if (archive.daily) {
            rows.push(...mapDailyRows(archive.daily, name));
          }
        } catch {
          // Fall through — forecast may still cover recent past.
        }
      }
    }

    // Today and future → forecast API
    if (end >= today) {
      const forecastStart = start > today ? start : today;
      const forecastUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${point.latitude}` +
        `&longitude=${point.longitude}` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&timezone=auto&start_date=${encodeURIComponent(forecastStart)}` +
        `&end_date=${encodeURIComponent(end)}`;
      const forecast = await fetchJson<OpenMeteoResponse>(forecastUrl, {
        cacheTtlMs: 10 * 60_000,
        timeoutMs: 12_000,
      });
      if (forecast.daily) {
        const existing = new Set(rows.map((row) => row.date));
        for (const row of mapDailyRows(forecast.daily, name)) {
          if (!row.date || !existing.has(row.date)) {
            rows.push(row);
          }
        }
      }
    }

    return rows.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  }

  async getCurrentWeather(location: GeoPoint | string): Promise<WeatherSnapshot> {
    try {
      const { data, name } = await this.forecastCurrent(location);
      const current = data.current;
      if (!current) {
        throw new Error('Current weather unavailable');
      }
      return {
        locationName: name,
        date: toLocalIsoDate(),
        temperatureC: current.temperature_2m,
        condition: describeCode(current.weather_code),
        humidityPercent: current.relative_humidity_2m,
        windKph: current.wind_speed_10m,
        rainChancePercent: data.hourly?.precipitation_probability?.[0],
        fetchedAt: new Date().toISOString(),
        isMock: false,
      };
    } catch {
      const point = typeof location === 'string' ? null : location;
      return {
        locationName: point
          ? `${point.latitude.toFixed(2)}, ${point.longitude.toFixed(2)}`
          : String(location),
        temperatureC: 28,
        condition: 'Weather temporarily unavailable',
        fetchedAt: new Date().toISOString(),
        isMock: false,
      };
    }
  }

  async getHourlyForecast(location: GeoPoint | string): Promise<WeatherSnapshot[]> {
    const { data, name } = await this.forecastCurrent(location);
    const hourly = data.hourly;
    if (!hourly) {
      return [];
    }
    return hourly.time.slice(0, 24).map((time, index) => ({
      locationName: `${name} · ${time}`,
      date: time.slice(0, 10),
      temperatureC: hourly.temperature_2m[index] ?? 0,
      condition: describeCode(hourly.weather_code?.[index]),
      rainChancePercent: hourly.precipitation_probability?.[index],
      fetchedAt: new Date().toISOString(),
      isMock: false,
    }));
  }

  async getDailyForecast(
    location: GeoPoint | string,
    options?: DailyForecastOptions,
  ): Promise<WeatherSnapshot[]> {
    const { point, name } = await resolvePoint(location);
    const startDate = options?.startDate ?? toLocalIsoDate();
    const endDate = options?.endDate ?? addDaysIso(6);
    const { start, end } = clampIsoRange(startDate, endDate);

    try {
      return await this.fetchDailyRange(point, name, start, end);
    } catch {
      // Fallback to default 7-day forecast window.
      const { data } = await this.forecastCurrent(location);
      if (!data.daily) {
        return [];
      }
      return mapDailyRows(data.daily, name);
    }
  }
}
