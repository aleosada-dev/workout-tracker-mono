import { describe, expect, test } from 'bun:test';
import type { UpsertWorkoutInput } from '@workout-tracker/domain';
import { toUpsertWorkoutPayload } from './supabase-workouts-upsert-mapper';

function setInput(id: string) {
  return {
    id,
    setOrder: 0,
    setType: 'normal' as const,
    repsMin: 8,
    repsMax: 10,
    durationSeconds: null,
    distanceMeters: null,
    roundOrder: 0,
    linkedSetId: null,
    loadPercentOfPrevious: null,
  };
}

function baseInput(
  alternative: UpsertWorkoutInput['exercises'][number]['alternative'],
): UpsertWorkoutInput {
  return {
    workoutId: 'w1',
    userId: 'u1',
    name: 'W',
    description: null,
    folderId: null,
    exercises: [
      {
        id: 'p1',
        variationId: 'vp',
        exerciseType: 'strength',
        position: 0,
        supersetGroupId: 'p1',
        supersetOrder: 0,
        note: null,
        restSeconds: null,
        sets: [setInput('ps')],
        alternative,
      },
    ],
  };
}

describe('toUpsertWorkoutPayload', () => {
  test('emits alternative: null when there is no alternative', () => {
    const payload = toUpsertWorkoutPayload(baseInput(null));
    expect(payload.exercises[0].alternative).toBeNull();
  });

  test('emits the alternative with its own variation and mapped sets', () => {
    const payload = toUpsertWorkoutPayload(
      baseInput({
        id: 'a1',
        variationId: 'va',
        note: null,
        restSeconds: 90,
        sets: [setInput('as')],
      }),
    );
    expect(payload.exercises[0].alternative?.variationId).toBe('va');
    expect(payload.exercises[0].alternative?.sets[0].id).toBe('as');
    expect(payload.exercises[0].alternative?.sets[0].setOrder).toBe(0);
  });
});
