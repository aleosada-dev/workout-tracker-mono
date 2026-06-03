import type { OccurrenceKind, PeriodizationOccurrence } from '@workout-tracker/domain';

export type OccurrenceRow = {
  id: string;
  planned_date: string;
  cycle: number;
  kind: string | null;
  position_in_day: number;
  workout_id: string | null;
  cardio_program_id: string | null;
  workout: { name: string | null } | null;
  cardio_program: { name: string | null; duration_seconds: number | null } | null;
};

export type OccurrenceTargetRow = {
  id: string;
  periodization_id: string;
  cycle: number;
  position_in_day: number;
  workout_id: string | null;
  workout: { user_id: string } | null;
};

export const toOccurrence = (row: OccurrenceRow): PeriodizationOccurrence => {
  const kind: OccurrenceKind = row.kind === 'cardio' ? 'cardio' : 'workout';
  const name = (kind === 'cardio' ? row.cardio_program?.name : row.workout?.name)?.trim() ?? '';

  return {
    occurrenceId: row.id,
    kind,
    name,
    cycle: row.cycle,
    durationSeconds: kind === 'cardio' ? (row.cardio_program?.duration_seconds ?? null) : null,
    workoutId: row.workout_id,
    cardioProgramId: row.cardio_program_id,
    plannedDate: row.planned_date,
    positionInDay: row.position_in_day,
  };
};
