import { providers } from '@/providers/registry';

describe('provider registry', () => {
  it('exposes all required providers', () => {
    expect(providers.places.name).toBeTruthy();
    expect(providers.transport.name).toBeTruthy();
    expect(providers.hotels.name).toBeTruthy();
    expect(providers.weather.name).toBeTruthy();
    expect(providers.currency.name).toBeTruthy();
    expect(providers.esim.name).toBeTruthy();
    expect(providers.ai.name).toBeTruthy();
    expect(providers.maps.name).toBeTruthy();
    expect(typeof providers.usingMocks).toBe('boolean');
  });
});
