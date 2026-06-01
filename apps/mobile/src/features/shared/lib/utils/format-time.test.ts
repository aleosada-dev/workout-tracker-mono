import { formatTime, formatTotalTime } from '@/features/shared/lib/utils/format-time';

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

describe('formatTotalTime', () => {
  test('shows minutes only below an hour', () => {
    expect(formatTotalTime(0)).toBe('0 min');
    expect(formatTotalTime(59)).toBe('0 min');
    expect(formatTotalTime(300)).toBe('5 min');
    expect(formatTotalTime(3599)).toBe('59 min');
  });

  test('shows hours and minutes from an hour up', () => {
    expect(formatTotalTime(3600)).toBe('1 h 0 min');
    expect(formatTotalTime(3900)).toBe('1 h 5 min');
    expect(formatTotalTime(7320)).toBe('2 h 2 min');
  });

  test('clamps negative values to zero', () => {
    expect(formatTotalTime(-10)).toBe('0 min');
  });
});
