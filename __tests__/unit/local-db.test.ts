import { createId } from '@/lib/storage/local-db';

describe('local db helpers', () => {
  it('creates prefixed ids', () => {
    expect(createId('trip').startsWith('trip_')).toBe(true);
  });
});
