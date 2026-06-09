import {
  buildCompletedExecution,
  type CompletedExecution,
  type CompletedExercise,
  type CompletedSet,
  summarizeExecution,
} from '@/features/workouts/lib/completed-execution';
import type {
  ExecutionExerciseInput,
  ExecutionFormValues,
} from '@/features/workouts/lib/execution-form';

type OutputSet = ExecutionFormValues['exercises'][number]['sets'][number];

function set(overrides: Partial<OutputSet> = {}): OutputSet {
  return {
    id: 'set-1',
    type: 'normal',
    measurementType: 'weight_reps',
    roundOrder: 0,
    repsMin: null,
    repsMax: null,
    durationTarget: null,
    kg: undefined,
    reps: undefined,
    duration: undefined,
    done: false,
    ...overrides,
  };
}

function exercise(
  sets: OutputSet[],
  overrides: Partial<ExecutionExerciseInput> = {},
): ExecutionFormValues['exercises'][number] {
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
      name: null,
      exercise: { slug: 'supino', name: 'Supino', type: 'musculacao' },
      measurementType: 'weight_reps',
      equipment: { slug: 'barra', preposition: 'com' },
      muscle: { slug: 'chest' },
      secondaryMuscle: null,
    },
    sets,
    ...overrides,
  } as ExecutionFormValues['exercises'][number];
}

describe('buildCompletedExecution', () => {
  test('keeps only sets marked as done', () => {
    const result = buildCompletedExecution({
      exercises: [
        exercise([
          set({ id: 'a', done: true, kg: 80, reps: 10 }),
          set({ id: 'b', done: false, kg: 90, reps: 8 }),
        ]),
      ],
    });

    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0].sets.map((s) => s.id)).toEqual(['a']);
  });

  test('drops exercises with no completed sets', () => {
    const result = buildCompletedExecution({
      exercises: [
        exercise([set({ id: 'a', done: false })], { id: 'ex-empty' }),
        exercise([set({ id: 'b', done: true, kg: 50, reps: 5 })], { id: 'ex-kept' }),
      ],
    });

    expect(result.exercises.map((e) => e.id)).toEqual(['ex-kept']);
  });

  test('maps parsed values to the persisted shape', () => {
    const result = buildCompletedExecution({
      exercises: [
        exercise([
          set({ id: 'a', done: true, measurementType: 'weight_duration', kg: 20, duration: 45 }),
        ]),
      ],
    });

    expect(result.exercises[0].sets[0]).toEqual({
      id: 'a',
      type: 'normal',
      measurementType: 'weight_duration',
      roundOrder: 0,
      weightKg: 20,
      reps: null,
      repsMin: null,
      repsMax: null,
      durationSeconds: 45,
    });
  });

  test('returns no exercises when nothing was completed', () => {
    const values: ExecutionFormValues = {
      exercises: [exercise([set({ done: false })])],
    };

    expect(buildCompletedExecution(values).exercises).toEqual([]);
  });
});

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
  exerciseType: CompletedExercise['exerciseType'] = 'strength',
): CompletedExercise {
  return {
    id: 'ex-1',
    exerciseType,
    position: 0,
    supersetGroupId: 'ex-1',
    supersetOrder: 0,
    note: null,
    restSeconds: null,
    aliasId: null,
    variation: {
      id: 'var-1',
      slug: 'supino-reto',
      name: null,
      exercise: { slug: 'supino', name: 'Supino', type: 'musculacao' },
      measurementType: 'weight_reps',
      equipment: { slug: 'barra', preposition: 'com' },
      muscle: { slug: 'chest' },
      secondaryMuscle: null,
    },
    sets,
  };
}

function completedExecution(exercises: CompletedExercise[]): CompletedExecution {
  return { exercises };
}

describe('summarizeExecution', () => {
  test('counts every set in the completed execution', () => {
    const result = summarizeExecution(
      completedExecution([completedExercise([completedSet(), completedSet(), completedSet()])]),
    );

    expect(result.completedSets).toBe(3);
  });

  test('sums weight * reps across sets', () => {
    const result = summarizeExecution(
      completedExecution([
        completedExercise([
          completedSet({ weightKg: 80, reps: 10 }),
          completedSet({ weightKg: 100, reps: 5 }),
        ]),
      ]),
    );

    expect(result.totalVolumeKg).toBe(1300);
  });

  test('excludes preparatory exercises from sets and volume', () => {
    const result = summarizeExecution(
      completedExecution([
        completedExercise([completedSet({ weightKg: 40, reps: 12 })], 'preparatory'),
        completedExercise([completedSet({ weightKg: 80, reps: 10 })], 'strength'),
      ]),
    );

    expect(result.completedSets).toBe(1);
    expect(result.totalVolumeKg).toBe(800);
  });

  test('excludes warmup sets from both sets and volume by default', () => {
    const result = summarizeExecution(
      completedExecution([
        completedExercise([
          completedSet({ type: 'warmup', weightKg: 40, reps: 10 }),
          completedSet({ type: 'normal', weightKg: 80, reps: 10 }),
        ]),
      ]),
    );

    expect(result.completedSets).toBe(1);
    expect(result.totalVolumeKg).toBe(800);
  });

  test('includes warmup sets in both sets and volume when the preference is enabled', () => {
    const result = summarizeExecution(
      completedExecution([
        completedExercise([
          completedSet({ type: 'warmup', weightKg: 40, reps: 10 }),
          completedSet({ type: 'normal', weightKg: 80, reps: 10 }),
        ]),
      ]),
      true,
    );

    expect(result.completedSets).toBe(2);
    expect(result.totalVolumeKg).toBe(1200);
  });

  test('treats missing weight or reps as zero volume', () => {
    const result = summarizeExecution(
      completedExecution([
        completedExercise([
          completedSet({ weightKg: null, reps: 10 }),
          completedSet({ weightKg: 60, reps: null }),
        ]),
      ]),
    );

    expect(result.completedSets).toBe(2);
    expect(result.totalVolumeKg).toBe(0);
  });

  test('returns zeros for no exercises', () => {
    expect(summarizeExecution(completedExecution([]))).toEqual({
      completedSets: 0,
      totalVolumeKg: 0,
    });
  });
});
