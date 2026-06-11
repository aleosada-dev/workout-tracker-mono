import type { GetWorkoutResponse } from '@/features/workouts/api/workouts';
import {
  type BuilderExerciseInput,
  type BuilderSetInput,
  buildBuilderFromWorkout,
  buildBuilderSet,
  toUpsertWorkoutRequest,
  WorkoutFormSchema,
  type WorkoutFormValues,
} from '@/features/workouts/lib/builder-form';

function builderSet(overrides: Partial<BuilderSetInput> & Pick<BuilderSetInput, 'id'>) {
  return {
    ...buildBuilderSet(overrides.id, 'normal', 'weight_reps', 0),
    ...overrides,
  };
}

function builderExercise(
  overrides: Partial<BuilderExerciseInput> & Pick<BuilderExerciseInput, 'id' | 'sets'>,
): BuilderExerciseInput {
  return {
    exerciseType: 'strength',
    position: 0,
    supersetGroupId: overrides.id,
    supersetOrder: 0,
    note: null,
    restSeconds: null,
    variation: {
      id: `var-${overrides.id}`,
      slug: 'supino-reto',
      name: null,
      exercise: { slug: 'supino', name: 'Supino', type: 'musculacao' },
      measurementType: 'weight_reps',
      equipment: { slug: 'barra', preposition: 'com' },
      muscle: { slug: 'chest' },
      secondaryMuscle: null,
    },
    ...overrides,
  };
}

function formInput(exercises: BuilderExerciseInput[]) {
  return { name: 'Treino A', description: '', exercises };
}

describe('WorkoutFormSchema', () => {
  test('parses string inputs into numeric targets', () => {
    const result = WorkoutFormSchema.parse(
      formInput([
        builderExercise({
          id: 'e1',
          sets: [builderSet({ id: 's1', repsMin: '8', repsMax: '12' })],
        }),
      ]),
    );
    expect(result.exercises[0].sets[0]).toMatchObject({ repsMin: 8, repsMax: 12 });
  });

  test('defaults repsMax to repsMin when left empty', () => {
    const result = WorkoutFormSchema.parse(
      formInput([
        builderExercise({
          id: 'e1',
          sets: [builderSet({ id: 's1', repsMin: '10', repsMax: '' })],
        }),
      ]),
    );
    expect(result.exercises[0].sets[0]).toMatchObject({ repsMin: 10, repsMax: 10 });
  });

  test('requires repsMin for rep-based sets', () => {
    const result = WorkoutFormSchema.safeParse(
      formInput([builderExercise({ id: 'e1', sets: [builderSet({ id: 's1' })] })]),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]).toMatchObject({
      message: 'workoutFormScreen.validation.reps.required',
      path: ['exercises', 0, 'sets', 0, 'repsMin'],
    });
  });

  test('rejects repsMax below repsMin', () => {
    const result = WorkoutFormSchema.safeParse(
      formInput([
        builderExercise({
          id: 'e1',
          sets: [builderSet({ id: 's1', repsMin: '10', repsMax: '8' })],
        }),
      ]),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]).toMatchObject({
      message: 'workoutFormScreen.validation.reps.maxBelowMin',
    });
  });

  test('requires duration target for duration sets', () => {
    const result = WorkoutFormSchema.safeParse(
      formInput([
        builderExercise({
          id: 'e1',
          sets: [builderSet({ id: 's1', measurementType: 'duration' })],
        }),
      ]),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]).toMatchObject({
      message: 'workoutFormScreen.validation.duration.required',
    });
  });

  test('allows distance sets without a target', () => {
    const result = WorkoutFormSchema.safeParse(
      formInput([
        builderExercise({
          id: 'e1',
          sets: [builderSet({ id: 's1', measurementType: 'distance' })],
        }),
      ]),
    );
    expect(result.success).toBe(true);
  });

  test('rejects an empty workout name', () => {
    const result = WorkoutFormSchema.safeParse({ name: '  ', description: '', exercises: [] });
    expect(result.success).toBe(false);
  });
});

