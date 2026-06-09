import { describe, expect, test } from 'bun:test';
import { isSupersetGroup, isSupersetMeasurementType } from './superset';

function member(id: string, supersetGroupId: string) {
  return { id, supersetGroupId };
}

describe('isSupersetGroup', () => {
  test('returns false for a single exercise whose group id equals its own id', () => {
    expect(isSupersetGroup([member('ex-1', 'ex-1')])).toBe(false);
  });

  test('returns false for a single exercise even when grouped', () => {
    expect(isSupersetGroup([member('ex-1', 'sg-1')])).toBe(false);
  });

  test('returns true when two or more members share a group id distinct from their own ids', () => {
    expect(isSupersetGroup([member('ex-1', 'sg-1'), member('ex-2', 'sg-1')])).toBe(true);
  });

  test('returns false when any member is its own group', () => {
    expect(isSupersetGroup([member('ex-1', 'ex-1'), member('ex-2', 'ex-1')])).toBe(false);
  });

  test('returns false for an empty group', () => {
    expect(isSupersetGroup([])).toBe(false);
  });
});

describe('isSupersetMeasurementType', () => {
  test('allows rep-based measurement types', () => {
    expect(isSupersetMeasurementType('weight_reps')).toBe(true);
    expect(isSupersetMeasurementType('reps')).toBe(true);
  });

  test('rejects time, distance and mixed measurement types', () => {
    expect(isSupersetMeasurementType('duration')).toBe(false);
    expect(isSupersetMeasurementType('duration_reps')).toBe(false);
    expect(isSupersetMeasurementType('weight_duration')).toBe(false);
    expect(isSupersetMeasurementType('weight_reps_duration')).toBe(false);
    expect(isSupersetMeasurementType('distance')).toBe(false);
  });
});
