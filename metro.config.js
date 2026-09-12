const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Expo's default platforms list omits `web`; without it, `.web.tsx` siblings are
// easy to miss for extensionless imports (e.g. Leaflet map stub winning on web).
config.resolver.platforms = Array.from(
  new Set([...(config.resolver.platforms ?? []), 'native', 'web']),
);

module.exports = withNativeWind(config, { input: './global.css' });
