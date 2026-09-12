import { env } from '@/config/env';
import { MockAIProvider, type AIProvider } from '@/providers/ai/ai.provider';
import { MockCurrencyProvider, type CurrencyProvider } from '@/providers/currency/currency.provider';
import { MockEsimProvider, type EsimProvider } from '@/providers/esim/esim.provider';
import { MockHotelProvider } from '@/providers/hotels/mock-hotel.provider';
import type { HotelProvider } from '@/providers/hotels/hotel.provider';
import { MockMapsProvider } from '@/providers/maps/mock-maps.provider';
import type { MapsProvider } from '@/providers/maps/maps.provider';
import { MockPlacesProvider } from '@/providers/places/mock-places.provider';
import type { PlacesProvider } from '@/providers/places/places.provider';
import { MockTransportProvider } from '@/providers/transport/mock-transport.provider';
import type { TransportProvider } from '@/providers/transport/transport.provider';
import { MockWeatherProvider } from '@/providers/weather/mock-weather.provider';
import type { WeatherProvider } from '@/providers/weather/weather.provider';

export type ProviderRegistry = {
  places: PlacesProvider;
  transport: TransportProvider;
  hotels: HotelProvider;
  weather: WeatherProvider;
  currency: CurrencyProvider;
  esim: EsimProvider;
  ai: AIProvider;
  maps: MapsProvider;
  usingMocks: boolean;
};

function createMockRegistry(): ProviderRegistry {
  return {
    places: new MockPlacesProvider(),
    transport: new MockTransportProvider(),
    hotels: new MockHotelProvider(),
    weather: new MockWeatherProvider(),
    currency: new MockCurrencyProvider(),
    esim: new MockEsimProvider(),
    ai: new MockAIProvider(),
    maps: new MockMapsProvider(),
    usingMocks: true,
  };
}

export function createProviderRegistry(): ProviderRegistry {
  if (env.useMockProviders) {
    return createMockRegistry();
  }

  console.warn('[providers] Live providers not configured — using mocks.');
  return createMockRegistry();
}

export const providers = createProviderRegistry();
