import { describe, expect, test } from 'bun:test';
import type { WorkoutDetail, WorkoutDetailSet } from '../../workouts/workout';
import type { PeriodizationAdjustment, WorkoutOverrideOp } from '../adjustment';
import { resolveWorkoutExecutionContext } from './resolve-execution';

const WORKOUT_ID = 'workout-1';
const VARIATION_A = 'var-a';
const VARIATION_B = 'var-b';

function makeSet(overrides: Partial<WorkoutDetailSet> = {}): WorkoutDetailSet {
  return {
    id: 'set-1',
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
    ...overrides,
  };
}

function makeBase(): WorkoutDetail {
  return {
    id: WORKOUT_ID,
    userId: 'user-1',
    name: 'Push A',
    description: null,
    folderId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    exercises: [
      {
        id: 'ex-a',
        exerciseType: 'strength',
        position: 0,
        supersetGroupId: 'sg-a',
        supersetOrder: 0,
        note: null,
        restSeconds: 90,
        variation: {
          id: VARIATION_A,
          slug: 'bench',
          name: null,
          exercise: { slug: 'bench', name: 'Bench', type: 'musculacao' },
          measurementType: 'weight_reps',
          equipment: { slug: 'barbell', preposition: 'with' },
          muscle: { slug: 'chest' },
          secondaryMuscle: null,
        },
        sets: [
          makeSet({ id: 's1', setOrder: 0, roundOrder: 0 }),
          makeSet({ id: 's2', setOrder: 1, roundOrder: 1 }),
          makeSet({ id: 's3', setOrder: 2, roundOrder: 2 }),
        ],
      },
    ],
  };
}

