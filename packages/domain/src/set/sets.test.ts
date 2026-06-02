import { describe, expect, it } from 'bun:test';
import { getIssues } from '../test/validation';
import {
  computeLinkedLoad,
  getValidSetTypesAt,
  isValidSetSequence,
  measurementDimensions,
  RepsSet,
  type RepsSetProps,
  roundLoad,
  setVolume,
  TimeSet,
  type TimeSetProps,
  type WorkoutSetType,
} from './sets';

function validRepsProps(overrides: Partial<RepsSetProps> = {}): RepsSetProps {
  return {
    order: 1,
    type: 'normal',
    metric: 'kg',
    weight: 100,
    reps: 10,
    repsMin: null,
    repsMax: null,
    ...overrides,
  };
}

function validTimeProps(overrides: Partial<TimeSetProps> = {}): TimeSetProps {
  return {
    order: 1,
    weight: null,
    duration: 30,
    ...overrides,
  };
}

describe('RepsSet.create — validation', () => {
  it('returns a RepsSet when all props are valid', () => {
    const set = RepsSet.create(validRepsProps());
    expect(set).toBeInstanceOf(RepsSet);
    expect(set.kind).toBe('reps');
    expect(set.order).toBe(1);
  });

  it('accepts null for reps, repsMin and repsMax', () => {
    const set = RepsSet.create(validRepsProps({ reps: null, repsMin: null, repsMax: null }));
    expect(set.reps).toBeNull();
  });

  it('accepts null weight and fractional positive weight', () => {
    expect(RepsSet.create(validRepsProps({ weight: null })).weight).toBeNull();
    expect(RepsSet.create(validRepsProps({ weight: 2.5 })).weight).toBe(2.5);
  });

  it('rejects weight = 0', () => {
    const issues = getIssues(() => RepsSet.create(validRepsProps({ weight: 0 })));
    expect(issues).toEqual([{ code: 'validation.positive_number', field: 'weight' }]);
  });

  it('rejects negative weight', () => {
    const issues = getIssues(() => RepsSet.create(validRepsProps({ weight: -5 })));
    expect(issues).toEqual([{ code: 'validation.positive_number', field: 'weight' }]);
  });

  it('rejects non-integer order', () => {
    const issues = getIssues(() => RepsSet.create(validRepsProps({ order: 1.5 })));
    expect(issues).toEqual([{ code: 'validation.non_negative_integer', field: 'order' }]);
  });

  it('rejects negative order', () => {
    const issues = getIssues(() => RepsSet.create(validRepsProps({ order: -1 })));
    expect(issues).toEqual([{ code: 'validation.non_negative_integer', field: 'order' }]);
  });

  it('rejects non-integer reps', () => {
    const issues = getIssues(() => RepsSet.create(validRepsProps({ reps: 5.5 })));
    expect(issues).toEqual([
      { code: 'validation.integer_greater_than', field: 'reps', params: { min: 0 } },
    ]);
  });

  it('rejects negative reps', () => {
    const issues = getIssues(() => RepsSet.create(validRepsProps({ reps: -3 })));
    expect(issues).toEqual([
      { code: 'validation.integer_greater_than', field: 'reps', params: { min: 0 } },
    ]);
  });

  it('rejects reps = 0', () => {
    const issues = getIssues(() => RepsSet.create(validRepsProps({ reps: 0 })));
    expect(issues).toEqual([
      { code: 'validation.integer_greater_than', field: 'reps', params: { min: 0 } },
    ]);
  });

  it('rejects negative repsMin', () => {
    const issues = getIssues(() => RepsSet.create(validRepsProps({ repsMin: -1, repsMax: 10 })));
    expect(issues).toEqual([
      { code: 'validation.integer_greater_than', field: 'repsMin', params: { min: 0 } },
    ]);
  });

  it('rejects non-integer repsMax', () => {
    const issues = getIssues(() => RepsSet.create(validRepsProps({ repsMin: 5, repsMax: 8.2 })));
    expect(issues).toEqual([
      { code: 'validation.integer_greater_than', field: 'repsMax', params: { min: 0 } },
    ]);
  });

  it('rejects repsMax less than repsMin', () => {
    const issues = getIssues(() => RepsSet.create(validRepsProps({ repsMin: 12, repsMax: 8 })));
    expect(issues).toEqual([{ code: 'validation.reps_max_less_than_reps_min', field: 'repsMax' }]);
  });

  it('accepts repsMax equal to repsMin', () => {
    const set = RepsSet.create(validRepsProps({ repsMin: 8, repsMax: 8 }));
    expect(set.repsMin).toBe(8);
    expect(set.repsMax).toBe(8);
  });

  it('rejects when repsMin is set but repsMax is null', () => {
    const issues = getIssues(() => RepsSet.create(validRepsProps({ repsMin: 10, repsMax: null })));
    expect(issues).toEqual([{ code: 'validation.reps_range_incomplete', field: 'repsMax' }]);
  });

  it('rejects when repsMax is set but repsMin is null', () => {
    const issues = getIssues(() => RepsSet.create(validRepsProps({ repsMin: null, repsMax: 5 })));
    expect(issues).toEqual([{ code: 'validation.reps_range_incomplete', field: 'repsMin' }]);
  });

  it('collects all issues into a single ValidationError', () => {
    const issues = getIssues(() =>
      RepsSet.create(validRepsProps({ order: -1, reps: 1.5, repsMin: 12, repsMax: 8 })),
    );
    expect(issues).toEqual([
      { code: 'validation.non_negative_integer', field: 'order' },
      { code: 'validation.integer_greater_than', field: 'reps', params: { min: 0 } },
      { code: 'validation.reps_max_less_than_reps_min', field: 'repsMax' },
    ]);
  });
});

