import { listTrips } from '@/services/trips/trips.service';
import { addItineraryItem, listItinerary, optimizeItineraryDay } from '@/services/itinerary/itinerary.service';
import { addExpense, getBudget, listExpenses, summarizeExpenses } from '@/services/budget/budget.service';
import { useLocationStore } from '@/stores/location-store';
import type { AIChatRequest, GeoPoint, Place, PlaceCategory, WeatherSnapshot } from '@/types/domain';
import type { ProviderRegistry } from '@/providers/registry';
import { DEFAULT_MAP_CENTER } from '@/services/location/location.service';

export type ToolResult = { name: string; result: unknown };

function getProviders(): ProviderRegistry {
  // Lazy require avoids circular init with MockAIProvider → tools → registry.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/providers/registry').providers as ProviderRegistry;
}

const TOOL_NAMES = [
  'get_current_location',
  'search_places',
  'find_nearby_places',
  'find_attractions',
  'find_food',
  'get_place_details',
  'get_routes',
  'compare_routes',
  'get_weather',
  'search_hotels',
  'convert_currency',
  'search_esim',
  'find_hospital',
  'find_pharmacy',
  'find_police_station',
  'find_embassy',
  'find_coworking_space',
  'get_trip',
  'get_itinerary',
  'add_itinerary_item',
  'optimize_itinerary',
  'get_budget',
  'add_expense',
] as const;

function detectTools(message: string, mode?: string): string[] {
  const text = message.toLowerCase();
  const tools = new Set<string>();

  if (mode === 'emergency' || /hospital|pharmacy|police|embassy|emergency/.test(text)) {
    tools.add('find_hospital');
    tools.add('find_pharmacy');
    tools.add('find_police_station');
  }
  if (/hotel|stay|accommodation/.test(text) || mode === 'planner') {
    tools.add('search_hotels');
  }
  if (/route|how do i get|directions|train|subway|bus|transfer/.test(text) || mode === 'navigator') {
    tools.add('compare_routes');
  }
  if (/weather|rain|forecast|afternoon|today|outside/.test(text)) {
    tools.add('get_weather');
  }
  if (/currency|exchange|php|jpy|usd|convert/.test(text) || mode === 'budget') {
    tools.add('convert_currency');
  }
  if (/esim|sim card|data plan/.test(text)) {
    tools.add('search_esim');
  }
  if (/cowork|remote work|wifi/.test(text)) {
    tools.add('find_coworking_space');
  }
  if (
    /nearby|things to do|what should we do|what can we do|afternoon|morning|evening|weekend|sightseeing|attraction|museum|park|visit/.test(
      text,
    ) ||
    mode === 'explore' ||
    mode === 'planner'
  ) {
    tools.add('find_attractions');
  }
  if (
    /restaurant|food|breakfast|lunch|dinner|eat|cafe|coffee|afternoon|lunch|snack/.test(text) ||
    mode === 'explore'
  ) {
    tools.add('find_food');
  }
  if (/trip|itinerary|plan/.test(text) || mode === 'planner') {
    tools.add('get_trip');
    tools.add('get_itinerary');
  }
  if (/budget|expense|spent/.test(text) || mode === 'budget') {
    tools.add('get_budget');
  }

  tools.add('get_current_location');
  return [...tools];
}

function resolveLocation(request: AIChatRequest): {
  coords: GeoPoint;
  city: string | null;
  country: string | null;
  label: string;
  mode: string;
  countryCode: string;
} {
  const store = useLocationStore.getState();
  const context = request.context ?? {};
  const contextCoords =
    context.latitude != null && context.longitude != null
      ? {
          latitude: Number(context.latitude),
          longitude: Number(context.longitude),
        }
      : null;

  const coords = contextCoords ?? store.coords ?? DEFAULT_MAP_CENTER;
  const city =
    (typeof context.city === 'string' && context.city) || store.city || null;
  const country =
    (typeof context.country === 'string' && context.country) || store.country || null;
  const label =
    (typeof context.label === 'string' && context.label) ||
    store.label ||
    [city, country].filter(Boolean).join(', ') ||
    'Selected location';

  const countryHint = `${country ?? ''} ${label}`.toLowerCase();
  let countryCode = 'PH';
  if (/japan|tokyo|osaka|kyoto/.test(countryHint)) countryCode = 'JP';
  else if (/united states|usa|san francisco|new york/.test(countryHint)) countryCode = 'US';
  else if (/korea|seoul/.test(countryHint)) countryCode = 'KR';
  else if (/thailand|bangkok/.test(countryHint)) countryCode = 'TH';
  else if (/philippine|manila|bulacan|cebu|davao/.test(countryHint)) countryCode = 'PH';

  return {
    coords,
    city,
    country,
    label,
    mode: store.mode,
    countryCode,
  };
}

