import { useColorScheme as useSystemColorScheme } from 'react-native';

import type { ColorSchemeName } from '@/config/theme';
import { useThemeStore } from '@/stores/theme-store';

export function useAppColorScheme(): ColorSchemeName {
  const system = useSystemColorScheme();
  const preference = useThemeStore((state) => state.preference);

  if (preference === 'system') {
    return system === 'dark' ? 'dark' : 'light';
  }

  return preference;
}
