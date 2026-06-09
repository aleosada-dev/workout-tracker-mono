import type {
  CompletedExecution,
  CompletedExercise,
  CompletedSet,
} from '@/features/workouts/lib/completed-execution';
import { buildCreateWorkoutLogRequest } from './create-workout-log-request';

function completedSet(overrides: Partial<CompletedSet> = {}): CompletedSet {
  return {
    id: 'set-1',
    type: 'normal',
    measurementType: 'weight_reps',
    roundOrder: 0,
    weightKg: 80,
    reps: 10,
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
    supersetGroupId: '11111111-1111-1111-1111-111111111111',
    supersetOrder: 0,
    note: null,
    restSeconds: 90,
    aliasId: null,
    variation: {
      id: '22222222-2222-2222-2222-222222222222',
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
  };
}

function execution(exercises: CompletedExercise[]): CompletedExecution {
  return { exercises };
}

const base = {
  workoutId: '33333333-3333-3333-3333-333333333333',
  userId: null,
  startedAt: '2026-06-02T10:00:00.000Z',
  finishedAt: '2026-06-02T11:00:00.000Z',
  note: null,
  isCoached: false,
  coachSessionId: null,
  periodizationOccurrenceId: null,
};

describe('buildCreateWorkoutLogRequest', () => {
  test('maps the completed execution to the API request shape', () => {
    const request = buildCreateWorkoutLogRequest({
      ...base,
      execution: execution([
        completedExercise([completedSet({ id: 'a', repsMin: 8, repsMax: 12 })]),
      ]),
    });

    expect(request).toEqual({
      workoutId: '33333333-3333-3333-3333-333333333333',
      userId: null,
      startedAt: '2026-06-02T10:00:00.000Z',
      finishedAt: '2026-06-02T11:00:00.000Z',
      note: null,
      isCoached: false,
      coachSessionId: null,
      periodizationOccurrenceId: null,
      exercises: [
        {
          variationId: '22222222-2222-2222-2222-222222222222',
          aliasId: null,
          exerciseType: 'strength',
          position: 0,
          note: null,
          restSeconds: 90,
          supersetGroupId: '11111111-1111-1111-1111-111111111111',
          sets: [
            {
              setOrder: 0,
              roundOrder: 0,
              setType: 'normal',
              measurementType: 'weight_reps',
              weightKg: 80,
              reps: 10,
              repsMin: 8,
              repsMax: 12,
              durationSeconds: null,
            },
          ],
        },
      ],
    });
  });

  test('passes the selected aliasId per exercise', () => {
    const request = buildCreateWorkoutLogRequest({
      ...base,
      execution: execution([
        completedExercise([completedSet()], { aliasId: '44444444-4444-4444-4444-444444444444' }),
      ]),
    });

    expect(request.exercises[0].aliasId).toBe('44444444-4444-4444-4444-444444444444');
  });

  test('assigns setOrder by position within the exercise', () => {
    const request = buildCreateWorkoutLogRequest({
      ...base,
      execution: execution([
        completedExercise([
          completedSet({ id: 'a' }),
          completedSet({ id: 'b' }),
          completedSet({ id: 'c' }),
        ]),
      ]),
    });

    expect(request.exercises[0].sets.map((s) => s.setOrder)).toEqual([0, 1, 2]);
  });

  test('trims notes and nulls out blank ones', () => {
    const request = buildCreateWorkoutLogRequest({
      ...base,
      note: '  great session  ',
      execution: execution([completedExercise([completedSet()], { note: '   ' })]),
    });

    expect(request.note).toBe('great session');
    expect(request.exercises[0].note).toBeNull();
  });
});
