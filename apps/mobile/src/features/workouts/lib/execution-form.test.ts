import type { WorkoutSetType } from '@workout-tracker/domain';
import type {
  GetWorkoutLastLogResponse,
  GetWorkoutResponse,
} from '@/features/workouts/api/workouts';
import {
  autofillFromLast,
  buildExecutionFromWorkout,
  type ExecutionSetInput,
  matchExecutionSetsToLog,
  matchExecutionSetsToTemplate,
  restTimerDuration,
} from '@/features/workouts/lib/execution-form';

type TemplateSet = GetWorkoutResponse['exercises'][number]['sets'][number];
type LogSet = NonNullable<GetWorkoutLastLogResponse>['exercises'][number]['sets'][number];

const VARIATION_A = '11111111-1111-1111-1111-111111111111';
const VARIATION_B = '22222222-2222-2222-2222-222222222222';

function templateSet(overrides: Partial<TemplateSet> & Pick<TemplateSet, 'id'>): TemplateSet {
  return {
    setType: 'normal',
    setOrder: 1,
    repsMin: 8,
    repsMax: 12,
    linkedSetId: null,
    loadPercentOfPrevious: null,
    logicalKey: 'normal-1',
    ...overrides,
  };
}

function logSet(overrides: Partial<LogSet> = {}): LogSet {
  return {
    setType: 'normal',
    setOrder: 1,
    weightKg: 60,
    reps: 10,
    logicalKey: 'normal-1',
    ...overrides,
  };
}

function workout(variationId: string, sets: TemplateSet[]): GetWorkoutResponse {
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
          equipment: { slug: 'barra', preposition: 'com' },
          muscle: { slug: 'chest' },
          secondaryMuscle: null,
        },
        sets,
      },
    ],
  } as GetWorkoutResponse;
}

function lastLog(variationId: string, sets: LogSet[]): GetWorkoutLastLogResponse {
  return {
    workoutLogId: 'log-1',
    workoutId: 'w1',
    startedAt: '2026-05-20T00:00:00Z',
    finishedAt: '2026-05-20T01:00:00Z',
    exercises: [
      {
        variationId,
        exerciseName: 'Supino',
        variationName: null,
        position: 0,
        supersetGroupId: null,
        sets,
      },
    ],
  } as GetWorkoutLastLogResponse;
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

  test('seeds last weight/reps from the matching log set (same variation, same logical key)', () => {
    const result = buildExecutionFromWorkout(
      workout(VARIATION_A, [templateSet({ id: 's1' })]),
      lastLog(VARIATION_A, [logSet({ weightKg: 72.5, reps: 9 })]),
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
      lastLog(VARIATION_A, [
        logSet({ setType: 'warmup', setOrder: 1, weightKg: 20, reps: 15 }),
        logSet({ setType: 'normal', setOrder: 2, weightKg: 80, reps: 8 }),
      ]),
    );

    const [warm, work] = result.exercises[0].sets;
    expect(warm.lastKg).toBe(20);
    expect(warm.lastReps).toBe(15);
    expect(work.lastKg).toBe(80);
    expect(work.lastReps).toBe(8);
  });

  test('does not seed when the log has a different variation', () => {
    const result = buildExecutionFromWorkout(
      workout(VARIATION_A, [templateSet({ id: 's1' })]),
      lastLog(VARIATION_B, [logSet({ weightKg: 99, reps: 5 })]),
    );

    expect(result.exercises[0].sets[0].lastKg).toBeNull();
    expect(result.exercises[0].sets[0].lastReps).toBeNull();
  });

  test('leaves unmatched template sets null when the log has fewer sets', () => {
    const result = buildExecutionFromWorkout(
      workout(VARIATION_A, [
        templateSet({ id: 's1', setType: 'normal', setOrder: 1 }),
        templateSet({ id: 's2', setType: 'normal', setOrder: 2 }),
      ]),
      lastLog(VARIATION_A, [logSet({ setType: 'normal', setOrder: 1, weightKg: 60, reps: 10 })]),
    );

    const [first, second] = result.exercises[0].sets;
    expect(first.lastKg).toBe(60);
    expect(second.lastKg).toBeNull();
    expect(second.lastReps).toBeNull();
  });
});

function execSet(id: string, type: WorkoutSetType): ExecutionSetInput {
  return { id, type, repsMin: null, repsMax: null, kg: '', reps: '', done: false };
}

describe('matchExecutionSetsToLog', () => {
  test('returns nulls when there are no log sets', () => {
    const result = matchExecutionSetsToLog([execSet('s1', 'normal')], undefined);

    expect(result).toEqual([{ lastKg: null, lastReps: null }]);
  });

  test('matches existing sets and leaves an added set null', () => {
    const logSets = [
      logSet({ setType: 'normal', setOrder: 1, weightKg: 60, reps: 10 }),
      logSet({ setType: 'normal', setOrder: 2, weightKg: 65, reps: 8 }),
    ];

    const afterAdd = matchExecutionSetsToLog(
      [execSet('s1', 'normal'), execSet('s2', 'normal'), execSet('s3', 'normal')],
      logSets,
    );

    expect(afterAdd).toEqual([
      { lastKg: 60, lastReps: 10 },
      { lastKg: 65, lastReps: 8 },
      { lastKg: null, lastReps: null },
    ]);
  });

  test('keeps matching after a set is removed', () => {
    const logSets = [
      logSet({ setType: 'normal', setOrder: 1, weightKg: 60, reps: 10 }),
      logSet({ setType: 'normal', setOrder: 2, weightKg: 65, reps: 8 }),
    ];

    const afterRemove = matchExecutionSetsToLog([execSet('s1', 'normal')], logSets);

    expect(afterRemove).toEqual([{ lastKg: 60, lastReps: 10 }]);
  });

  test('re-matches when a set type changes', () => {
    const logSets = [
      logSet({ setType: 'normal', setOrder: 1, weightKg: 60, reps: 10 }),
      logSet({ setType: 'normal', setOrder: 2, weightKg: 65, reps: 8 }),
    ];

    const afterRetype = matchExecutionSetsToLog(
      [execSet('s1', 'warmup'), execSet('s2', 'normal')],
      logSets,
    );

    expect(afterRetype).toEqual([
      { lastKg: null, lastReps: null },
      { lastKg: 60, lastReps: 10 },
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
      { repsMin: 8, repsMax: 12 },
      { repsMin: null, repsMax: null },
      { repsMin: 6, repsMax: 8 },
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
      { repsMin: 8, repsMax: 12 },
      { repsMin: null, repsMax: null },
      { repsMin: 6, repsMax: 8 },
      { repsMin: 6, repsMax: 8 },
    ]);
  });

  test('removing the first set realigns the remaining targets', () => {
    const result = matchExecutionSetsToTemplate(
      [execSet('s2', 'warmup'), execSet('s3', 'normal'), execSet('s4', 'normal')],
      TEMPLATE_SETS,
    );

    expect(result).toEqual([
      { repsMin: 8, repsMax: 12 },
      { repsMin: 6, repsMax: 8 },
      { repsMin: 6, repsMax: 8 },
    ]);
  });

  test('returns nulls when there is no template reference', () => {
    const result = matchExecutionSetsToTemplate([execSet('s1', 'normal')], undefined);

    expect(result).toEqual([{ repsMin: null, repsMax: null }]);
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
