import { formatDistanceMeters, formatDuration } from '@/utils/format';

describe('format utils', () => {
  it('formats meters and duration', () => {
    expect(formatDistanceMeters(450)).toBe('450 m');
    expect(formatDistanceMeters(1500)).toBe('1.5 km');
    expect(formatDuration(90)).toBe('2 min');
    expect(formatDuration(3720)).toBe('1 hr 2 min');
  });
});
