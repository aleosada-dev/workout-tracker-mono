import type {
  MeasurementType,
  WorkoutExerciseType,
  WorkoutLogDetail,
  WorkoutLogDetailExercise,
  WorkoutLogDetailSet,
  WorkoutSetType,
} from '@workout-tracker/domain';
import { pickOne, type Relation } from '../supabase/relation';

export type DetailRow = {
  id: string;
  started_at: string;
  finished_at: string;
  note: string | null;
  workout: Relation<{ name: string | null }>;
  workout_log_summaries: Relation<{
    summary_snapshot: {
      workoutName?: string;
      sessionRecords?: unknown[];
    } | null;
  }>;
  workout_exercise_logs: Array<{
    variation_id: string | null;
    exercise_type: string;
    position: number;
    superset_group_id: string | null;
    note: string | null;
    rest_seconds: number | null;
    exercise_name: string | null;
    variation_name: string | null;
    variation: Relation<{
      name: string | null;
      exercise_name: string | null;
    }>;
    workout_exercise_set_logs: Array<{
      set_order: number;
      round_order: number;
      set_type: string;
      measurement_type: string;
      weight_kg: number | string | null;
      reps: number | null;
      reps_min: number | null;
      reps_max: number | null;
      duration_seconds: number | null;
    }> | null;
  }> | null;
};

const toNumber = (value: number | string | null): number | null => {
  if (value === null) return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
};

const toSet = (
  row: NonNullable<DetailRow['workout_exercise_logs']>[number]['workout_exercise_set_logs'] extends
    | (infer U)[]
    | null
    ? U
    : never,
): WorkoutLogDetailSet => ({
  setOrder: row.set_order,
  roundOrder: row.round_order,
  setType: row.set_type as WorkoutSetType,
  measurementType: row.measurement_type as MeasurementType,
  weightKg: toNumber(row.weight_kg),
  reps: row.reps,
  repsMin: row.reps_min,
  repsMax: row.reps_max,
  durationSeconds: row.duration_seconds,
});

const toExercise = (
  row: NonNullable<DetailRow['workout_exercise_logs']>[number],
): WorkoutLogDetailExercise => {
  const variation = pickOne(row.variation);
  const sets = (row.workout_exercise_set_logs ?? [])
    .slice()
    .sort((a, b) => a.round_order - b.round_order || a.set_order - b.set_order)
    .map(toSet);

  return {
    variationId: row.variation_id,
    exerciseName: variation?.exercise_name ?? row.exercise_name,
    variationName: variation?.name ?? row.variation_name,
    exerciseType: row.exercise_type as WorkoutExerciseType,
    position: row.position,
    supersetGroupId: row.superset_group_id,
    note: row.note,
    restSeconds: row.rest_seconds,
    sets,
  };
};

export function toWorkoutLogDetail(row: DetailRow): WorkoutLogDetail {
  const workout = pickOne(row.workout);
  const snapshot = pickOne(row.workout_log_summaries)?.summary_snapshot;

  const exercises = (row.workout_exercise_logs ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(toExercise);

  return {
    workoutLogId: row.id,
    title: workout?.name?.trim() || snapshot?.workoutName?.trim() || null,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    note: row.note,
    exercises,
    sessionRecords: snapshot?.sessionRecords ?? [],
  };
}
