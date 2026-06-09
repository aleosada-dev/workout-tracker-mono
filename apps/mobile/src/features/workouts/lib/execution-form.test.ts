import type {
  ExerciseMeasurementType,
  MeasurementType,
  WorkoutSetType,
} from '@workout-tracker/domain';
import type { ExerciseLastSetsResponse } from '@/features/exercises/api/exercises';
import type { PickedExercise } from '@/features/exercises/state/exercise-picker-bridge';
import type { GetWorkoutResponse } from '@/features/workouts/api/workouts';
import {
  autofillFromLast,
  buildExecutionExerciseFromPicked,
  buildExecutionFromWorkout,
  type ExecutionSetInput,
  ExecutionSetSchema,
  matchExecutionSetsByLogicalKey,
  matchExecutionSetsToTemplate,
  restTimerDuration,
} from '@/features/workouts/lib/execution-form';

type TemplateSet = GetWorkoutResponse['exercises'][number]['sets'][number];
type LastSetRef = ExerciseLastSetsResponse[number]['buckets'][number]['sets'][number];

const VARIATION_A = '11111111-1111-1111-1111-111111111111';
const VARIATION_B = '22222222-2222-2222-2222-222222222222';

function templateSet(overrides: Partial<TemplateSet> & Pick<TemplateSet, 'id'>): TemplateSet {
  return {
    setType: 'normal',
    measurementType: 'weight_reps',
    setOrder: 1,
    repsMin: 8,
    repsMax: 12,
    durationSeconds: null,
    linkedSetId: null,
    loadPercent: null,
    loadPercentOfPrevious: null,
    roundOrder: 0,
    logicalKey: 'normal-1',
    ...overrides,
  };
}

function refSet(
  logicalKey: string,
  weightKg: number | null,
  reps: number | null,
  finishedAt = '2026-06-01T00:00:00Z',
): LastSetRef {
  return { logicalKey, weightKg, reps, finishedAt };
}

function workout(
  variationId: string,
  sets: TemplateSet[],
  measurementType: ExerciseMeasurementType = 'weight_reps',
): GetWorkoutResponse {
  return {
    id: 'w1',
    userId: 'u1',
    name: 'Treino',
    description: null,
    folderId: null,
    createdAt: '2026-05-30T00:00:00Z',
    updatedAt: '2026-05-30T00:00:00Z',
    exercises: [
      {
        id: 'ex-1',
        exerciseType: 'strength',
        position: 0,
        supersetGroupId: 'sg-1',
        supersetOrder: 0,
        note: null,
        restSeconds: null,
        variation: {
          id: variationId,
          slug: 'supino-reto',
          name: null,
          exercise: { slug: 'supino', name: 'Supino', type: 'musculacao' },
          measurementType,
          equipment: { slug: 'barra', preposition: 'com' },
          muscle: { slug: 'chest' },
          secondaryMuscle: null,
        },
        sets,
      },
    ],
  } as GetWorkoutResponse;
}

function lastSets(variationId: string, sets: LastSetRef[]): ExerciseLastSetsResponse {
  return [{ variationId, lastUsedAliasId: null, buckets: [{ aliasId: null, sets }] }];
}

