import type { GetWorkoutLastLogResponse } from '@/features/workouts/api/workouts';
import type {
  CompletedExecution,
  CompletedExercise,
  CompletedSet,
} from '@/features/workouts/lib/completed-execution';
import { buildSessionComparison } from '@/features/workouts/lib/session-comparison';

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
    distanceMeters: null,
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
      measurementType: 'weight_reps',
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

type LastLog = NonNullable<GetWorkoutLastLogResponse>;
type LastLogExercise = LastLog['exercises'][number];
type LastLogSet = LastLogExercise['sets'][number];

function lastSet(overrides: Partial<LastLogSet> = {}): LastLogSet {
  return {
    setOrder: 0,
    setType: 'normal',
    weightKg: null,
    reps: null,
    logicalKey: 'normal-1',
    ...overrides,
  };
}

function lastExercise(
  sets: LastLogSet[],
  overrides: Partial<LastLogExercise> = {},
): LastLogExercise {
  return {
    variationId: 'var-1',
    exerciseName: 'Supino',
    variationName: 'Inclinado',
    position: 0,
    supersetGroupId: null,
    sets,
    ...overrides,
  };
}

function lastLog(exercises: LastLogExercise[]): LastLog {
  return {
    workoutLogId: 'log-1',
    workoutId: 'workout-1',
    startedAt: '2026-05-29T10:00:00.000Z',
    finishedAt: '2026-05-29T11:00:00.000Z',
    exercises,
  };
}

describe('buildSessionComparison', () => {
  test('returns null when there is nothing to compare', () => {
    const result = buildSessionComparison(execution([]), null, false);

    expect(result).toBeNull();
  });

  test('shows every exercise as new when there is no previous log', () => {
    const result = buildSessionComparison(
      execution([completedExercise([completedSet({ weightKg: 10, reps: 10 })])]),
      null,
      false,
    );

    expect(result?.previousDate).toBeNull();
    const current = result?.exercises[0];
    expect(current?.status).toBe('new');
    expect(current?.previousSets).toBeNull();
    expect(current?.previousVolumeKg).toBeNull();
    expect(current?.currentSets).toBe(1);
    expect(current?.currentVolumeKg).toBe(100);
  });

  test('marks an exercise absent from the previous log as new', () => {
    const result = buildSessionComparison(
      execution([completedExercise([completedSet({ weightKg: 20, reps: 10 })])]),
      lastLog([lastExercise([lastSet({ weightKg: 30, reps: 8 })], { variationId: 'var-other' })]),
      false,
    );

    const current = result?.exercises.find((e) => e.variationId === 'var-1');
    expect(current?.status).toBe('new');
    expect(current?.previousSets).toBeNull();
    expect(current?.previousVolumeKg).toBeNull();
    expect(current?.currentSets).toBe(1);
    expect(current?.currentVolumeKg).toBe(200);
  });

  test('marks an exercise present in both as kept with current and previous metrics', () => {
    const result = buildSessionComparison(
      execution([
        completedExercise([
          completedSet({ weightKg: 50, reps: 10 }),
          completedSet({ id: 'set-2', weightKg: 50, reps: 10 }),
        ]),
      ]),
      lastLog([lastExercise([lastSet({ weightKg: 40, reps: 10 })])]),
      false,
    );

    const kept = result?.exercises[0];
    expect(kept?.status).toBe('kept');
    expect(kept?.currentSets).toBe(2);
    expect(kept?.previousSets).toBe(1);
    expect(kept?.currentVolumeKg).toBe(1000);
    expect(kept?.previousVolumeKg).toBe(400);
  });

  test('marks an exercise only present in the previous log as removed', () => {
    const result = buildSessionComparison(
      execution([]),
      lastLog([lastExercise([lastSet({ weightKg: 40, reps: 10 })])]),
      false,
    );

    const removed = result?.exercises[0];
    expect(removed?.status).toBe('removed');
    expect(removed?.currentSets).toBe(0);
    expect(removed?.currentVolumeKg).toBe(0);
    expect(removed?.previousSets).toBe(1);
    expect(removed?.previousVolumeKg).toBe(400);
  });

  test('excludes warmup sets unless includeWarmup is set', () => {
    const exec = execution([
      completedExercise([
        completedSet({ type: 'warmup', weightKg: 20, reps: 10 }),
        completedSet({ id: 'set-2', weightKg: 50, reps: 10 }),
      ]),
    ]);
    const previous = lastLog([
      lastExercise([
        lastSet({ setType: 'warmup', weightKg: 20, reps: 10 }),
        lastSet({ setOrder: 1, weightKg: 40, reps: 10 }),
      ]),
    ]);

    const excluded = buildSessionComparison(exec, previous, false)?.exercises[0];
    expect(excluded?.currentSets).toBe(1);
    expect(excluded?.currentVolumeKg).toBe(500);
    expect(excluded?.previousSets).toBe(1);
    expect(excluded?.previousVolumeKg).toBe(400);

    const included = buildSessionComparison(exec, previous, true)?.exercises[0];
    expect(included?.currentSets).toBe(2);
    expect(included?.currentVolumeKg).toBe(700);
    expect(included?.previousSets).toBe(2);
    expect(included?.previousVolumeKg).toBe(600);
  });
});
