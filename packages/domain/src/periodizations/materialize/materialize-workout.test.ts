import { describe, expect, test } from 'bun:test';
import type { WorkoutDetail } from '../../workouts/workout';
import type { WorkoutOverrideNewExercise, WorkoutSetValue } from '../adjustment';
import { materializeWorkout } from './materialize-workout';

function setValue(overrides: Partial<WorkoutSetValue> = {}): WorkoutSetValue {
  return {
    setType: 'normal',
    measurementType: 'weight_reps',
    repsMin: 8,
    repsMax: 12,
    durationSeconds: null,
    loadPercent: null,
    loadPercentOfPrevious: null,
    ...overrides,
  };
}

function newExercise(
  overrides: Partial<WorkoutOverrideNewExercise> = {},
): WorkoutOverrideNewExercise {
  return {
    exerciseType: 'strength',
    supersetGroupId: 'sg-new',
    supersetOrder: 0,
    note: null,
    restSeconds: 60,
    variation: {
      id: 'e2',
      slug: 'squat',
      name: null,
      exercise: { slug: 'squat', name: 'Squat', type: 'musculacao' },
      measurementType: 'weight_reps',
      equipment: { slug: 'barbell', preposition: 'com' },
      muscle: { slug: 'legs' },
      secondaryMuscle: null,
    },
    sets: [setValue({ repsMin: 5, repsMax: 8 })],
    ...overrides,
  };
}

function makeBase(): WorkoutDetail {
  return {
    id: 'w1',
    userId: 'user-1',
    name: 'Workout A',
    description: null,
    folderId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    exercises: [
      {
        id: 'e1',
        exerciseType: 'strength',
        position: 0,
        supersetGroupId: 'sg-1',
        supersetOrder: 0,
        note: null,
        restSeconds: 90,
        variation: {
          id: 'e1',
          slug: 'bench',
          name: null,
          exercise: { slug: 'bench', name: 'Bench Press', type: 'musculacao' },
          measurementType: 'weight_reps',
          equipment: { slug: 'barbell', preposition: 'com' },
          muscle: { slug: 'chest' },
          secondaryMuscle: null,
        },
        sets: [
          {
            id: 's1',
            setOrder: 0,
            setType: 'normal',
            measurementType: 'weight_reps',
            repsMin: 8,
            repsMax: 12,
            durationSeconds: null,
            linkedSetId: null,
            loadPercent: null,
            loadPercentOfPrevious: null,
            roundOrder: 0,
          },
          {
            id: 's2',
            setOrder: 1,
            setType: 'normal',
            measurementType: 'weight_reps',
            repsMin: 8,
            repsMax: 12,
            durationSeconds: null,
            linkedSetId: null,
            loadPercent: null,
            loadPercentOfPrevious: null,
            roundOrder: 1,
          },
        ],
      },
    ],
  };
}

