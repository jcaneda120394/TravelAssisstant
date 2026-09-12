import { formatDuration } from '@/utils/format';
import { MockTransportProvider } from '@/providers/transport/mock-transport.provider';

describe('transport mock provider', () => {
  it('returns comparable routes with tags', async () => {
    const provider = new MockTransportProvider();
    const routes = await provider.getRoutes({
      origin: { latitude: 35.65, longitude: 139.7 },
      destination: { latitude: 35.7, longitude: 139.75 },
    });

    expect(routes.length).toBeGreaterThan(3);
    expect(routes.some((route) => route.comparisonTag === 'recommended')).toBe(true);
    expect(formatDuration(routes[0]!.durationSeconds).length).toBeGreaterThan(0);
  });
});
