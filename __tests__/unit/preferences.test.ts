import { labelize } from '@/constants/preferences';

describe('labelize', () => {
  it('formats snake case labels', () => {
    expect(labelize('digital_nomad')).toBe('Digital Nomad');
    expect(labelize('mid_range')).toBe('Mid Range');
  });
});
