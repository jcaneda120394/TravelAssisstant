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

  it('accepts titles that clearly match the venue', () => {
    expect(
      scorePhotoRelevance("Max's Restaurant", "Max's Restaurant franchise storefront"),
    ).toBeGreaterThanOrEqual(0.5);
    expect(
      scorePhotoRelevance('Jollibee Sorsogon City', 'Jollibee restaurant exterior'),
    ).toBeGreaterThanOrEqual(0.5);
    expect(
      scorePhotoRelevance('Barcelona Ruins Church', 'Barcelona Ruins Church Sorsogon'),
    ).toBeGreaterThanOrEqual(0.5);
  });

  it('does not accept a city-only match', () => {
    expect(scorePhotoRelevance("Max's Restaurant Sorsogon", 'Sorsogon City Hall')).toBe(0);
  });
});
