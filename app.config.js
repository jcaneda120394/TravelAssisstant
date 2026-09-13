const fs = require('fs');
const path = require('path');

const appJson = require('./app.json');

function loadEnvFile(filePath, { override = false } = {}) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (override || process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

// Prefer committed .env then local overrides (without wiping already-set CI/Vercel vars
 // unless .env.local explicitly sets them).
loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '.env.local'), { override: true });

/**
 * Mirror EXPO_PUBLIC_* into `extra` so the client can fall back when Metro
 * does not inline process.env (seen on some web SSR / static export paths).
 */
module.exports = () => {
  const expo = appJson.expo ?? {};
  const pkg = require('./package.json');
  const version =
    process.env.EXPO_PUBLIC_APP_VERSION?.trim() ||
    pkg.version ||
    expo.version ||
    '0.0.0';
  const buildId = (
    process.env.EXPO_PUBLIC_APP_BUILD ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    ''
  )
    .trim()
    .slice(0, 7);

  return {
    ...expo,
    version,
    extra: {
      ...(expo.extra ?? {}),
      appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
      appName: process.env.EXPO_PUBLIC_APP_NAME ?? 'TravelAssistant',
      appVersion: version,
      appBuild: buildId,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      useMockProviders: process.env.EXPO_PUBLIC_USE_MOCK_PROVIDERS ?? 'false',
      posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
      posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? '',
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      router: expo.extra?.router ?? {},
      eas: expo.extra?.eas ?? {},
    },
  };
};
