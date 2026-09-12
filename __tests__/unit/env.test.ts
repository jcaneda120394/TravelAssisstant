import { env } from '@/config/env';

describe('env config', () => {
  it('exposes app name and mock provider flag', () => {
    expect(env.appName).toBe('TravelAssistant');
    expect(typeof env.useMockProviders).toBe('boolean');
  });
});