describe('RepsSet.volume', () => {
  it('returns weight * reps', () => {
    const set = RepsSet.create(validRepsProps({ weight: 80, reps: 10 }));
    expect(set.volume).toBe(800);
  });

  it("computes volume regardless of type (warmup filtering is the caller's job)", () => {
    const set = RepsSet.create(validRepsProps({ type: 'warmup', weight: 40, reps: 12 }));
    expect(set.volume).toBe(480);
  });

  it('returns 0 when weight is null', () => {
    const set = RepsSet.create(validRepsProps({ weight: null, reps: 10 }));
    expect(set.volume).toBe(0);
  });

  it('returns 0 when reps is null', () => {
    const set = RepsSet.create(validRepsProps({ weight: 100, reps: null }));
    expect(set.volume).toBe(0);
  });

  it('returns 0 for legacy bodyweight rows (weight = 0)', () => {
    const set = RepsSet.restore(validRepsProps({ weight: 0, reps: 10 }));
    expect(set.volume).toBe(0);
  });
});

describe('RepsSet.restore — legacy data', () => {
  it('accepts weight = 0 from the old system without validating', () => {
    const set = RepsSet.restore(validRepsProps({ weight: 0 }));
    expect(set.weight).toBe(0);
  });
});

describe('TimeSet.create — validation', () => {
  it('returns a TimeSet when props are valid', () => {
    const set = TimeSet.create(validTimeProps());
    expect(set).toBeInstanceOf(TimeSet);
    expect(set.kind).toBe('time');
    expect(set.type).toBe('normal');
    expect(set.duration).toBe(30);
  });

  it('accepts a loaded time-based set', () => {
    const set = TimeSet.create(validTimeProps({ weight: 20, duration: 45 }));
    expect(set.weight).toBe(20);
    expect(set.duration).toBe(45);
  });

  it('rejects weight = 0 but restores legacy zero-weight rows', () => {
    const issues = getIssues(() => TimeSet.create(validTimeProps({ weight: 0 })));
    expect(issues).toEqual([{ code: 'validation.positive_number', field: 'weight' }]);
    expect(TimeSet.restore(validTimeProps({ weight: 0 })).weight).toBe(0);
  });

  it('rejects non-integer duration', () => {
    const issues = getIssues(() => TimeSet.create(validTimeProps({ duration: 30.5 })));
    expect(issues).toEqual([
      { code: 'validation.integer_greater_than', field: 'duration', params: { min: 0 } },
    ]);
  });

  it('rejects negative duration', () => {
    const issues = getIssues(() => TimeSet.create(validTimeProps({ duration: -1 })));
    expect(issues).toEqual([
      { code: 'validation.integer_greater_than', field: 'duration', params: { min: 0 } },
    ]);
  });

  it('rejects duration = 0', () => {
    const issues = getIssues(() => TimeSet.create(validTimeProps({ duration: 0 })));
    expect(issues).toEqual([
      { code: 'validation.integer_greater_than', field: 'duration', params: { min: 0 } },
    ]);
  });

  it('rejects negative order', () => {
    const issues = getIssues(() => TimeSet.create(validTimeProps({ order: -1 })));
    expect(issues).toEqual([{ code: 'validation.non_negative_integer', field: 'order' }]);
  });
});

