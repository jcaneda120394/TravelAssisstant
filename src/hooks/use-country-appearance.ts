import { useMemo } from 'react';

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
  const followCountryTheme = useThemeStore((state) => state.followCountryTheme);
  const country = useLocationStore((state) => state.country);
  const city = useLocationStore((state) => state.city);
  const label = useLocationStore((state) => state.label);

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
    /** Country themes are available on native and web. */
    countryThemesSupported: true,
    locationLabel: label || [city, country].filter(Boolean).join(', ') || null,
  };
}
