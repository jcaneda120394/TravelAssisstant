export const theme = {
  light: {
    background: '#F7FAF9',
    surface: '#FFFFFF',
    text: '#10201E',
    textMuted: '#5B6F6C',
    border: '#D7E5E2',
    primary: '#0B726A',
    primarySoft: '#E8F6F5',
    accent: '#D99A12',
    danger: '#C23B3B',
    success: '#1F7A4C',
    tabIconDefault: '#7A908C',
    tabIconSelected: '#0B726A',
  },
  dark: {
    background: '#0C1413',
    surface: '#15201E',
    text: '#E8F2F0',
    textMuted: '#9BB0AC',
    border: '#243331',
    primary: '#2FA89E',
    primarySoft: '#0A4743',
    accent: '#F0B429',
    danger: '#F07171',
    success: '#4ADE80',
    tabIconDefault: '#7A908C',
    tabIconSelected: '#2FA89E',
  },
} as const;

export type ThemeColors = (typeof theme)['light'];
export type ColorSchemeName = keyof typeof theme;