describe('buildExecutionFromWorkout', () => {
  test('leaves lastKg/lastReps null when there is no last log', () => {
    const result = buildExecutionFromWorkout(workout(VARIATION_A, [templateSet({ id: 's1' })]));

    expect(result.exercises[0].sets[0].lastKg).toBeNull();
    expect(result.exercises[0].sets[0].lastReps).toBeNull();
    expect(result.exercises[0].sets[0].kg).toBe('');
    expect(result.exercises[0].sets[0].reps).toBe('');
  });

  test('carries the superset grouping fields through', () => {
    const result = buildExecutionFromWorkout(workout(VARIATION_A, [templateSet({ id: 's1' })]));

    expect(result.exercises[0].supersetGroupId).toBe('sg-1');
    expect(result.exercises[0].supersetOrder).toBe(0);
  });

  test('defensively coalesces a missing set type to normal', () => {
    const result = buildExecutionFromWorkout(
      workout(VARIATION_A, [
        templateSet({
          id: 's1',
          setType: null as unknown as TemplateSet['setType'],
          measurementType: 'duration',
          repsMin: null,
          repsMax: null,
          durationSeconds: 30,
        }),
      ]),
    );

    expect(result.exercises[0].sets[0].type).toBe('normal');
  });

  test('derives the set measurement type from the variation and keeps the duration target', () => {
    const result = buildExecutionFromWorkout(
      workout(
        VARIATION_A,
        [
          templateSet({
            id: 's1',
            repsMin: null,
            repsMax: null,
            durationSeconds: 30,
          }),
        ],
        'duration',
      ),
    );

    expect(result.exercises[0].sets[0].measurementType).toBe('duration');
    expect(result.exercises[0].sets[0].durationTarget).toBe(30);
  });

  test('seeds last weight/reps from the matching last set (same variation, same logical key)', () => {
    const result = buildExecutionFromWorkout(
      workout(VARIATION_A, [templateSet({ id: 's1' })]),
      lastSets(VARIATION_A, [refSet('normal-1', 72.5, 9)]),
    );

    expect(result.exercises[0].sets[0].lastKg).toBe(72.5);
    expect(result.exercises[0].sets[0].lastReps).toBe(9);
    // placeholders only — the editable fields stay empty
    expect(result.exercises[0].sets[0].kg).toBe('');
    expect(result.exercises[0].sets[0].reps).toBe('');
  });

  test('matches warmup and normal sets independently by logical key', () => {
    const result = buildExecutionFromWorkout(
      workout(VARIATION_A, [
        templateSet({ id: 'warm', setType: 'warmup', setOrder: 1 }),
        templateSet({ id: 'work', setType: 'normal', setOrder: 2 }),
      ]),
      lastSets(VARIATION_A, [refSet('warmup-1', 20, 15), refSet('normal-1', 80, 8)]),
    );

    const [warm, work] = result.exercises[0].sets;
    expect(warm.lastKg).toBe(20);
    expect(warm.lastReps).toBe(15);
    expect(work.lastKg).toBe(80);
    expect(work.lastReps).toBe(8);
  });

  test('does not seed when the last sets are for a different variation', () => {
    const result = buildExecutionFromWorkout(
      workout(VARIATION_A, [templateSet({ id: 's1' })]),
      lastSets(VARIATION_B, [refSet('normal-1', 99, 5)]),
    );

    expect(result.exercises[0].sets[0].lastKg).toBeNull();
    expect(result.exercises[0].sets[0].lastReps).toBeNull();
  });

  test('pre-selects the last used alias and seeds load from its bucket', () => {
    const result = buildExecutionFromWorkout(workout(VARIATION_A, [templateSet({ id: 's1' })]), [
      {
        variationId: VARIATION_A,
        lastUsedAliasId: 'alias-2',
        buckets: [
          { aliasId: 'alias-1', sets: [refSet('normal-1', 60, 12)] },
          { aliasId: 'alias-2', sets: [refSet('normal-1', 90, 6)] },
        ],
      },
    ]);

    expect(result.exercises[0].aliasId).toBe('alias-2');
    expect(result.exercises[0].sets[0].lastKg).toBe(90);
    expect(result.exercises[0].sets[0].lastReps).toBe(6);
  });

  test('keeps the last-used alias when it is still in the active list', () => {
    const result = buildExecutionFromWorkout(
      workout(VARIATION_A, [templateSet({ id: 's1' })]),
      [
        {
          variationId: VARIATION_A,
          lastUsedAliasId: 'alias-2',
          buckets: [{ aliasId: 'alias-2', sets: [refSet('normal-1', 90, 6)] }],
        },
      ],
      [{ id: 'alias-2' }],
    );

    expect(result.exercises[0].aliasId).toBe('alias-2');
    expect(result.exercises[0].sets[0].lastKg).toBe(90);
  });

  test('ignores a last-used alias absent from the active list (deleted) and seeds the most recent across all buckets', () => {
    const result = buildExecutionFromWorkout(
      workout(VARIATION_A, [templateSet({ id: 's1' })]),
      [
        {
          variationId: VARIATION_A,
          lastUsedAliasId: 'alias-deleted',
          buckets: [
            { aliasId: null, sets: [refSet('normal-1', 50, 10, '2026-05-20T00:00:00Z')] },
            { aliasId: 'alias-deleted', sets: [refSet('normal-1', 90, 6, '2026-06-01T00:00:00Z')] },
          ],
        },
      ],
      [{ id: 'alias-1' }],
    );

    // aliasId cai para null (alias deletado), mas o seed mescla todos os buckets
    // pelo set mais recente por slot — igual ao "tudo junto" da tela de detalhes.
    expect(result.exercises[0].aliasId).toBeNull();
    expect(result.exercises[0].sets[0].lastKg).toBe(90);
    expect(result.exercises[0].sets[0].lastReps).toBe(6);
  });

  test('with no alias selected, merges the most recent set per logical slot across buckets', () => {
    const result = buildExecutionFromWorkout(
      workout(VARIATION_A, [
        templateSet({ id: 's1', setType: 'normal', setOrder: 1 }),
        templateSet({ id: 's2', setType: 'normal', setOrder: 2 }),
      ]),
      [
        {
          variationId: VARIATION_A,
          lastUsedAliasId: null,
          buckets: [
            {
              aliasId: 'alias-1',
              sets: [
                refSet('normal-1', 60, 12, '2026-06-05T00:00:00Z'),
                refSet('normal-2', 55, 10, '2026-05-01T00:00:00Z'),
              ],
            },
            {
              aliasId: null,
              sets: [
                refSet('normal-1', 50, 10, '2026-05-10T00:00:00Z'),
                refSet('normal-2', 70, 8, '2026-06-04T00:00:00Z'),
              ],
            },
          ],
        },
      ],
    );

    const [first, second] = result.exercises[0].sets;
    expect(first.lastKg).toBe(60); // normal-1 mais recente veio do alias-1
    expect(second.lastKg).toBe(70); // normal-2 mais recente veio do bucket sem alias
  });

  test('defaults aliasId to null when the variation has no history', () => {
    const result = buildExecutionFromWorkout(workout(VARIATION_A, [templateSet({ id: 's1' })]));
    expect(result.exercises[0].aliasId).toBeNull();
  });

  test('leaves unmatched template sets null when fewer logical slots exist', () => {
    const result = buildExecutionFromWorkout(
      workout(VARIATION_A, [
        templateSet({ id: 's1', setType: 'normal', setOrder: 1 }),
        templateSet({ id: 's2', setType: 'normal', setOrder: 2 }),
      ]),
      lastSets(VARIATION_A, [refSet('normal-1', 60, 10)]),
    );

    const [first, second] = result.exercises[0].sets;
    expect(first.lastKg).toBe(60);
    expect(second.lastKg).toBeNull();
    expect(second.lastReps).toBeNull();
  });
});

