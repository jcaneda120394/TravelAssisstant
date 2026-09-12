import {
  formatBilingualPlaceName,
  hasNonLatinScript,
  resolveBilingualPlaceName,
} from '@/utils/place-name';

describe('place-name', () => {
  it('detects non-Latin scripts', () => {
    expect(hasNonLatinScript('東京駅')).toBe(true);
    expect(hasNonLatinScript('Tokyo Station')).toBe(false);
  });

  it('formats original with English translation', () => {
    expect(formatBilingualPlaceName('東京駅', 'Tokyo Station')).toBe('東京駅 (Tokyo Station)');
    expect(formatBilingualPlaceName('Tokyo Station', 'Tokyo Station')).toBe('Tokyo Station');
  });

  it('resolves bilingual names from OSM tags', () => {
    expect(
      resolveBilingualPlaceName({
        primary: '東京駅',
        tags: { name: '東京駅', 'name:en': 'Tokyo Station', 'name:ja': '東京駅' },
      }),
    ).toBe('東京駅 (Tokyo Station)');
  });
});
