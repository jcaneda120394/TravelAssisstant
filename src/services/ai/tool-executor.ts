import { listTrips } from '@/services/trips/trips.service';
import { addItineraryItem, listItinerary, optimizeItineraryDay } from '@/services/itinerary/itinerary.service';
import { addExpense, getBudget, listExpenses, summarizeExpenses } from '@/services/budget/budget.service';
import { useLocationStore } from '@/stores/location-store';
import type { AIChatRequest, PlaceCategory } from '@/types/domain';
import type { ProviderRegistry } from '@/providers/registry';

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
  if (/weather|rain|forecast/.test(text)) {
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
  if (/nearby|restaurant|food|breakfast|lunch|dinner|attraction|museum/.test(text) || mode === 'explore') {
    tools.add('find_nearby_places');
  }
  if (/trip|itinerary|today|afternoon|plan/.test(text) || mode === 'planner') {
    tools.add('get_trip');
    tools.add('get_itinerary');
    tools.add('get_weather');
    tools.add('compare_routes');
  }
  if (/budget|expense|spent/.test(text) || mode === 'budget') {
    tools.add('get_budget');
  }

  tools.add('get_current_location');
  return [...tools];
}

async function runTool(name: string, request: AIChatRequest): Promise<unknown> {
  const providers = getProviders();
  const location = useLocationStore.getState();
  const coords = location.coords ?? { latitude: 35.6595, longitude: 139.7005 };
  const context = request.context ?? {};
  const userId = typeof context.userId === 'string' ? context.userId : 'local';

  switch (name) {
    case 'get_current_location':
      return {
        coords,
        city: location.city,
        country: location.country,
        label: location.label,
        mode: location.mode,
        source: location.coords ? 'user' : 'fallback_mock_city',
      };
    case 'find_nearby_places':
    case 'search_places':
      return providers.places.getNearbyPlaces({
        location: coords,
        radiusMeters: 2000,
        limit: 8,
      });
    case 'get_place_details': {
      const nearby = await providers.places.getNearbyPlaces({
        location: coords,
        radiusMeters: 5000,
        limit: 1,
      });
      return nearby[0] ?? null;
    }
    case 'compare_routes':
    case 'get_routes':
      return providers.transport.getRoutes({
        origin: coords,
        destination: {
          latitude: coords.latitude + 0.03,
          longitude: coords.longitude + 0.02,
        },
      });
    case 'get_weather':
      return providers.weather.getCurrentWeather(location.city ?? coords);
    case 'search_hotels':
      return providers.hotels.searchHotels({
        location: location.city ?? 'Tokyo',
        checkIn: new Date().toISOString().slice(0, 10),
        checkOut: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        adults: 2,
        children: 0,
        rooms: 1,
      });
    case 'convert_currency':
      return providers.currency.convert(1000, 'PHP', 'JPY');
    case 'search_esim':
      return providers.esim.searchByCountry('JP');
    case 'find_hospital':
      return providers.places.getNearbyPlaces({
        location: coords,
        radiusMeters: 5000,
        category: 'hospital' as PlaceCategory,
      });
    case 'find_pharmacy':
      return providers.places.getNearbyPlaces({
        location: coords,
        radiusMeters: 3000,
        category: 'pharmacy',
      });
    case 'find_police_station':
      return providers.places.getNearbyPlaces({
        location: coords,
        radiusMeters: 3000,
        category: 'police',
      });
    case 'find_embassy':
      return providers.places.getNearbyPlaces({
        location: coords,
        radiusMeters: 10000,
        category: 'embassy',
      });
    case 'find_coworking_space':
      return providers.places.getNearbyPlaces({
        location: coords,
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
        notes: 'Added via AI tool (mock)',
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
    results.push({ name, result: await runTool(name, request) });
  }

  return results;
}

export function summarizeToolResults(results: ToolResult[]): string {
  if (results.length === 0) {
    return 'No tool data was available for this request.';
  }

  return results
    .map((entry) => {
      const payload = entry.result;
      if (Array.isArray(payload)) {
        return `• ${entry.name}: ${payload.length} result(s) from provider/tools`;
      }
      if (payload && typeof payload === 'object') {
        return `• ${entry.name}: data returned from provider/tools`;
      }
      return `• ${entry.name}: ${String(payload)}`;
    })
    .join('\n');
}
