import Constants from 'expo-constants';
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
    .default('false')
    .transform((value) => value !== 'false'),
  EXPO_PUBLIC_POSTHOG_KEY: z.string().optional().default(''),
  EXPO_PUBLIC_POSTHOG_HOST: z.string().optional().default(''),
  EXPO_PUBLIC_SENTRY_DSN: z.string().optional().default(''),
});

type Extra = {
  appEnv?: string;
  appName?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  useMockProviders?: string;
  posthogKey?: string;
  posthogHost?: string;
  sentryDsn?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function pick(envValue: string | undefined, extraValue: string | undefined): string | undefined {
  const fromEnv = envValue?.trim();
  if (fromEnv) return fromEnv;
  const fromExtra = extraValue?.trim();
  if (fromExtra) return fromExtra;
  return undefined;
}

const parsed = envSchema.safeParse({
  EXPO_PUBLIC_APP_ENV: pick(process.env.EXPO_PUBLIC_APP_ENV, extra.appEnv),
  EXPO_PUBLIC_APP_NAME: pick(process.env.EXPO_PUBLIC_APP_NAME, extra.appName),
  EXPO_PUBLIC_SUPABASE_URL: pick(process.env.EXPO_PUBLIC_SUPABASE_URL, extra.supabaseUrl),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: pick(
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    extra.supabaseAnonKey,
  ),
  EXPO_PUBLIC_USE_MOCK_PROVIDERS: pick(
    process.env.EXPO_PUBLIC_USE_MOCK_PROVIDERS,
    extra.useMockProviders,
  ),
  EXPO_PUBLIC_POSTHOG_KEY: pick(process.env.EXPO_PUBLIC_POSTHOG_KEY, extra.posthogKey),
  EXPO_PUBLIC_POSTHOG_HOST: pick(process.env.EXPO_PUBLIC_POSTHOG_HOST, extra.posthogHost),
  EXPO_PUBLIC_SENTRY_DSN: pick(process.env.EXPO_PUBLIC_SENTRY_DSN, extra.sentryDsn),
});

if (!parsed.success) {
  console.warn('[env] Invalid environment configuration', parsed.error.flatten());
}

const data = parsed.success
  ? parsed.data
  : envSchema.parse({
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_APP_NAME: 'TravelAssistant',
      EXPO_PUBLIC_USE_MOCK_PROVIDERS: 'false',
    });

const isSupabaseConfigured = Boolean(
  data.EXPO_PUBLIC_SUPABASE_URL && data.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

/**
 * Production builds must never fall back to passwordless local demo auth.
 * Fail closed when Supabase public config is missing.
 */
if (data.EXPO_PUBLIC_APP_ENV === 'production' && !isSupabaseConfigured) {
  throw new Error(
    'Production misconfiguration: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required.',
  );
}

export const env = {
  appEnv: data.EXPO_PUBLIC_APP_ENV,
  appName: data.EXPO_PUBLIC_APP_NAME,
  supabaseUrl: data.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: data.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  useMockProviders: data.EXPO_PUBLIC_USE_MOCK_PROVIDERS,
  posthogKey: data.EXPO_PUBLIC_POSTHOG_KEY,
  posthogHost: data.EXPO_PUBLIC_POSTHOG_HOST,
  sentryDsn: data.EXPO_PUBLIC_SENTRY_DSN,
  isSupabaseConfigured,
  isProduction: data.EXPO_PUBLIC_APP_ENV === 'production',
} as const;

export type AppEnv = typeof env;
