import { describe, expect, test } from 'bun:test';
import { type DetailRow, toWorkoutLogDetail } from './supabase-workout-logs-detail-mapper';

const baseRow: DetailRow = {
  id: 'log-1',
  user_id: 'user-1',
  started_at: '2026-05-08T14:00:00Z',
  finished_at: '2026-05-08T14:56:00Z',
  note: 'great session',
  workout: { name: 'Fullbody' },
  workout_log_summaries: { summary_snapshot: { sessionRecords: [{ variationId: 'v-1' }] } },
  workout_exercise_logs: [
    {
      variation_id: 'v-2',
      exercise_type: 'strength',
      position: 1,
      superset_group_id: 'v-2',
      note: 'felt strong',
      rest_seconds: 90,
      exercise_name: null,
      variation_name: null,
      variation: { name: 'Barbell', exercise_name: 'Bench Press' },
      workout_exercise_set_logs: [
        {
          set_order: 1,
          round_order: 1,
          set_type: 'normal',
          measurement_type: 'weight_reps',
          weight_kg: '80.5',
          reps: 8,
          reps_min: 6,
          reps_max: 10,
          duration_seconds: null,
          distance_meters: null,
        },
        {
          set_order: 0,
          round_order: 0,
          set_type: 'warmup',
          measurement_type: 'weight_reps',
          weight_kg: 40,
          reps: 12,
          reps_min: null,
          reps_max: null,
          duration_seconds: null,
          distance_meters: null,
        },
      ],
    },
    {
      variation_id: 'v-1',
      exercise_type: 'preparatory',
      position: 0,
      superset_group_id: 'v-1',
      note: null,
      rest_seconds: null,
      exercise_name: 'Cat Cow',
      variation_name: null,
      variation: null,
      workout_exercise_set_logs: null,
    },
  ],
};

describe('toWorkoutLogDetail', () => {
  test('maps the full log, sorting exercises by position and sets by round/order', () => {
    const detail = toWorkoutLogDetail(baseRow);

    expect(detail.workoutLogId).toBe('log-1');
    expect(detail.userId).toBe('user-1');
    expect(detail.title).toBe('Fullbody');
    expect(detail.note).toBe('great session');
    expect(detail.sessionRecords).toEqual([{ variationId: 'v-1' }]);

    expect(detail.exercises.map((e) => e.position)).toEqual([0, 1]);

    const prep = detail.exercises[0];
    expect(prep.exerciseType).toBe('preparatory');
    expect(prep.exerciseName).toBe('Cat Cow');
    expect(prep.sets).toEqual([]);

    const strength = detail.exercises[1];
    expect(strength.exerciseName).toBe('Bench Press');
    expect(strength.variationName).toBe('Barbell');
    expect(strength.note).toBe('felt strong');
    expect(strength.restSeconds).toBe(90);
    expect(strength.sets.map((s) => s.roundOrder)).toEqual([0, 1]);
    expect(strength.sets[1].weightKg).toBe(80.5);
    expect(strength.sets[1].repsMin).toBe(6);
    expect(strength.sets[1].repsMax).toBe(10);
  });

  test('falls back to snapshot workout name and empty session records', () => {
    const detail = toWorkoutLogDetail({
      ...baseRow,
      workout: null,
      workout_log_summaries: { summary_snapshot: { workoutName: 'Snapshot Name' } },
    });

    expect(detail.title).toBe('Snapshot Name');
    expect(detail.sessionRecords).toEqual([]);
  });

  test('returns null title when no workout name is available', () => {
    const detail = toWorkoutLogDetail({
      ...baseRow,
      workout: null,
      workout_log_summaries: null,
    });

    expect(detail.title).toBeNull();
  });
});
