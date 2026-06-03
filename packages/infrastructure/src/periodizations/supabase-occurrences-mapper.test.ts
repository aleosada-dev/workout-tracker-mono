import { describe, expect, test } from 'bun:test';
import { type OccurrenceRow, toOccurrence } from './supabase-occurrences-mapper';

const baseRow: OccurrenceRow = {
  id: 'occ-1',
  planned_date: '2026-06-03',
  cycle: 3,
  kind: 'workout',
  position_in_day: 0,
  workout_id: 'w-1',
  cardio_program_id: null,
  workout: { name: 'Upper 1' },
  cardio_program: null,
};

describe('toOccurrence', () => {
  test('maps a workout occurrence using the workout name and null duration', () => {
    expect(toOccurrence(baseRow)).toEqual({
      occurrenceId: 'occ-1',
      kind: 'workout',
      name: 'Upper 1',
      cycle: 3,
      durationSeconds: null,
      workoutId: 'w-1',
      cardioProgramId: null,
      plannedDate: '2026-06-03',
      positionInDay: 0,
    });
  });

  test('maps a cardio occurrence using the cardio program name and its duration', () => {
    const row: OccurrenceRow = {
      ...baseRow,
      kind: 'cardio',
      position_in_day: 1,
      workout_id: null,
      cardio_program_id: 'c-1',
      workout: null,
      cardio_program: { name: 'Esteira Z2', duration_seconds: 1200 },
    };

    expect(toOccurrence(row)).toMatchObject({
      kind: 'cardio',
      name: 'Esteira Z2',
      durationSeconds: 1200,
      cardioProgramId: 'c-1',
      workoutId: null,
    });
  });

  test('trims the name and falls back to an empty string when missing', () => {
    expect(toOccurrence({ ...baseRow, workout: { name: '  Upper 1  ' } }).name).toBe('Upper 1');
    expect(toOccurrence({ ...baseRow, workout: { name: null } }).name).toBe('');
    expect(toOccurrence({ ...baseRow, workout: null }).name).toBe('');
  });
});
