import { describe, expect, test } from 'bun:test';
import { EXERCISE_MEASUREMENT_TYPES } from './models';

describe('EXERCISE_MEASUREMENT_TYPES', () => {
  test('is exactly the four exercise-module measurement types', () => {
    expect([...EXERCISE_MEASUREMENT_TYPES]).toEqual([
      'weight_reps',
      'reps',
      'duration',
      'distance',
    ]);
  });

  test('does not include the composite workout-set types', () => {
    expect(EXERCISE_MEASUREMENT_TYPES).not.toContain('duration_reps');
    expect(EXERCISE_MEASUREMENT_TYPES).not.toContain('weight_duration');
    expect(EXERCISE_MEASUREMENT_TYPES).not.toContain('weight_reps_duration');
  });
});