describe('measurementDimensions', () => {
  it('weight_reps tracks weight and reps', () => {
    expect(measurementDimensions('weight_reps')).toEqual({
      weight: true,
      reps: true,
      duration: false,
    });
  });

  it('reps tracks reps only', () => {
    expect(measurementDimensions('reps')).toEqual({ weight: false, reps: true, duration: false });
  });

  it('duration tracks duration only', () => {
    expect(measurementDimensions('duration')).toEqual({
      weight: false,
      reps: false,
      duration: true,
    });
  });

  it('duration_reps tracks reps and duration', () => {
    expect(measurementDimensions('duration_reps')).toEqual({
      weight: false,
      reps: true,
      duration: true,
    });
  });

  it('weight_duration tracks weight and duration', () => {
    expect(measurementDimensions('weight_duration')).toEqual({
      weight: true,
      reps: false,
      duration: true,
    });
  });

  it('weight_reps_duration tracks all three', () => {
    expect(measurementDimensions('weight_reps_duration')).toEqual({
      weight: true,
      reps: true,
      duration: true,
    });
  });
});

describe('setVolume', () => {
  it('returns weight * reps', () => {
    expect(setVolume({ weight: 80, reps: 10 })).toBe(800);
  });

  it('returns 0 when weight is null', () => {
    expect(setVolume({ weight: null, reps: 10 })).toBe(0);
  });

  it('returns 0 when reps is null', () => {
    expect(setVolume({ weight: 100, reps: null })).toBe(0);
  });

  it('returns 0 when weight is undefined', () => {
    expect(setVolume({ weight: undefined, reps: 10 })).toBe(0);
  });

  it('returns 0 when reps is undefined', () => {
    expect(setVolume({ weight: 100, reps: undefined })).toBe(0);
  });

  it('returns 0 for bodyweight (weight = 0)', () => {
    expect(setVolume({ weight: 0, reps: 10 })).toBe(0);
  });
});

