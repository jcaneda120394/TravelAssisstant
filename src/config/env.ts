import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_APP_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  EXPO_PUBLIC_APP_NAME: z.string().default('TravelAssistant'),
  EXPO_PUBLIC_SUPABASE_URL: z.string().optional().default(''),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(''),
  EXPO_PUBLIC_USE_MOCK_PROVIDERS: z
    .string()
    .optional()
    .default('true')
    .transform((value) => value !== 'false'),
  EXPO_PUBLIC_POSTHOG_KEY: z.string().optional().default(''),
  EXPO_PUBLIC_POSTHOG_HOST: z.string().optional().default(''),
  EXPO_PUBLIC_SENTRY_DSN: z.string().optional().default(''),
});

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_USE_MOCK_PROVIDERS: process.env.EXPO_PUBLIC_USE_MOCK_PROVIDERS,
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
  EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
});

if (!parsed.success) {
  console.warn('[env] Invalid environment configuration', parsed.error.flatten());
}

const data = parsed.success
  ? parsed.data
  : envSchema.parse({
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_APP_NAME: 'TravelAssistant',
      EXPO_PUBLIC_USE_MOCK_PROVIDERS: 'true',
    });

export const env = {
  appEnv: data.EXPO_PUBLIC_APP_ENV,
  appName: data.EXPO_PUBLIC_APP_NAME,
  supabaseUrl: data.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: data.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  useMockProviders: data.EXPO_PUBLIC_USE_MOCK_PROVIDERS,
  posthogKey: data.EXPO_PUBLIC_POSTHOG_KEY,
  posthogHost: data.EXPO_PUBLIC_POSTHOG_HOST,
  sentryDsn: data.EXPO_PUBLIC_SENTRY_DSN,
  isSupabaseConfigured: Boolean(
    data.EXPO_PUBLIC_SUPABASE_URL && data.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
} as const;

export type AppEnv = typeof env;
