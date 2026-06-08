import type { ExerciseRecordsResponse } from '@/features/exercises/api/exercises';
import type {
  CompletedExecution,
  CompletedExercise,
  CompletedSet,
} from '@/features/workouts/lib/completed-execution';
import { buildSessionRecords } from '@/features/workouts/lib/session-records';

function completedSet(overrides: Partial<CompletedSet> = {}): CompletedSet {
  return {
    id: 'set-1',
    type: 'normal',
    measurementType: 'weight_reps',
    roundOrder: 0,
    weightKg: null,
    reps: null,
    repsMin: null,
    repsMax: null,
    durationSeconds: null,
    ...overrides,
  };
}

function completedExercise(
  sets: CompletedSet[],
  overrides: Partial<CompletedExercise> = {},
): CompletedExercise {
  return {
    id: 'ex-1',
    exerciseType: 'strength',
    position: 0,
    supersetGroupId: 'ex-1',
    supersetOrder: 0,
    note: null,
    restSeconds: null,
    aliasId: null,
    variation: {
      id: 'var-1',
      slug: 'supino-reto',
      name: 'Inclinado',
      exercise: { slug: 'supino', name: 'Supino', type: 'musculacao' },
      equipment: { slug: 'barra', preposition: 'com' },
      muscle: { slug: 'chest' },
      secondaryMuscle: null,
    },
    sets,
    ...overrides,
  };
}

function execution(exercises: CompletedExercise[]): CompletedExecution {
  return { exercises };
}

function record(
  overrides: Partial<ExerciseRecordsResponse[number]> = {},
): ExerciseRecordsResponse[number] {
  return {
    variationId: 'var-1',
    aliasId: null,
    maxWeightKg: null,
    maxVolumeKg: null,
    maxReps: null,
    maxSets: null,
    ...overrides,
  };
}

describe('buildSessionRecords', () => {
  test('treats every positive metric as a record when there is no prior baseline', () => {
    const result = buildSessionRecords(
      execution([completedExercise([completedSet({ weightKg: 10, reps: 12 })])]),
      [],
      false,
    );

    expect(result).toEqual([
      {
        exerciseName: 'Supino',
        variationName: 'Inclinado',
        records: [
          { metric: 'maxWeight', previous: 0, current: 10 },
          { metric: 'volume', previous: 0, current: 120 },
          { metric: 'maxReps', previous: 0, current: 12 },
          { metric: 'sets', previous: 0, current: 1 },
        ],
      },
    ]);
  });

  test('lists only the metrics that beat the previous record', () => {
    const result = buildSessionRecords(
      execution([completedExercise([completedSet({ weightKg: 90, reps: 10 })])]),
      [record({ maxWeightKg: 80, maxVolumeKg: 2880, maxReps: 12, maxSets: 4 })],
      false,
    );

    expect(result).toEqual([
      {
        exerciseName: 'Supino',
        variationName: 'Inclinado',
        records: [{ metric: 'maxWeight', previous: 80, current: 90 }],
      },
    ]);
  });

  test('excludes an exercise that beat no record', () => {
    const result = buildSessionRecords(
      execution([completedExercise([completedSet({ weightKg: 50, reps: 8 })])]),
      [record({ maxWeightKg: 80, maxVolumeKg: 2880, maxReps: 12, maxSets: 4 })],
      false,
    );

    expect(result).toEqual([]);
  });

  test('includes drop/cluster but excludes warmup when the preference is off', () => {
    const result = buildSessionRecords(
      execution([
        completedExercise([
          completedSet({ id: 'w', type: 'warmup', weightKg: 40, reps: 15 }),
          completedSet({ id: 'n', type: 'normal', weightKg: 60, reps: 10 }),
          completedSet({ id: 'd', type: 'drop', weightKg: 30, reps: 20 }),
        ]),
      ]),
      [],
      false,
    );

    expect(result[0].records).toEqual([
      { metric: 'maxWeight', previous: 0, current: 60 },
      { metric: 'volume', previous: 0, current: 1200 },
      { metric: 'maxReps', previous: 0, current: 20 },
      { metric: 'sets', previous: 0, current: 2 },
    ]);
  });

  test('counts warmup sets too when the preference is on', () => {
    const result = buildSessionRecords(
      execution([
        completedExercise([
          completedSet({ id: 'w', type: 'warmup', weightKg: 40, reps: 15 }),
          completedSet({ id: 'n', type: 'normal', weightKg: 60, reps: 10 }),
          completedSet({ id: 'd', type: 'drop', weightKg: 30, reps: 20 }),
        ]),
      ]),
      [],
      true,
    );

    expect(result[0].records).toEqual([
      { metric: 'maxWeight', previous: 0, current: 60 },
      { metric: 'volume', previous: 0, current: 1800 },
      { metric: 'maxReps', previous: 0, current: 20 },
      { metric: 'sets', previous: 0, current: 3 },
    ]);
  });

  test('ignores preparatory exercises', () => {
    const result = buildSessionRecords(
      execution([
        completedExercise([completedSet({ weightKg: 40, reps: 12 })], {
          exerciseType: 'preparatory',
        }),
      ]),
      [],
      false,
    );

    expect(result).toEqual([]);
  });

  test('aggregates the same variation across multiple exercise slots', () => {
    const result = buildSessionRecords(
      execution([
        completedExercise([completedSet({ id: 'a', weightKg: 50, reps: 10 })], { id: 'slot-1' }),
        completedExercise([completedSet({ id: 'b', weightKg: 70, reps: 8 })], { id: 'slot-2' }),
      ]),
      [],
      false,
    );

    expect(result).toHaveLength(1);
    expect(result[0].records).toEqual([
      { metric: 'maxWeight', previous: 0, current: 70 },
      { metric: 'volume', previous: 0, current: 1060 },
      { metric: 'maxReps', previous: 0, current: 10 },
      { metric: 'sets', previous: 0, current: 2 },
    ]);
  });

  test('reports a first-time bodyweight exercise with zeroed weight and volume', () => {
    const result = buildSessionRecords(
      execution([completedExercise([completedSet({ weightKg: null, reps: 12 })])]),
      [],
      false,
    );

    expect(result[0].records).toEqual([
      { metric: 'maxWeight', previous: 0, current: 0 },
      { metric: 'volume', previous: 0, current: 0 },
      { metric: 'maxReps', previous: 0, current: 12 },
      { metric: 'sets', previous: 0, current: 1 },
    ]);
  });

  test('still returns a first-time exercise that has a prior record on a sibling variation only', () => {
    const result = buildSessionRecords(
      execution([completedExercise([completedSet({ weightKg: 20, reps: 10 })])]),
      [record({ variationId: 'other-variation', maxWeightKg: 100 })],
      false,
    );

    expect(result).toEqual([
      {
        exerciseName: 'Supino',
        variationName: 'Inclinado',
        records: [
          { metric: 'maxWeight', previous: 0, current: 20 },
          { metric: 'volume', previous: 0, current: 200 },
          { metric: 'maxReps', previous: 0, current: 10 },
          { metric: 'sets', previous: 0, current: 1 },
        ],
      },
    ]);
  });
});
