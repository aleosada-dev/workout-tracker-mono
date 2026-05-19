import { describe, expect, it } from 'bun:test';
import { getIssues } from '../test/validation';
import { RepsSet, type RepsSetProps, TimeSet, type TimeSetProps } from './sets';

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

  it('returns 0 for bodyweight (weight = 0)', () => {
    const set = RepsSet.create(validRepsProps({ weight: 0, reps: 10 }));
    expect(set.volume).toBe(0);
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