function execSet(
  id: string,
  type: WorkoutSetType,
  measurementType: MeasurementType = 'weight_reps',
): ExecutionSetInput {
  return {
    id,
    type,
    measurementType,
    roundOrder: 0,
    repsMin: null,
    repsMax: null,
    durationTarget: null,
    kg: '',
    reps: '',
    duration: '',
    done: false,
  };
}

describe('matchExecutionSetsByLogicalKey', () => {
  test('returns nulls when there are no reference sets', () => {
    const result = matchExecutionSetsByLogicalKey([execSet('s1', 'normal')], undefined);

    expect(result).toEqual([{ lastKg: null, lastReps: null }]);
  });

  test('matches existing slots and leaves an added set null', () => {
    const reference = [refSet('normal-1', 60, 10), refSet('normal-2', 65, 8)];

    const afterAdd = matchExecutionSetsByLogicalKey(
      [execSet('s1', 'normal'), execSet('s2', 'normal'), execSet('s3', 'normal')],
      reference,
    );

    expect(afterAdd).toEqual([
      { lastKg: 60, lastReps: 10 },
      { lastKg: 65, lastReps: 8 },
      { lastKg: null, lastReps: null },
    ]);
  });

  test('keeps matching after a set is removed', () => {
    const reference = [refSet('normal-1', 60, 10), refSet('normal-2', 65, 8)];

    const afterRemove = matchExecutionSetsByLogicalKey([execSet('s1', 'normal')], reference);

    expect(afterRemove).toEqual([{ lastKg: 60, lastReps: 10 }]);
  });

  test('re-matches when a set type changes', () => {
    const reference = [refSet('normal-1', 60, 10), refSet('normal-2', 65, 8)];

    const afterRetype = matchExecutionSetsByLogicalKey(
      [execSet('s1', 'warmup'), execSet('s2', 'normal')],
      reference,
    );

    expect(afterRetype).toEqual([
      { lastKg: null, lastReps: null },
      { lastKg: 60, lastReps: 10 },
    ]);
  });

  test('matches each slot independently (last value per slot can come from any session)', () => {
    // normal-2 only exists in the reference (e.g. from an older session); it still
    // seeds the 2nd working set even though normal-1 came from a different session.
    const reference = [
      refSet('warmup-1', 20, 15),
      refSet('normal-1', 80, 8),
      refSet('normal-2', 75, 6),
    ];

    const result = matchExecutionSetsByLogicalKey(
      [execSet('w1', 'warmup'), execSet('s1', 'normal'), execSet('s2', 'normal')],
      reference,
    );

    expect(result).toEqual([
      { lastKg: 20, lastReps: 15 },
      { lastKg: 80, lastReps: 8 },
      { lastKg: 75, lastReps: 6 },
    ]);
  });
});