async function runTool(name: string, request: AIChatRequest): Promise<unknown> {
  const providers = getProviders();
  const location = resolveLocation(request);
  const context = request.context ?? {};
  const userId = typeof context.userId === 'string' ? context.userId : 'local';

  switch (name) {
    case 'get_current_location':
      return {
        coords: location.coords,
        city: location.city,
        country: location.country,
        label: location.label,
        mode: location.mode,
        source: useLocationStore.getState().coords ? 'user' : 'fallback',
      };
    case 'find_nearby_places':
      return providers.places.getNearbyPlaces({
        location: location.coords,
        radiusMeters: 4000,
        limit: 8,
      });
    case 'find_attractions':
      return providers.places.getNearbyPlaces({
        location: location.coords,
        radiusMeters: 5000,
        category: 'attraction',
        limit: 8,
      });
    case 'find_food':
      return providers.places.getNearbyPlaces({
        location: location.coords,
        radiusMeters: 2500,
        category: 'restaurant',
        limit: 6,
      });
    case 'search_places':
      return providers.places.searchPlaces({
        query: typeof context.query === 'string' ? context.query : location.label,
        location: location.coords,
        limit: 8,
      });
    case 'get_place_details': {
      const nearby = await providers.places.getNearbyPlaces({
        location: location.coords,
        radiusMeters: 5000,
        category: 'attraction',
        limit: 1,
      });
      return nearby[0] ?? null;
    }
    case 'compare_routes':
    case 'get_routes':
      return providers.transport.getRoutes({
        origin: location.coords,
        destination: {
          latitude: location.coords.latitude + 0.02,
          longitude: location.coords.longitude + 0.015,
        },
      });
    case 'get_weather':
      return providers.weather.getCurrentWeather(location.coords);
    case 'search_hotels':
      return providers.hotels.searchHotels({
        location: location.coords,
        checkIn: new Date().toISOString().slice(0, 10),
        checkOut: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        adults: 2,
        children: 0,
        rooms: 1,
      });
    case 'convert_currency':
      return providers.currency.convert(
        1000,
        location.countryCode === 'JP' ? 'JPY' : 'PHP',
        'USD',
      );
    case 'search_esim':
      return providers.esim.searchByCountry(location.countryCode);
    case 'find_hospital':
      return providers.places.getNearbyPlaces({
        location: location.coords,
        radiusMeters: 5000,
        category: 'hospital' as PlaceCategory,
      });
    case 'find_pharmacy':
      return providers.places.getNearbyPlaces({
        location: location.coords,
        radiusMeters: 3000,
        category: 'pharmacy',
      });
    case 'find_police_station':
      return providers.places.getNearbyPlaces({
        location: location.coords,
        radiusMeters: 3000,
        category: 'police',
      });
    case 'find_embassy':
      return providers.places.getNearbyPlaces({
        location: location.coords,
        radiusMeters: 10000,
        category: 'embassy',
      });
    case 'find_coworking_space':
      return providers.places.getNearbyPlaces({
        location: location.coords,
        radiusMeters: 5000,
        category: 'coworking',
      });
    case 'get_trip': {
      const trips = await listTrips(userId);
      return trips[0] ?? null;
    }
    case 'get_itinerary': {
      const trips = await listTrips(userId);
      if (!trips[0]) {
        return [];
      }
      return listItinerary(trips[0].id);
    }
    case 'add_itinerary_item': {
      const trips = await listTrips(userId);
      if (!trips[0]) {
        return { error: 'No trip available' };
      }
      return addItineraryItem({
        tripId: trips[0].id,
        day: new Date().toISOString().slice(0, 10),
        startTime: '14:00',
        endTime: '16:00',
        title: 'AI suggested activity',
        notes: 'Created via AI tool — verify hours and transport before going.',
      });
    }
    case 'optimize_itinerary': {
      const trips = await listTrips(userId);
      if (!trips[0]) {
        return [];
      }
      return optimizeItineraryDay(trips[0].id, new Date().toISOString().slice(0, 10));
    }
    case 'get_budget': {
      const trips = await listTrips(userId);
      if (!trips[0]) {
        return null;
      }
      const budget = await getBudget(trips[0].id);
      const expenses = await listExpenses(trips[0].id);
      return { budget, summary: summarizeExpenses(expenses, budget), expenses };
    }
    case 'add_expense': {
      const trips = await listTrips(userId);
      if (!trips[0]) {
        return { error: 'No trip available' };
      }
      return addExpense({
        tripId: trips[0].id,
        userId,
        amount: 12,
        currency: 'USD',
        homeCurrency: 'USD',
        category: 'food',
        date: new Date().toISOString().slice(0, 10),
        notes: 'Added via AI tool',
      });
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function executeTravelTools(request: AIChatRequest): Promise<ToolResult[]> {
  const lastUser = [...request.messages].reverse().find((message) => message.role === 'user');
  const tools = detectTools(lastUser?.content ?? '', request.mode);
  const results: ToolResult[] = [];

  for (const name of tools) {
    if (!(TOOL_NAMES as readonly string[]).includes(name)) {
      continue;
    }
    try {
      results.push({ name, result: await runTool(name, request) });
    } catch (error) {
      results.push({
        name,
        result: {
          error:
            error instanceof Error ? error.message : 'Tool failed (network or provider unavailable)',
        },
      });
    }
  }

  return results;
}

function formatPlaceList(places: Place[], title: string): string {
  if (!places.length) {
    return `• ${title}: none found nearby`;
  }
  const lines = places.slice(0, 5).map((place, index) => {
    const distance =
      place.distanceMeters != null ? ` · ${(place.distanceMeters / 1000).toFixed(1)} km` : '';
    return `  ${index + 1}. ${place.name}${distance}${place.address ? ` — ${place.address}` : ''}`;
  });
  return `• ${title} (${places.length}):\n${lines.join('\n')}`;
}

export function summarizeToolResults(results: ToolResult[]): string {
  if (results.length === 0) {
    return 'No tool data was available for this request.';
  }

  return results
    .map((entry) => {
      const payload = entry.result;

      if (entry.name === 'get_current_location' && payload && typeof payload === 'object') {
        const loc = payload as {
          label?: string;
          city?: string;
          country?: string;
          coords?: GeoPoint;
        };
        return `• Location: ${
          loc.label ??
          ([loc.city, loc.country].filter(Boolean).join(', ') || 'unknown')
        } (${loc.coords?.latitude.toFixed(3)}, ${loc.coords?.longitude.toFixed(3)})`;
      }

      if (entry.name === 'get_weather' && payload && typeof payload === 'object') {
        const weather = payload as WeatherSnapshot;
        return `• Weather in ${weather.locationName}: ${weather.temperatureC}°C, ${weather.condition}${
          weather.rainChancePercent != null ? `, rain ${weather.rainChancePercent}%` : ''
        }`;
      }

      if (Array.isArray(payload) && payload[0] && typeof payload[0] === 'object' && 'name' in payload[0]) {
        const places = payload as Place[];
        const title =
          entry.name === 'find_attractions'
            ? 'Attractions'
            : entry.name === 'find_food'
              ? 'Food nearby'
              : entry.name.replace(/_/g, ' ');
        return formatPlaceList(places, title);
      }

      if (Array.isArray(payload)) {
        return `• ${entry.name}: ${payload.length} result(s)`;
      }
      if (payload && typeof payload === 'object' && 'error' in payload) {
        return `• ${entry.name}: ${String((payload as { error: unknown }).error)}`;
      }
      if (payload && typeof payload === 'object') {
        return `• ${entry.name}: data returned`;
      }
      return `• ${entry.name}: ${String(payload)}`;
    })
    .join('\n');
}

export function buildLocationAwareReply(
  mode: string,
  toolSummary: string,
  locationLabel: string,
): string {
  if (mode === 'emergency') {
    return [
      `Emergency help near ${locationLabel}:`,
      toolSummary,
      '',
      'Call local emergency numbers when needed. Confirm facility status before traveling.',
    ].join('\n');
  }

  if (mode === 'planner' || mode === 'ask' || mode === 'explore') {
    return [
      `Ideas near ${locationLabel} (live map + weather tools):`,
      '',
      toolSummary,
      '',
      'Tip: open Explore or a place card for details and directions. Hours/fares can change — verify on site.',
    ].join('\n');
  }

  return [
    `TravelAssistant AI (${mode}) · ${locationLabel}`,
    '',
    toolSummary,
    '',
    'Ask for food, attractions, weather, hotels, or directions near your current city.',
  ].join('\n');
}
