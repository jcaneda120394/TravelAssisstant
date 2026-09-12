import { useMemo } from 'react';
import { Platform } from 'react-native';

import type { ThemeColors } from '@/config/theme';
import { theme as baseTheme } from '@/config/theme';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useLocationStore } from '@/stores/location-store';
import { useThemeStore } from '@/stores/theme-store';
import {
  getCountryTheme,
  getCountryThemeColors,
  getCountryThemeCssVars,
  type CountryThemeDefinition,
} from '@/utils/destination-theme';

export function useCountryAppearance() {
  const scheme = useAppColorScheme();
  const followCountryThemePref = useThemeStore((state) => state.followCountryTheme);
  const country = useLocationStore((state) => state.country);
  const city = useLocationStore((state) => state.city);
  const label = useLocationStore((state) => state.label);

  // Web stays on the casual (default) palette — light/dark only, no country themes.
  const followCountryTheme = Platform.OS === 'web' ? false : followCountryThemePref;

  const locationHint = country || label || city;
  const cityHint = city || label;

  const countryTheme: CountryThemeDefinition = useMemo(() => {
    if (!followCountryTheme) {
      return getCountryTheme(null);
    }
    return getCountryTheme(locationHint, cityHint);
  }, [followCountryTheme, locationHint, cityHint]);

  const colors: ThemeColors = useMemo(() => {
    if (!followCountryTheme) {
      return baseTheme[scheme];
    }
    return getCountryThemeColors(scheme, locationHint, cityHint);
  }, [followCountryTheme, scheme, locationHint, cityHint]);

  const cssVars = useMemo(() => {
    if (!followCountryTheme) {
      return getCountryThemeCssVars(scheme, null);
    }
    return getCountryThemeCssVars(scheme, locationHint, cityHint);
  }, [followCountryTheme, scheme, locationHint, cityHint]);

  return {
    scheme,
    colors,
    cssVars,
    countryTheme,
    followCountryTheme,
    /** True when country themes are available (native only). */
    countryThemesSupported: Platform.OS !== 'web',
    locationLabel: label || [city, country].filter(Boolean).join(', ') || null,
  };
}
