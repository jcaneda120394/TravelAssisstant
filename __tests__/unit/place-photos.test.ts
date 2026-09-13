import { scorePhotoRelevance } from '@/services/places/place-photos.service';

describe('place photo search naming', () => {
  it('strips bilingual parentheses for search', () => {
    const raw = 'チームラボプラネッツ (teamLab Planets)';
    const paren = raw.match(/\(([^)]+)\)\s*$/);
    const english = paren?.[1] && /[A-Za-z]/.test(paren[1]) ? paren[1].trim() : raw;
    expect(english).toBe('teamLab Planets');
  });
});

describe('scorePhotoRelevance', () => {
  it('rejects logos, highways, and unrelated landmarks', () => {
    expect(scorePhotoRelevance("Max's Restaurant Sorsogon", 'SLEX logo')).toBe(0);
    expect(scorePhotoRelevance('Jollibee Sorsogon City', 'Mount Mayon')).toBe(0);
    expect(scorePhotoRelevance('cafe rosita', 'Sesame Place entrance')).toBe(0);
    expect(scorePhotoRelevance('Gubat Public Market Eats', 'Mayon Volcano aerial')).toBe(0);
  });

  it('accepts restaurant and landmark titles', () => {
    expect(
      scorePhotoRelevance("Max's Restaurant", "Max's Restaurant franchise storefront"),
    ).toBeGreaterThanOrEqual(0.34);
    expect(
      scorePhotoRelevance('Jollibee Sorsogon City', 'Jollibee restaurant exterior'),
    ).toBeGreaterThanOrEqual(0.34);
    expect(
      scorePhotoRelevance('Barcelona Ruins Church', 'Barcelona Ruins Church Sorsogon'),
    ).toBeGreaterThanOrEqual(0.34);
  });

  it('rejects theme-park photos for unrelated venues but keeps them for parks', () => {
    expect(scorePhotoRelevance('Cafe Rosita', 'Hong Kong Disneyland castle')).toBe(0);
    expect(
      scorePhotoRelevance('Hong Kong Disneyland', 'Hong Kong Disneyland Castle'),
    ).toBeGreaterThanOrEqual(0.34);
  });

  it('keeps Paguriran photos even when Mayon appears in the title', () => {
    expect(
      scorePhotoRelevance(
        'Paguriran Island / Rock Formation',
        'Magnificent View of Mayon at Paguriran Island, Bacon, Sorsogon',
      ),
    ).toBeGreaterThanOrEqual(0.34);
  });

  it('accepts Victoria Peak and Hong Kong Disneyland', () => {
    expect(
      scorePhotoRelevance('Victoria Peak', 'The Victoria Peak, Hong Kong'),
    ).toBeGreaterThanOrEqual(0.34);
    expect(
      scorePhotoRelevance('Hong Kong Disneyland', 'Hong Kong Disneyland Castle'),
    ).toBeGreaterThanOrEqual(0.34);
  });

  it('does not accept a city-only match', () => {
    expect(scorePhotoRelevance("Max's Restaurant Sorsogon", 'Sorsogon City Hall')).toBe(0);
  });
});