describe('materializeWorkout', () => {
  test('returns the base workout unchanged when no ops are given', () => {
    const base = makeBase();
    expect(materializeWorkout(base, [])).toEqual(base);
  });

  test('applies change_set_value to the addressed set and field', () => {
    const result = materializeWorkout(makeBase(), [
      [
        { kind: 'change_set_value', variationId: 'e1', setIndex: 0, field: 'repsMin', value: 6 },
        {
          kind: 'change_set_value',
          variationId: 'e1',
          setIndex: 1,
          field: 'load',
          value: 105,
        },
      ],
    ]);
    expect(result.exercises[0]?.sets[0]?.repsMin).toBe(6);
    expect(result.exercises[0]?.sets[1]?.loadPercent).toBe(105);
  });

  test('change_set_value load routes to loadPercent for normal sets and loadPercentOfPrevious for drop/cluster', () => {
    const result = materializeWorkout(makeBase(), [
      [
        { kind: 'change_set_value', variationId: 'e1', setIndex: 0, field: 'load', value: 90 },
        { kind: 'change_set_type', variationId: 'e1', setIndex: 1, setType: 'drop' },
        { kind: 'change_set_value', variationId: 'e1', setIndex: 1, field: 'load', value: 80 },
      ],
    ]);
    expect(result.exercises[0]?.sets[0]?.loadPercent).toBe(90);
    expect(result.exercises[0]?.sets[0]?.loadPercentOfPrevious).toBeNull();
    expect(result.exercises[0]?.sets[1]?.loadPercent).toBeNull();
    expect(result.exercises[0]?.sets[1]?.loadPercentOfPrevious).toBe(80);
  });

  test('last write wins across multiple ops arrays for the same (set, field)', () => {
    const result = materializeWorkout(makeBase(), [
      [{ kind: 'change_set_value', variationId: 'e1', setIndex: 0, field: 'repsMin', value: 7 }],
      [{ kind: 'change_set_value', variationId: 'e1', setIndex: 0, field: 'repsMin', value: 6 }],
    ]);
    expect(result.exercises[0]?.sets[0]?.repsMin).toBe(6);
  });

  test('splices add_set at position and later ops see the inserted set', () => {
    const result = materializeWorkout(makeBase(), [
      [
        {
          kind: 'add_set',
          variationId: 'e1',
          position: 1,
          set: setValue({ repsMin: 6, repsMax: 10 }),
        },
        {
          kind: 'change_set_value',
          variationId: 'e1',
          setIndex: 1,
          field: 'load',
          value: 105,
        },
      ],
    ]);
    const sets = result.exercises[0]?.sets ?? [];
    expect(sets).toHaveLength(3);
    expect(sets[1]?.loadPercent).toBe(105);
    expect(sets.map((s) => s.setOrder)).toEqual([0, 1, 2]);
  });

  test('remove_set shifts indices for subsequent ops within the same array', () => {
    const result = materializeWorkout(makeBase(), [
      [
        { kind: 'remove_set', variationId: 'e1', setIndex: 0 },
        { kind: 'change_set_value', variationId: 'e1', setIndex: 0, field: 'repsMin', value: 9 },
      ],
    ]);
    const sets = result.exercises[0]?.sets ?? [];
    expect(sets).toHaveLength(1);
    expect(sets[0]?.repsMin).toBe(9);
    expect(sets[0]?.setOrder).toBe(0);
  });

  test('remove_exercise removes the exercise from the output', () => {
    const result = materializeWorkout(makeBase(), [
      [{ kind: 'remove_exercise', variationId: 'e1' }],
    ]);
    expect(result.exercises).toHaveLength(0);
  });

  test('change_set_type updates the type without touching other fields', () => {
    const result = materializeWorkout(makeBase(), [
      [{ kind: 'change_set_type', variationId: 'e1', setIndex: 0, setType: 'drop' }],
    ]);
    expect(result.exercises[0]?.sets[0]?.setType).toBe('drop');
    expect(result.exercises[0]?.sets[0]?.repsMin).toBe(8);
  });

  test('add_exercise inserts a new exercise at the given position and reindexes positions', () => {
    const result = materializeWorkout(makeBase(), [
      [{ kind: 'add_exercise', variationId: 'e2', position: 0, exercise: newExercise() }],
    ]);
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[0]?.variation.id).toBe('e2');
    expect(result.exercises[0]?.position).toBe(0);
    expect(result.exercises[0]?.sets).toHaveLength(1);
    expect(result.exercises[1]?.variation.id).toBe('e1');
    expect(result.exercises[1]?.position).toBe(1);
  });

  test('add_exercise appends when position exceeds array length', () => {
    const result = materializeWorkout(makeBase(), [
      [{ kind: 'add_exercise', variationId: 'e2', position: 99, exercise: newExercise() }],
    ]);
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[1]?.variation.id).toBe('e2');
  });

  test('add_exercise is a no-op when variationId already exists', () => {
    const result = materializeWorkout(makeBase(), [
      [
        {
          kind: 'add_exercise',
          variationId: 'e1',
          position: 0,
          exercise: newExercise({ variation: { ...newExercise().variation, id: 'e1' } }),
        },
      ],
    ]);
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0]?.variation.exercise.name).toBe('Bench Press');
  });

  test('subsequent ops in same array can target the newly added exercise', () => {
    const result = materializeWorkout(makeBase(), [
      [
        { kind: 'add_exercise', variationId: 'e2', position: 1, exercise: newExercise() },
        {
          kind: 'add_set',
          variationId: 'e2',
          position: 1,
          set: setValue({ loadPercentOfPrevious: 105 }),
        },
        {
          kind: 'change_set_value',
          variationId: 'e2',
          setIndex: 0,
          field: 'load',
          value: 95,
        },
      ],
    ]);
    expect(result.exercises).toHaveLength(2);
    expect(result.exercises[1]?.sets).toHaveLength(2);
    expect(result.exercises[1]?.sets[0]?.loadPercent).toBe(95);
    expect(result.exercises[1]?.sets[1]?.loadPercentOfPrevious).toBe(105);
  });

  test('add_exercise followed by remove_exercise yields no new exercise in output', () => {
    const result = materializeWorkout(makeBase(), [
      [
        { kind: 'add_exercise', variationId: 'e2', position: 1, exercise: newExercise() },
        { kind: 'remove_exercise', variationId: 'e2' },
      ],
    ]);
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0]?.variation.id).toBe('e1');
  });

  test('is a no-op for out-of-range indices', () => {
    const result = materializeWorkout(makeBase(), [
      [
        { kind: 'remove_set', variationId: 'e1', setIndex: 99 },
        { kind: 'change_set_value', variationId: 'e1', setIndex: 99, field: 'repsMin', value: 99 },
      ],
    ]);
    expect(result.exercises[0]?.sets).toHaveLength(2);
  });

  test('is a no-op for ops targeting an unknown variation', () => {
    const base = makeBase();
    const result = materializeWorkout(base, [
      [
        {
          kind: 'change_set_value',
          variationId: 'unknown',
          setIndex: 0,
          field: 'repsMin',
          value: 1,
        },
      ],
    ]);
    expect(result).toEqual(base);
  });
});