describe('isValidSetSequence', () => {
  const seq = (...types: WorkoutSetType[]) => types.map((type) => ({ type }));

  it('returns true for an empty sequence', () => {
    expect(isValidSetSequence([])).toBe(true);
  });

  it('accepts warmups followed by normals', () => {
    expect(isValidSetSequence(seq('warmup', 'warmup', 'normal', 'normal'))).toBe(true);
  });

  it('rejects a warmup that appears after a non-warmup set', () => {
    expect(isValidSetSequence(seq('normal', 'warmup'))).toBe(false);
  });

  it('accepts a drop preceded by a normal', () => {
    expect(isValidSetSequence(seq('normal', 'drop'))).toBe(true);
  });

  it('accepts consecutive drops preceded by a normal', () => {
    expect(isValidSetSequence(seq('normal', 'drop', 'drop'))).toBe(true);
  });

  it('rejects a drop preceded by a cluster', () => {
    expect(isValidSetSequence(seq('normal', 'cluster', 'drop'))).toBe(false);
  });

  it('rejects a drop as the first set', () => {
    expect(isValidSetSequence(seq('drop', 'normal'))).toBe(false);
  });

  it('accepts a cluster preceded by a normal', () => {
    expect(isValidSetSequence(seq('normal', 'cluster'))).toBe(true);
  });

  it('accepts consecutive clusters preceded by a normal', () => {
    expect(isValidSetSequence(seq('normal', 'cluster', 'cluster'))).toBe(true);
  });

  it('rejects a cluster preceded by a drop', () => {
    expect(isValidSetSequence(seq('normal', 'drop', 'cluster'))).toBe(false);
  });

  it('rejects a cluster as the first set', () => {
    expect(isValidSetSequence(seq('cluster', 'normal'))).toBe(false);
  });
});

describe('getValidSetTypesAt', () => {
  const seq = (...types: WorkoutSetType[]) => types.map((type) => ({ type }));

  it('returns every type for the only position in a single-set sequence (warmup or normal)', () => {
    expect(getValidSetTypesAt(seq('normal'), 0)).toEqual(['warmup', 'normal']);
  });

  it('disallows drop/cluster at the first position', () => {
    expect(getValidSetTypesAt(seq('normal', 'normal'), 0)).toEqual(['warmup', 'normal']);
  });

  it('allows normal, drop and cluster after a normal — but not warmup', () => {
    expect(getValidSetTypesAt(seq('normal', 'normal'), 1)).toEqual(['normal', 'drop', 'cluster']);
  });

  it('rejects cluster at the middle when followed by a drop', () => {
    expect(getValidSetTypesAt(seq('normal', 'normal', 'drop'), 1)).toEqual(['normal', 'drop']);
  });

  it('allows the same type currently at the position', () => {
    expect(getValidSetTypesAt(seq('normal', 'drop'), 1)).toContain('drop');
  });
});

describe('TimeSet.volume', () => {
  it('returns duration * weight for a loaded set', () => {
    const set = TimeSet.create(validTimeProps({ weight: 20, duration: 45 }));
    expect(set.volume).toBe(900);
  });

  it('returns 0 for a bodyweight set (weight is null)', () => {
    const set = TimeSet.create(validTimeProps({ weight: null, duration: 45 }));
    expect(set.volume).toBe(0);
  });
});

describe('roundLoad', () => {
  it('keeps two decimals without rounding in "none" mode', () => {
    expect(roundLoad(78.75, 'none')).toBe(78.75);
    expect(roundLoad(78.756, 'none')).toBe(78.76);
  });

  it('rounds to the nearest 0.5', () => {
    expect(roundLoad(78.75, '0.5')).toBe(79);
    expect(roundLoad(78.24, '0.5')).toBe(78);
  });

  it('rounds to the nearest integer', () => {
    expect(roundLoad(78.75, '1')).toBe(79);
    expect(roundLoad(78.4, '1')).toBe(78);
  });

  it('rounds to the nearest 2.5', () => {
    expect(roundLoad(78.75, '2.5')).toBe(80);
    expect(roundLoad(76.2, '2.5')).toBe(75);
  });
});

describe('computeLinkedLoad', () => {
  it('computes a percentage of the base load', () => {
    expect(computeLinkedLoad(100, 65, 'none')).toBe(65);
    expect(computeLinkedLoad(102.5, 80, 'none')).toBe(82);
  });

  it('applies the rounding mode to the result', () => {
    expect(computeLinkedLoad(87.5, 90, 'none')).toBe(78.75);
    expect(computeLinkedLoad(87.5, 90, '0.5')).toBe(79);
    expect(computeLinkedLoad(87.5, 90, '2.5')).toBe(80);
  });
});
