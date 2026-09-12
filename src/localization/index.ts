export const defaultLocale = 'en';

export const supportedLocales = [
  'en',
  'fil',
  'ja',
  'ko',
  'zh-Hans',
  'zh-Hant',
  'es',
  'fr',
  'de',
] as const;

export type SupportedLocale = (typeof supportedLocales)[number];