describe('buildBuilderFromWorkout', () => {
  const workout = {
    id: 'w1',
    userId: 'u1',
    name: 'Treino A',
    description: null,
    folderId: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    exercises: [
      {
        id: 'e1',
        exerciseType: 'strength',
        position: 0,
        supersetGroupId: 'e1',
        supersetOrder: 0,
        note: 'nota',
        restSeconds: 90,
        variation: {
          id: 'v1',
          slug: 'supino-reto',
          name: null,
          exercise: { slug: 'supino', name: 'Supino', type: 'musculacao' },
          measurementType: 'weight_reps',
          equipment: { slug: 'barra', preposition: 'com' },
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
            distanceMeters: null,
            linkedSetId: null,
            loadPercent: null,
            loadPercentOfPrevious: null,
            roundOrder: 0,
            logicalKey: 'normal-0',
          },
          {
            id: 's2',
            setOrder: 1,
            setType: 'drop',
            measurementType: 'weight_reps',
            repsMin: 8,
            repsMax: 8,
            durationSeconds: null,
            distanceMeters: null,
            linkedSetId: 's1',
            loadPercent: null,
            loadPercentOfPrevious: 80,
            roundOrder: 0,
            logicalKey: 'drop-0',
          },
        ],
      },
    ],
  } as unknown as GetWorkoutResponse;

  test('round-trips targets into string inputs', () => {
    const input = buildBuilderFromWorkout(workout);
    expect(input.name).toBe('Treino A');
    expect(input.description).toBe('');
    expect(input.exercises[0].sets[0]).toMatchObject({
      type: 'normal',
      repsMin: '8',
      repsMax: '12',
      loadPercent: '',
    });
    expect(input.exercises[0].sets[1]).toMatchObject({
      type: 'drop',
      loadPercent: '80',
      linkedSetId: 's1',
      roundOrder: 0,
    });
  });
});

describe('toUpsertWorkoutRequest', () => {
  function parsedValues(exercises: BuilderExerciseInput[]): WorkoutFormValues {
    return WorkoutFormSchema.parse(formInput(exercises));
  }

  test('derives linkedSetId from the previous set for drop/cluster', () => {
    const values = parsedValues([
      builderExercise({
        id: 'e1',
        sets: [
          builderSet({ id: 's1', repsMin: '10' }),
          builderSet({
            id: 's2',
            type: 'drop',
            repsMin: '8',
            loadPercent: '75',
            linkedSetId: 'stale-id',
          }),
        ],
      }),
    ]);
    const request = toUpsertWorkoutRequest(values, { folderId: null });
    expect(request.exercises[0].sets[1]).toMatchObject({
      setOrder: 1,
      setType: 'drop',
      linkedSetId: 's1',
      loadPercentOfPrevious: 75,
    });
  });

  test('clears loadPercent for non-linked sets and maps fields', () => {
    const values = parsedValues([
      builderExercise({
        id: 'e1',
        note: 'cadência',
        restSeconds: 120,
        sets: [builderSet({ id: 's1', repsMin: '10', loadPercent: '50' })],
      }),
    ]);
    const request = toUpsertWorkoutRequest(values, { userId: 'u9', folderId: 'f1' });
    expect(request.userId).toBe('u9');
    expect(request.folderId).toBe('f1');
    expect(request.exercises[0]).toMatchObject({
      variationId: 'var-e1',
      note: 'cadência',
      restSeconds: 120,
    });
    expect(request.exercises[0].sets[0]).toMatchObject({
      linkedSetId: null,
      loadPercentOfPrevious: null,
      repsMin: 10,
      repsMax: 10,
    });
  });

  test('normalizes a blank description to null', () => {
    const values = parsedValues([]);
    const request = toUpsertWorkoutRequest(values, { folderId: null });
    expect(request.description).toBeNull();
  });
});
