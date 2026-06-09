import type {
  WorkoutLogDetail,
  WorkoutLogDetailExercise,
  WorkoutLogDetailSet,
} from '@/features/workout-logs/api/workout-logs';
import {
  formatSetValue,
  groupDetailExercises,
  summarizeDetail,
} from '@/features/workout-logs/lib/detail-format';

const set = (overrides: Partial<WorkoutLogDetailSet> = {}): WorkoutLogDetailSet => ({
  setOrder: 0,
  roundOrder: 0,
  setType: 'normal',
  measurementType: 'weight_reps',
  weightKg: 80,
  reps: 8,
  repsMin: null,
  repsMax: null,
  durationSeconds: null,
  distanceMeters: null,
  ...overrides,
});

const exercise = (overrides: Partial<WorkoutLogDetailExercise> = {}): WorkoutLogDetailExercise => ({
  variationId: 'v-1',
  exerciseName: 'Bench Press',
  variationName: 'Barbell',
  exerciseType: 'strength',
  position: 0,
  supersetGroupId: 'g-standalone',
  note: null,
  restSeconds: null,
  sets: [set()],
  ...overrides,
});

describe('formatSetValue', () => {
  test('weight + reps', () => {
    expect(formatSetValue(set({ weightKg: 80.5, reps: 8 }), 'en')).toBe('80.5 kg × 8');
  });

  test('reps only', () => {
    expect(formatSetValue(set({ measurementType: 'reps', weightKg: null, reps: 12 }), 'en')).toBe(
      '12',
    );
  });

  test('duration only', () => {
    expect(
      formatSetValue(
        set({ measurementType: 'duration', weightKg: null, reps: null, durationSeconds: 45 }),
        'en',
      ),
    ).toBe('00:45');
  });
});

describe('summarizeDetail', () => {
  const detail: WorkoutLogDetail = {
    workoutLogId: 'log-1',
    userId: 'user-1',
    title: 'Fullbody',
    startedAt: '2026-05-08T14:00:00Z',
    finishedAt: '2026-05-08T14:30:00Z',
    note: null,
    sessionRecords: [],
    exercises: [
      exercise({
        sets: [set({ setType: 'warmup', weightKg: 40, reps: 10 }), set({ weightKg: 80, reps: 8 })],
      }),
      exercise({ exerciseType: 'preparatory', sets: [set({ weightKg: 100, reps: 5 })] }),
    ],
  };

  test('computes duration from started/finished', () => {
    expect(summarizeDetail(detail, false).durationSeconds).toBe(1800);
  });

  test('excludes warmups and preparatory from volume by default', () => {
    const { totalSets, totalVolumeKg } = summarizeDetail(detail, false);
    expect(totalSets).toBe(1);
    expect(totalVolumeKg).toBe(640);
  });

  test('includes warmups when preference is on', () => {
    const { totalSets, totalVolumeKg } = summarizeDetail(detail, true);
    expect(totalSets).toBe(2);
    expect(totalVolumeKg).toBe(640 + 400);
  });
});

describe('groupDetailExercises', () => {
  test('emits a superset when 2+ exercises share a supersetGroupId', () => {
    const items = groupDetailExercises([
      exercise({ position: 0, supersetGroupId: 'ss', variationId: 'a' }),
      exercise({ position: 1, supersetGroupId: 'ss', variationId: 'b' }),
      exercise({ position: 2, supersetGroupId: 'single', variationId: 'c' }),
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: 'superset', key: 'ss' });
    expect(items[0].kind === 'superset' && items[0].members).toHaveLength(2);
    expect(items[1]).toMatchObject({ kind: 'single' });
  });

  test('treats a lone shared id and null ids as singles', () => {
    const items = groupDetailExercises([
      exercise({ position: 0, supersetGroupId: 'lone', variationId: 'a' }),
      exercise({ position: 1, supersetGroupId: null, variationId: 'b' }),
    ]);

    expect(items).toHaveLength(2);
    expect(items.every((i) => i.kind === 'single')).toBe(true);
  });
});
