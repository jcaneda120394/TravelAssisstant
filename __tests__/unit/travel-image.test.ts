import {
  buildImageQueryLadder,
  buildImageSearchQuery,
  buildPlaceImageCacheKey,
  parseCityCountryFromAddress,
} from '@/lib/images/image-query-builder';
import { isAcceptableTravelImage, pickBestCandidate } from '@/lib/images/image-validate';
import type { TravelImageCandidate } from '@/lib/images/types';

describe('buildImageSearchQuery', () => {
  it('builds rich travel queries', () => {
    expect(
      buildImageSearchQuery({
        name: 'Shibuya Crossing',
        city: 'Tokyo',
        country: 'Japan',
        type: 'attraction',
      }),
    ).toContain('Shibuya Crossing Tokyo Japan');
  });

  it('adds food keywords for restaurants', () => {
    const q = buildImageSearchQuery({
      name: 'Sushi Dai',
      city: 'Tokyo',
      country: 'Japan',
      type: 'restaurant',
    });
    expect(q.toLowerCase()).toMatch(/food|restaurant/);
  });
});

describe('buildImageQueryLadder', () => {
  it('simplifies from exact to city travel', () => {
    const ladder = buildImageQueryLadder({
      name: 'Arashiyama Bamboo Grove',
      city: 'Kyoto',
      country: 'Japan',
      type: 'attraction',
    });
    expect(ladder[0]).toMatch(/Arashiyama/);
    expect(ladder.some((q) => /Kyoto Japan/i.test(q))).toBe(true);
  });
});

describe('buildPlaceImageCacheKey', () => {
  it('slugifies place context', () => {
    expect(
      buildPlaceImageCacheKey({
        name: 'Shibuya Crossing',
        city: 'Tokyo',
        country: 'Japan',
        type: 'attraction',
      }),
    ).toBe('shibuya-crossing-tokyo-japan-attraction');
  });
});

describe('parseCityCountryFromAddress', () => {
  it('parses trailing country', () => {
    expect(parseCityCountryFromAddress('Sa Pa, Vietnam')).toEqual({
      city: 'Sa Pa',
      country: 'Vietnam',
    });
  });
});

describe('image validation', () => {
  it('rejects svg and tiny images', () => {
    const bad: TravelImageCandidate = {
      id: 'x',
      url: 'https://example.com/logo.svg',
      provider: 'openverse',
      alt: 'logo',
      searchQuery: 'test',
      width: 100,
      height: 100,
    };
    expect(isAcceptableTravelImage(bad)).toBe(false);
  });

  it('prefers landscape candidates and respects exclusions', () => {
    const a: TravelImageCandidate = {
      id: '1',
      url: 'https://images.example.com/a.jpg',
      provider: 'pexels',
      alt: 'Shibuya Crossing Tokyo',
      searchQuery: 'Shibuya Crossing Tokyo',
      width: 1600,
      height: 900,
    };
    const b: TravelImageCandidate = {
      id: '2',
      url: 'https://images.example.com/b.jpg',
      provider: 'unsplash',
      alt: 'Tokyo night',
      searchQuery: 'Tokyo',
      width: 800,
      height: 1200,
    };
    const best = pickBestCandidate([a, b], 'Shibuya Crossing Tokyo Japan', [
      'https://images.example.com/a.jpg',
    ]);
    expect(best?.id).toBe('2');
  });
});
