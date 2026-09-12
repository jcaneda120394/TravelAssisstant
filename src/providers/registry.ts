import { env } from '@/config/env';
import { MockAIProvider } from '@/providers/ai/ai.provider';
import { LiveAIProvider } from '@/providers/ai/live-ai.provider';
import { FrankfurterCurrencyProvider } from '@/providers/currency/frankfurter.provider';
import { MockEsimProvider } from '@/providers/esim/esim.provider';
import { CatalogEsimProvider } from '@/providers/esim/catalog-esim.provider';
import { MockHotelProvider } from '@/providers/hotels/mock-hotel.provider';
import { OsmHotelProvider } from '@/providers/hotels/osm-hotel.provider';
import type { HotelProvider } from '@/providers/hotels/hotel.provider';
import { MockMapsProvider } from '@/providers/maps/mock-maps.provider';
import { NativeMapsProvider } from '@/providers/maps/native-maps.provider';
import type { MapsProvider } from '@/providers/maps/maps.provider';
import { MockPlacesProvider } from '@/providers/places/mock-places.provider';
import { OsmPlacesProvider } from '@/providers/places/osm-places.provider';
import type { PlacesProvider } from '@/providers/places/places.provider';
import { MockTransportProvider } from '@/providers/transport/mock-transport.provider';
import { OsrmTransportProvider } from '@/providers/transport/osrm-transport.provider';
import type { TransportProvider } from '@/providers/transport/transport.provider';
import { MockWeatherProvider } from '@/providers/weather/mock-weather.provider';
import { OpenMeteoWeatherProvider } from '@/providers/weather/open-meteo.provider';
import type { WeatherProvider } from '@/providers/weather/weather.provider';
import type { AIProvider } from '@/providers/ai/ai.provider';
import type { CurrencyProvider } from '@/providers/currency/currency.provider';
import type { EsimProvider } from '@/providers/esim/esim.provider';

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
    // Always live FX so travelers see updated rates even in demo mode.
    currency: new FrankfurterCurrencyProvider(),
    esim: new MockEsimProvider(),
    ai: new MockAIProvider(),
    maps: new MockMapsProvider(),
    usingMocks: true,
  };
}

function createLiveRegistry(): ProviderRegistry {
  return {
    places: new OsmPlacesProvider(),
    transport: new OsrmTransportProvider(),
    hotels: new OsmHotelProvider(),
    weather: new OpenMeteoWeatherProvider(),
    currency: new FrankfurterCurrencyProvider(),
    esim: new CatalogEsimProvider(),
    ai: new LiveAIProvider(),
    maps: new NativeMapsProvider(),
    usingMocks: false,
  };
}

export function createProviderRegistry(): ProviderRegistry {
  if (env.useMockProviders) {
    return createMockRegistry();
  }
  return createLiveRegistry();
}

export const providers = createProviderRegistry();
