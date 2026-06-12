import type { GetWorkoutResponse } from '@/features/workouts/api/workouts';
import {
  type BuilderExerciseInput,
  type BuilderSetInput,
  buildBuilderAlternativeFromPicked,
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

  test('emits the alternative with its own sets and null linkedSetId for normal sets', () => {
    const values = parsedValues([
      builderExercise({
        id: 'e1',
        sets: [builderSet({ id: 's1', repsMin: '8', repsMax: '10' })],
        alternative: {
          id: 'a1',
          note: null,
          restSeconds: 90,
          variation: {
            id: 'var-alt',
            slug: null,
            name: null,
            exercise: { slug: 'leg-press', name: 'Leg Press', type: 'musculacao' },
            measurementType: 'weight_reps',
            equipment: { slug: 'machine', preposition: 'na' },
            muscle: { slug: 'quads' },
            secondaryMuscle: null,
          },
          sets: [builderSet({ id: 'as1', repsMin: '8', repsMax: '10' })],
        },
      }),
    ]);
    const request = toUpsertWorkoutRequest(values, { folderId: null });
    expect(request.exercises[0].alternative?.variationId).toBe('var-alt');
    expect(request.exercises[0].alternative?.sets[0]).toMatchObject({
      setOrder: 0,
      linkedSetId: null,
    });
  });

  test('emits alternative null when the exercise has none', () => {
    const values = parsedValues([
      builderExercise({ id: 'e1', sets: [builderSet({ id: 's1', repsMin: '8' })] }),
    ]);
    const request = toUpsertWorkoutRequest(values, { folderId: null });
    expect(request.exercises[0].alternative).toBeNull();
  });
});

describe('buildBuilderAlternativeFromPicked', () => {
  const picked = {
    exercise: { slug: 'leg-press', name: 'Leg Press', type: 'musculacao' },
    variation: {
      id: 'var-alt',
      slug: null,
      name: null,
      measurementType: 'weight_reps',
      equipment: { slug: 'machine', preposition: 'na' },
      muscle: { slug: 'quads' },
      secondaryMuscle: null,
    },
  } as never;

  test('seeds one set per principal set, copying the prescription, measured by the alternative', () => {
    const principalSets: BuilderSetInput[] = [
      buildBuilderSet('s1', 'normal', 'weight_reps', 0),
      buildBuilderSet('s2', 'normal', 'weight_reps', 1),
    ];
    principalSets[0].repsMin = '8';
    principalSets[0].repsMax = '10';
    let n = 0;
    const alt = buildBuilderAlternativeFromPicked(picked, principalSets, () => `gen-${n++}`);
    expect(alt.variation.id).toBe('var-alt');
    expect(alt.sets).toHaveLength(2);
    expect(alt.sets[0].repsMin).toBe('8');
    expect(alt.sets[0].repsMax).toBe('10');
    expect(alt.sets[0].measurementType).toBe('weight_reps');
    expect(alt.sets[0].linkedSetId).toBeNull();
  });
});

describe('buildBuilderFromWorkout alternatives', () => {
  function responseExercise(over: Record<string, unknown>) {
    return {
      id: 'p1',
      exerciseType: 'strength',
      position: 0,
      supersetGroupId: 'p1',
      supersetOrder: 0,
      note: null,
      restSeconds: null,
      alternativeOfId: null,
      variation: {
        id: 'vp',
        slug: null,
        name: null,
        exercise: { slug: null, name: 'A', type: 'musculacao' },
        measurementType: 'weight_reps',
        equipment: { slug: 'barbell', preposition: 'com' },
        muscle: { slug: 'chest' },
        secondaryMuscle: null,
      },
      sets: [
        {
          id: 'ps',
          setOrder: 0,
          setType: 'normal',
          measurementType: 'weight_reps',
          repsMin: 8,
          repsMax: 10,
          durationSeconds: null,
          distanceMeters: null,
          linkedSetId: null,
          loadPercent: null,
          loadPercentOfPrevious: null,
          roundOrder: 0,
          logicalKey: 'normal-0',
        },
      ],
      ...over,
    };
  }

  test('nests alternative rows under their principal and drops them from the top list', () => {
    const workout = {
      id: 'w1',
      userId: 'u1',
      name: 'W',
      description: null,
      folderId: null,
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
      exercises: [
        responseExercise({}),
        responseExercise({
          id: 'alt1',
          supersetGroupId: 'alt1',
          restSeconds: 90,
          alternativeOfId: 'p1',
          variation: {
            id: 'va',
            slug: null,
            name: null,
            exercise: { slug: null, name: 'B', type: 'musculacao' },
            measurementType: 'weight_reps',
            equipment: { slug: 'machine', preposition: 'na' },
            muscle: { slug: 'chest' },
            secondaryMuscle: null,
          },
          sets: [
            {
              id: 'altset',
              setOrder: 0,
              setType: 'normal',
              measurementType: 'weight_reps',
              repsMin: 8,
              repsMax: 10,
              durationSeconds: null,
              distanceMeters: null,
              linkedSetId: null,
              loadPercent: null,
              loadPercentOfPrevious: null,
              roundOrder: 0,
              logicalKey: 'normal-0',
            },
          ],
        }),
      ],
    } as unknown as GetWorkoutResponse;

    const form = buildBuilderFromWorkout(workout);
    expect(form.exercises).toHaveLength(1);
    expect(form.exercises[0].id).toBe('p1');
    expect(form.exercises[0].alternative?.variation.id).toBe('va');
    expect(form.exercises[0].alternative?.sets[0].repsMin).toBe('8');
  });

  test('leaves alternative null when the principal has none', () => {
    const workout = {
      id: 'w1',
      userId: 'u1',
      name: 'W',
      description: null,
      folderId: null,
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
      exercises: [responseExercise({})],
    } as unknown as GetWorkoutResponse;
    const form = buildBuilderFromWorkout(workout);
    expect(form.exercises[0].alternative).toBeNull();
  });
});