describe('matchExecutionSetsToTemplate', () => {
  const TEMPLATE_SETS = [
    templateSet({ id: 't1', setType: 'warmup', setOrder: 1, repsMin: 8, repsMax: 12 }),
    templateSet({ id: 't2', setType: 'normal', setOrder: 2, repsMin: 6, repsMax: 8 }),
    templateSet({ id: 't3', setType: 'normal', setOrder: 3, repsMin: 6, repsMax: 8 }),
  ];

  test('retyping the second set to warmup drops its target', () => {
    const result = matchExecutionSetsToTemplate(
      [execSet('s1', 'warmup'), execSet('s2', 'warmup'), execSet('s3', 'normal')],
      TEMPLATE_SETS,
    );

    expect(result).toEqual([
      { repsMin: 8, repsMax: 12, durationTarget: null },
      { repsMin: null, repsMax: null, durationTarget: null },
      { repsMin: 6, repsMax: 8, durationTarget: null },
    ]);
  });

  test('adding a normal set pulls the next template target', () => {
    const result = matchExecutionSetsToTemplate(
      [
        execSet('s1', 'warmup'),
        execSet('s2', 'warmup'),
        execSet('s3', 'normal'),
        execSet('s4', 'normal'),
      ],
      TEMPLATE_SETS,
    );

    expect(result).toEqual([
      { repsMin: 8, repsMax: 12, durationTarget: null },
      { repsMin: null, repsMax: null, durationTarget: null },
      { repsMin: 6, repsMax: 8, durationTarget: null },
      { repsMin: 6, repsMax: 8, durationTarget: null },
    ]);
  });

  test('removing the first set realigns the remaining targets', () => {
    const result = matchExecutionSetsToTemplate(
      [execSet('s2', 'warmup'), execSet('s3', 'normal'), execSet('s4', 'normal')],
      TEMPLATE_SETS,
    );

    expect(result).toEqual([
      { repsMin: 8, repsMax: 12, durationTarget: null },
      { repsMin: 6, repsMax: 8, durationTarget: null },
      { repsMin: 6, repsMax: 8, durationTarget: null },
    ]);
  });

  test('returns nulls when there is no template reference', () => {
    const result = matchExecutionSetsToTemplate([execSet('s1', 'normal')], undefined);

    expect(result).toEqual([{ repsMin: null, repsMax: null, durationTarget: null }]);
  });

  test('pulls the duration target for a duration template set', () => {
    const result = matchExecutionSetsToTemplate(
      [execSet('s1', 'normal', 'duration')],
      [
        templateSet({
          id: 't1',
          setOrder: 1,
          measurementType: 'duration',
          repsMin: null,
          repsMax: null,
          durationSeconds: 45,
        }),
      ],
    );

    expect(result).toEqual([{ repsMin: null, repsMax: null, durationTarget: 45 }]);
  });
});

describe('ExecutionSetSchema validation', () => {
  function rawSet(
    measurementType: MeasurementType,
    kg: string,
    reps: string,
    done = true,
    duration = '',
  ) {
    return {
      id: 's1',
      type: 'normal' as const,
      measurementType,
      roundOrder: 0,
      repsMin: null,
      repsMax: null,
      durationTarget: null,
      kg,
      reps,
      duration,
      done,
    };
  }

  test('weight_reps requires both kg and reps when done', () => {
    expect(ExecutionSetSchema.safeParse(rawSet('weight_reps', '80', '8')).success).toBe(true);
    expect(ExecutionSetSchema.safeParse(rawSet('weight_reps', '', '8')).success).toBe(false);
    expect(ExecutionSetSchema.safeParse(rawSet('weight_reps', '80', '')).success).toBe(false);
  });

  test('weight must be greater than zero when present', () => {
    expect(ExecutionSetSchema.safeParse(rawSet('weight_reps', '0', '8')).success).toBe(false);
  });

  test('reps requires reps but allows empty kg when done', () => {
    expect(ExecutionSetSchema.safeParse(rawSet('reps', '', '12')).success).toBe(true);
    expect(ExecutionSetSchema.safeParse(rawSet('reps', '', '')).success).toBe(false);
  });

  test('duration requires a duration value but not kg or reps when done', () => {
    expect(ExecutionSetSchema.safeParse(rawSet('duration', '', '', true, '60')).success).toBe(true);
    expect(ExecutionSetSchema.safeParse(rawSet('duration', '', '', true, '')).success).toBe(false);
    expect(ExecutionSetSchema.safeParse(rawSet('duration', '', '', true, '0')).success).toBe(false);
  });

  test('combo types fall back to requiring weight and reps when done', () => {
    expect(ExecutionSetSchema.safeParse(rawSet('weight_reps_duration', '', '')).success).toBe(
      false,
    );
    expect(
      ExecutionSetSchema.safeParse(rawSet('weight_reps_duration', '80', '8', true, '60')).success,
    ).toBe(true);
  });

  test('skips required-field validation for sets that are not done', () => {
    expect(ExecutionSetSchema.safeParse(rawSet('weight_reps', '', '', false)).success).toBe(true);
    expect(ExecutionSetSchema.safeParse(rawSet('reps', '', '', false)).success).toBe(true);
    expect(
      ExecutionSetSchema.safeParse(rawSet('weight_reps_duration', '', '', false)).success,
    ).toBe(true);
  });
});

