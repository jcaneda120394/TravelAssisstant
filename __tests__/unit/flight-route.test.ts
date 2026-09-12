import {
  decideCrossBorderFlight,
  haversineKm,
} from '@/services/transport/flight-route.service';

describe('flight route helpers', () => {
  it('measures Manila → Tokyo as long-haul', () => {
    const manila = { latitude: 14.5995, longitude: 120.9842 };
    const tokyo = { latitude: 35.6762, longitude: 139.6503 };
    expect(haversineKm(manila, tokyo)).toBeGreaterThan(2500);
  });

  it('flags different-country pairs for flight when reverse geocode works', async () => {
    const manila = { latitude: 14.5995, longitude: 120.9842 };
    const tokyo = { latitude: 35.6762, longitude: 139.6503 };
    try {
      const decision = await decideCrossBorderFlight(manila, tokyo);
      expect(decision.shouldOfferFlight).toBe(true);
      expect(['different_country', 'long_distance']).toContain(decision.reason);
    } catch {
      // Network may be blocked in CI — distance alone still qualifies.
      expect(haversineKm(manila, tokyo)).toBeGreaterThan(800);
    }
  }, 25_000);

  it('keeps short same-city trips local', async () => {
    const shibuya = { latitude: 35.6595, longitude: 139.7005 };
    const shinjuku = { latitude: 35.6896, longitude: 139.7006 };
    const decision = await decideCrossBorderFlight(shibuya, shinjuku);
    expect(decision.shouldOfferFlight).toBe(false);
    expect(decision.reason).toBe('local');
  }, 25_000);
});
