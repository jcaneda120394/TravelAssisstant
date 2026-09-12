import { providers } from '@/providers/registry';

describe('provider registry', () => {
  it('resolves mock providers in phase 1', () => {
    expect(providers.usingMocks).toBe(true);
    expect(providers.places.name).toContain('mock');
    expect(providers.transport.name).toContain('mock');
    expect(providers.ai.name).toContain('mock');
  });
});
