export const theme = {
  light: {
    // Near-white travel canvas (less mint wash than legacy #EEF6F4).
    background: '#F7FAF9',
    surface: '#FFFFFF',
    text: '#12201E',
    textMuted: '#5B6F6B',
    border: '#D6E3E0',
    primary: '#0A7C74',
    primarySoft: '#E5F4F2',
    accent: '#FF6B4A',
    accentSoft: '#FFE6DF',
    sky: '#3BA7C9',
    danger: '#C23B3B',
    success: '#1F7A4C',
    tabIconDefault: '#7A908C',
    tabIconSelected: '#0A7C74',
  },
  dark: {
    background: '#071412',
    surface: '#12201E',
    text: '#E8F5F2',
    textMuted: '#9BB5B0',
    border: '#243936',
    primary: '#2FCFC2',
    primarySoft: '#0A3F3B',
    accent: '#FF8A6A',
    accentSoft: '#3A221C',
    sky: '#4EB8D6',
    danger: '#F07171',
    success: '#4ADE80',
    tabIconDefault: '#7A908C',
    tabIconSelected: '#2FCFC2',
  },
} as const;

/** Mutable color tokens so country themes can override the base palette. */
export type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  sky: string;
  danger: string;
  success: string;
  tabIconDefault: string;
  tabIconSelected: string;
};

export type ColorSchemeName = keyof typeof theme;

/** Home / travel hero gradients (ocean → lagoon → warm horizon). */
export const travelGradients = {
  light: ['#064E4A', '#0A7C74', '#1FA4B8', '#FF8A6A'] as const,
  dark: ['#031816', '#0A4743', '#127A88', '#C45C3A'] as const,
};
