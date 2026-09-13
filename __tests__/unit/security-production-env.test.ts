/**
 * Production must fail closed without Supabase public config.
 * We re-require the module after setting env because env.ts evaluates at import time.
 */
describe('production env guard', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('throws when production lacks Supabase URL/anon key', () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_SUPABASE_URL: '',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
    };
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/config/env');
    }).toThrow(/Production misconfiguration/);
  });
});
