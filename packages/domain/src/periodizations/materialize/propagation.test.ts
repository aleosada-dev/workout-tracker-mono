import { describe, expect, test } from 'bun:test';
import { type Propagation, propagationMatches } from './propagation';

describe('propagationMatches', () => {
  test('matches cycles from cycleStart to cycleEnd inclusive when cycleEvery=1', () => {
    const p: Propagation = { cycleStart: 2, cycleEnd: 4, cycleEvery: 1 };
    expect([1, 2, 3, 4, 5].map((c) => propagationMatches(c, p))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });

  test('applies step when cycleEvery > 1', () => {
    const p: Propagation = { cycleStart: 1, cycleEnd: 7, cycleEvery: 2 };
    expect([1, 2, 3, 4, 5, 6, 7].map((c) => propagationMatches(c, p))).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
  });

  test('cycleEnd=null means unbounded', () => {
    const p: Propagation = { cycleStart: 3, cycleEnd: null, cycleEvery: 1 };
    expect([2, 3, 99].map((c) => propagationMatches(c, p))).toEqual([false, true, true]);
  });

  test('returns false when cycleEvery < 1 instead of throwing', () => {
    expect(propagationMatches(1, { cycleStart: 1, cycleEnd: null, cycleEvery: 0 })).toBe(false);
  });
});
