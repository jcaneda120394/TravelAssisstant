import {
  getCountryThemeCssVars,
  getDestinationTravelGradient,
  resolveDestinationThemeId,
} from '@/utils/destination-theme';

describe('destination theme', () => {
  it('maps Japan / Tokyo to japan theme', () => {
    expect(resolveDestinationThemeId('Tokyo, Japan')).toBe('japan');
    expect(resolveDestinationThemeId('Japan')).toBe('japan');
  });

  it('maps Philippines cities to philippines theme', () => {
    expect(resolveDestinationThemeId('Malolos, Bulacan, Philippines')).toBe('philippines');
    expect(resolveDestinationThemeId('Manila')).toBe('philippines');
  });

  it('returns distinct gradients for Japan vs Philippines', () => {
    const jp = getDestinationTravelGradient('dark', 'Tokyo, Japan');
    const ph = getDestinationTravelGradient('dark', 'Philippines');
    const fallback = getDestinationTravelGradient('dark', null);
    expect(jp[0]).not.toBe(ph[0]);
    expect(jp).not.toEqual(fallback);
  });

  it('falls back to default for unknown places', () => {
    expect(resolveDestinationThemeId('Atlantis')).toBe('default');
  });

  it('uses a darker accent-soft fill in dark mode for readable text', () => {
    const light = getCountryThemeCssVars('light', 'Seoul, South Korea');
    const dark = getCountryThemeCssVars('dark', 'Seoul, South Korea');
    expect(light['--color-accent-soft']).not.toBe(dark['--color-accent-soft']);
    expect(dark['--color-accent-soft']!.toLowerCase()).not.toBe('#fce8ee');
    // Dark soft should be a dark hex (leading channel low-ish), not a pastel.
    const hex = dark['--color-accent-soft']!.replace('#', '');
    const r = Number.parseInt(hex.slice(0, 2), 16);
    expect(r).toBeLessThan(120);
  });
});
