import { LOCAL_DESTINATIONS } from '@/services/geo/geocode.service';

function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchLocal(query: string) {
  const q = normalizeQuery(query);
  const tokens = q.split(' ').filter(Boolean);
  const compact = (value: string) => normalizeQuery(value).replace(/\s+/g, '');
  return LOCAL_DESTINATIONS.filter((item) => {
    const hay = normalizeQuery(`${item.shortName} ${item.label}`);
    const hayCompact = compact(`${item.shortName} ${item.label}`);
    return tokens.every((token) => hay.includes(token) || hayCompact.includes(compact(token)));
  });
}

describe('worldwide local destination matching', () => {
  it('finds Sa Pa when typed as Sapa Vietnam', () => {
    const hits = searchLocal('Sapa Vietnam');
    expect(hits.some((h) => /sa\s*pa/i.test(h.shortName) || /sapa/i.test(h.label))).toBe(true);
  });

  it('finds Hanoi and Ho Chi Minh City', () => {
    expect(searchLocal('Hanoi').length).toBeGreaterThan(0);
    expect(searchLocal('Ho Chi Minh').length).toBeGreaterThan(0);
  });

  it('finds Hong Kong and Tokyo', () => {
    expect(searchLocal('Hong Kong').some((h) => /hong kong/i.test(h.label))).toBe(true);
    expect(searchLocal('Tokyo').some((h) => /tokyo/i.test(h.label))).toBe(true);
  });
});
