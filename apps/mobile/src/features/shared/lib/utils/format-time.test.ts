import { formatTime } from '@/features/shared/lib/utils/format-time';

describe('formatTime', () => {
  test('formats seconds as MM:SS with zero padding', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(5)).toBe('00:05');
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(83)).toBe('01:23');
    expect(formatTime(600)).toBe('10:00');
  });

  test('clamps negative values to zero', () => {
    expect(formatTime(-10)).toBe('00:00');
  });
});
