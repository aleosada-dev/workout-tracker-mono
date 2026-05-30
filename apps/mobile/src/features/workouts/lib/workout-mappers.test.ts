import { formatSetTarget } from '@/features/workouts/lib/workout-mappers';

describe('formatSetTarget', () => {
  test('returns an empty string when either bound is null', () => {
    expect(formatSetTarget(null, 12)).toBe('');
    expect(formatSetTarget(8, null)).toBe('');
    expect(formatSetTarget(null, null)).toBe('');
  });

  test('returns a single number when min and max are equal', () => {
    expect(formatSetTarget(10, 10)).toBe('10');
  });

  test('returns a range when min and max differ', () => {
    expect(formatSetTarget(8, 12)).toBe('8-12');
  });
});
