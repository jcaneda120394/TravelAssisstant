import {
  buildImageQueryLadder,
  buildImageSearchQuery,
  buildPlaceImageCacheKey,
  parseCityCountryFromAddress,
} from '@/lib/images/image-query-builder';
import {
  isAcceptableTravelImage,
  isRelevantToPlace,
  pickBestCandidate,
} from '@/lib/images/image-validate';
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

  it('adds cafe keywords for cafes', () => {
    const q = buildImageSearchQuery({
      name: 'Vietnam Speciality Coffee',
      city: 'Hanoi',
      country: 'Vietnam',
      type: 'cafe',
    });
    expect(q.toLowerCase()).toMatch(/cafe|coffee/);
  });
});

describe('buildImageQueryLadder', () => {
  it('simplifies from exact to city travel for attractions', () => {
    const ladder = buildImageQueryLadder({
      name: 'Arashiyama Bamboo Grove',
      city: 'Kyoto',
      country: 'Japan',
      type: 'attraction',
    });
    expect(ladder[0]).toMatch(/Arashiyama/);
    expect(ladder.some((q) => /Kyoto/i.test(q))).toBe(true);
  });

  it('never uses country-only queries for cafes', () => {
    const ladder = buildImageQueryLadder({
      name: 'Vietnam Speciality Coffee',
      city: 'Hanoi',
      country: 'Vietnam',
      type: 'cafe',
    });
    expect(ladder.every((q) => !/^vietnam travel$/i.test(q))).toBe(true);
    expect(ladder.some((q) => /hanoi/i.test(q) && /cafe|coffee/i.test(q))).toBe(true);
  });
});

describe('buildPlaceImageCacheKey', () => {
  it('slugifies place context with version', () => {
    expect(
      buildPlaceImageCacheKey({
        name: 'Shibuya Crossing',
        city: 'Tokyo',
        country: 'Japan',
        type: 'attraction',
      }),
    ).toBe('v2-shibuya-crossing-tokyo-japan-attraction');
  });
});

describe('parseCityCountryFromAddress', () => {
  it('prefers city over street segment', () => {
    expect(
      parseCityCountryFromAddress('Phố Hồ Hoàn Kiếm, Hanoi, Thành phố Hà Nội, Vietnam'),
    ).toEqual({
      city: 'Hanoi',
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

  it('rejects vietnam memorial photos for cafes', () => {
    const memorial: TravelImageCandidate = {
      id: 'm',
      url: 'https://images.example.com/memorial.jpg',
      provider: 'openverse',
      alt: 'The Vietnam Traveling Wall Memorial',
      searchQuery: 'Vietnam travel',
      width: 1600,
      height: 900,
    };
    expect(isRelevantToPlace(memorial, 'Vietnam Speciality Coffee', 'cafe')).toBe(false);
    expect(
      pickBestCandidate([memorial], 'Vietnam Speciality Coffee Hanoi cafe', [], [], 'Vietnam Speciality Coffee', 'cafe'),
    ).toBeNull();
  });

  it('accepts cafe coffee photos as atmosphere for cafes', () => {
    const cafe: TravelImageCandidate = {
      id: 'c',
      url: 'https://images.example.com/cafe.jpg',
      provider: 'pexels',
      alt: 'Cozy Hanoi cafe coffee shop interior',
      searchQuery: 'Hanoi cafe coffee',
      width: 1600,
      height: 900,
    };
    expect(isRelevantToPlace(cafe, 'Cafe Muối', 'cafe')).toBe(true);
  });

  it('prefers place-name matches and respects exclusions', () => {
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
      alt: 'Tokyo cafe coffee shop',
      searchQuery: 'Tokyo cafe',
      width: 800,
      height: 1200,
    };
    const best = pickBestCandidate(
      [a, b],
      'Shibuya Crossing Tokyo Japan',
      ['https://images.example.com/a.jpg'],
      [],
      'Shibuya Crossing',
      'attraction',
    );
    expect(best).toBeNull();
  });
});