describe('autofillFromLast', () => {
  test('returns the last value as a string when the field is empty', () => {
    expect(autofillFromLast('', 60)).toBe('60');
    expect(autofillFromLast('', 10)).toBe('10');
  });

  test('returns the last value when it is zero', () => {
    expect(autofillFromLast('', 0)).toBe('0');
  });

  test('returns null when the field already has a value', () => {
    expect(autofillFromLast('80', 60)).toBeNull();
    expect(autofillFromLast('0', 60)).toBeNull();
  });

  test('returns null when there is no last value', () => {
    expect(autofillFromLast('', null)).toBeNull();
    expect(autofillFromLast('', undefined)).toBeNull();
  });
});

describe('buildExecutionExerciseFromPicked', () => {
  function pickedExercise(
    type: 'forca' | 'preparatorio',
    overrides: Partial<PickedExercise['variation']> = {},
  ): PickedExercise {
    return {
      exercise: { slug: 'bench-press', name: 'Supino', type },
      variation: {
        id: VARIATION_A,
        slug: 'bench-press-barbell',
        name: 'Supino com barra',
        measurementType: 'weight_reps',
        equipment: { slug: 'barbell', preposition: 'com' },
        muscle: { slug: 'chest' },
        secondaryMuscle: { slug: 'triceps' },
        ...overrides,
      },
    } as PickedExercise;
  }

  function sequentialIds() {
    let n = 0;
    return () => {
      n += 1;
      return `id-${n}`;
    };
  }

  test('starts a new exercise with a single set that has no rep target', () => {
    const result = buildExecutionExerciseFromPicked(
      pickedExercise('forca'),
      0,
      sequentialIds(),
      'strength',
    );

    expect(result.sets).toHaveLength(1);
    expect(result.sets[0]).toMatchObject({
      repsMin: null,
      repsMax: null,
      durationTarget: null,
    });
  });

  test('places the exercise in the active section, ignoring its exercise type', () => {
    const strength = buildExecutionExerciseFromPicked(
      pickedExercise('preparatorio'),
      3,
      sequentialIds(),
      'strength',
    );
    expect(strength.exerciseType).toBe('strength');
    expect(strength.position).toBe(3);

    const preparatory = buildExecutionExerciseFromPicked(
      pickedExercise('forca'),
      0,
      sequentialIds(),
      'preparatory',
    );
    expect(preparatory.exerciseType).toBe('preparatory');
  });

  test('derives the seeded set measurement type from the variation', () => {
    const result = buildExecutionExerciseFromPicked(
      pickedExercise('forca', { measurementType: 'duration' }),
      0,
      sequentialIds(),
      'strength',
    );

    expect(result.variation.measurementType).toBe('duration');
    expect(result.sets[0].measurementType).toBe('duration');
  });

  test('uses the generated id as its own superset group anchor', () => {
    const result = buildExecutionExerciseFromPicked(
      pickedExercise('forca'),
      0,
      sequentialIds(),
      'strength',
    );

    expect(result.id).toBe('id-1');
    expect(result.supersetGroupId).toBe('id-1');
    expect(result.supersetOrder).toBe(0);
    expect(result.sets[0].id).toBe('id-2');
  });

  test('keeps secondaryMuscle null when the variation has none', () => {
    const result = buildExecutionExerciseFromPicked(
      pickedExercise('forca', { secondaryMuscle: null }),
      0,
      sequentialIds(),
      'strength',
    );

    expect(result.variation.secondaryMuscle).toBeNull();
  });
});

describe('restTimerDuration', () => {
  test('returns the rest seconds when a positive value is defined', () => {
    expect(restTimerDuration(90)).toBe(90);
    expect(restTimerDuration(1)).toBe(1);
  });

  test('returns null when there is no rest time', () => {
    expect(restTimerDuration(null)).toBeNull();
    expect(restTimerDuration(undefined)).toBeNull();
    expect(restTimerDuration(0)).toBeNull();
  });
});