function overrideAdjustment(
  ops: WorkoutOverrideOp[],
  cycle: { cycleStart: number | null; cycleEnd: number | null; cycleEvery: number | null } = {
    cycleStart: null,
    cycleEnd: null,
    cycleEvery: null,
  },
  positionInDay = 0,
): PeriodizationAdjustment {
  return {
    id: 'adj-1',
    periodizationId: 'per-1',
    cycleStart: cycle.cycleStart,
    cycleEnd: cycle.cycleEnd,
    cycleEvery: cycle.cycleEvery,
    type: 'workout_override',
    payload: { type: 'workout_override', workoutId: WORKOUT_ID, positionInDay, ops },
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

const TARGET = { workoutId: WORKOUT_ID, positionInDay: 0, cycle: 1 };

describe('resolveWorkoutExecutionContext', () => {
  test('no adjustments is a no-op', () => {
    const base = makeBase();
    const { workout, note } = resolveWorkoutExecutionContext({ base, adjustments: [], ...TARGET });
    expect(workout).toEqual(base);
    expect(note).toBeNull();
  });

  test('change_set_value rewrites reps and load', () => {
    const adjustments = [
      overrideAdjustment([
        {
          kind: 'change_set_value',
          variationId: VARIATION_A,
          setIndex: 0,
          field: 'repsMax',
          value: 6,
        },
        {
          kind: 'change_set_value',
          variationId: VARIATION_A,
          setIndex: 0,
          field: 'load',
          value: 90,
        },
      ]),
    ];
    const { workout } = resolveWorkoutExecutionContext({
      base: makeBase(),
      adjustments,
      ...TARGET,
    });
    const set = workout.exercises[0]?.sets[0];
    expect(set?.repsMax).toBe(6);
    expect(set?.loadPercent).toBe(90);
  });

  test('add_set and remove_set resize the exercise and reindex set order', () => {
    const adjustments = [
      overrideAdjustment([
        { kind: 'remove_set', variationId: VARIATION_A, setIndex: 2 },
        {
          kind: 'add_set',
          variationId: VARIATION_A,
          position: 0,
          set: {
            setType: 'warmup',
            measurementType: 'weight_reps',
            repsMin: 15,
            repsMax: 15,
            durationSeconds: null,
            loadPercent: null,
            loadPercentOfPrevious: null,
          },
        },
      ]),
    ];
    const { workout } = resolveWorkoutExecutionContext({
      base: makeBase(),
      adjustments,
      ...TARGET,
    });
    const sets = workout.exercises[0]?.sets ?? [];
    expect(sets).toHaveLength(3);
    expect(sets[0]?.setType).toBe('warmup');
    expect(sets.map((s) => s.setOrder)).toEqual([0, 1, 2]);
  });

  test('add_exercise and remove_exercise', () => {
    const newVariation = makeBase().exercises[0]?.variation ?? {
      id: VARIATION_B,
      slug: null,
      name: null,
      exercise: { slug: null, name: 'Row', type: 'musculacao' as const },
      measurementType: 'weight_reps' as const,
      equipment: { slug: 'barbell', preposition: 'with' },
      muscle: { slug: 'back' },
      secondaryMuscle: null,
    };
    const adjustments = [
      overrideAdjustment([
        { kind: 'remove_exercise', variationId: VARIATION_A },
        {
          kind: 'add_exercise',
          variationId: VARIATION_B,
          position: 0,
          exercise: {
            exerciseType: 'strength',
            supersetGroupId: 'sg-b',
            supersetOrder: 0,
            note: null,
            restSeconds: 60,
            variation: { ...newVariation, id: VARIATION_B },
            sets: [
              {
                setType: 'normal',
                measurementType: 'weight_reps',
                repsMin: 5,
                repsMax: 5,
                durationSeconds: null,
                loadPercent: null,
                loadPercentOfPrevious: null,
              },
            ],
          },
        },
      ]),
    ];
    const { workout } = resolveWorkoutExecutionContext({
      base: makeBase(),
      adjustments,
      ...TARGET,
    });
    expect(workout.exercises).toHaveLength(1);
    expect(workout.exercises[0]?.variation.id).toBe(VARIATION_B);
    expect(workout.exercises[0]?.position).toBe(0);
  });

  test('filters overrides by cycle propagation', () => {
    // applies to cycles 1, 3, 5, ...
    const adjustments = [
      overrideAdjustment(
        [
          {
            kind: 'change_set_value',
            variationId: VARIATION_A,
            setIndex: 0,
            field: 'repsMax',
            value: 6,
          },
        ],
        { cycleStart: 1, cycleEnd: null, cycleEvery: 2 },
      ),
    ];
    const applied = resolveWorkoutExecutionContext({
      base: makeBase(),
      adjustments,
      ...TARGET,
      cycle: 3,
    });
    expect(applied.workout.exercises[0]?.sets[0]?.repsMax).toBe(6);

    const skipped = resolveWorkoutExecutionContext({
      base: makeBase(),
      adjustments,
      ...TARGET,
      cycle: 2,
    });
    expect(skipped.workout.exercises[0]?.sets[0]?.repsMax).toBe(12);
  });

  test('ignores overrides for a different workout or positionInDay', () => {
    const adjustments = [
      overrideAdjustment(
        [
          {
            kind: 'change_set_value',
            variationId: VARIATION_A,
            setIndex: 0,
            field: 'repsMax',
            value: 6,
          },
        ],
        { cycleStart: null, cycleEnd: null, cycleEvery: null },
        1,
      ),
    ];
    const { workout } = resolveWorkoutExecutionContext({
      base: makeBase(),
      adjustments,
      ...TARGET,
    });
    expect(workout.exercises[0]?.sets[0]?.repsMax).toBe(12);
  });

  test('ignores overrides targeting a different workoutId', () => {
    const adjustments: PeriodizationAdjustment[] = [
      {
        id: 'adj-other',
        periodizationId: 'per-1',
        cycleStart: null,
        cycleEnd: null,
        cycleEvery: null,
        type: 'workout_override',
        payload: {
          type: 'workout_override',
          workoutId: 'workout-2',
          positionInDay: 0,
          ops: [
            {
              kind: 'change_set_value',
              variationId: VARIATION_A,
              setIndex: 0,
              field: 'repsMax',
              value: 6,
            },
          ],
        },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const { workout } = resolveWorkoutExecutionContext({
      base: makeBase(),
      adjustments,
      ...TARGET,
    });
    expect(workout.exercises[0]?.sets[0]?.repsMax).toBe(12);
  });

  test('applies overrides in createdAt order (later createdAt wins)', () => {
    const change = (value: number): WorkoutOverrideOp => ({
      kind: 'change_set_value',
      variationId: VARIATION_A,
      setIndex: 0,
      field: 'repsMax',
      value,
    });
    const adjustments: PeriodizationAdjustment[] = [
      { ...overrideAdjustment([change(85)]), id: 'a2', createdAt: '2026-01-02T00:00:00.000Z' },
      { ...overrideAdjustment([change(90)]), id: 'a1', createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    const { workout } = resolveWorkoutExecutionContext({
      base: makeBase(),
      adjustments,
      ...TARGET,
    });
    expect(workout.exercises[0]?.sets[0]?.repsMax).toBe(85);
  });

  test('selects the cycle-matching note', () => {
    const adjustments: PeriodizationAdjustment[] = [
      {
        id: 'adj-note',
        periodizationId: 'per-1',
        cycleStart: 1,
        cycleEnd: null,
        cycleEvery: 1,
        type: 'note',
        payload: { type: 'note', workoutId: WORKOUT_ID, text: 'Deload week' },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const { note } = resolveWorkoutExecutionContext({ base: makeBase(), adjustments, ...TARGET });
    expect(note).toBe('Deload week');
  });

  test('note with null propagation is ignored', () => {
    const adjustments: PeriodizationAdjustment[] = [
      {
        id: 'adj-note',
        periodizationId: 'per-1',
        cycleStart: null,
        cycleEnd: null,
        cycleEvery: null,
        type: 'note',
        payload: { type: 'note', workoutId: null, text: 'global' },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const { note } = resolveWorkoutExecutionContext({ base: makeBase(), adjustments, ...TARGET });
    expect(note).toBeNull();
  });

  test('note scoped to another workout does not match', () => {
    const adjustments: PeriodizationAdjustment[] = [
      {
        id: 'adj-note',
        periodizationId: 'per-1',
        cycleStart: 1,
        cycleEnd: null,
        cycleEvery: 1,
        type: 'note',
        payload: { type: 'note', workoutId: 'workout-2', text: 'only-other' },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const { note } = resolveWorkoutExecutionContext({ base: makeBase(), adjustments, ...TARGET });
    expect(note).toBeNull();
  });
});
