import type {
  ExerciseMeasurementType,
  WorkoutLogLast,
  WorkoutLogLastExercise,
  WorkoutLogLastSet,
  WorkoutSetType,
} from '@workout-tracker/domain';
import { pickOne, type Relation } from '../supabase/relation';

export type LastLogRow = {
  id: string;
  workout_id: string;
  started_at: string;
  finished_at: string;
  workout_exercise_logs: Array<{
    variation_id: string | null;
    exercise_type: string;
    position: number;
    superset_group_id: string | null;
    exercise_name: string | null;
    variation_name: string | null;
    variation: Relation<{
      name: string | null;
      exercise_name: string | null;
      measurement_type: string | null;
    }>;
    workout_exercise_set_logs: Array<{
      set_order: number;
      set_type: string;
      weight_kg: number | string | null;
      reps: number | null;
      duration_seconds: number | null;
      distance_meters: number | null;
    }> | null;
  }> | null;
};

const toNumber = (value: number | string | null): number | null => {
  if (value === null) return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
};

const toSet = (
  row: NonNullable<LastLogRow['workout_exercise_logs']>[number]['workout_exercise_set_logs'] extends
    | (infer U)[]
    | null
    ? U
    : never,
): WorkoutLogLastSet => ({
  setOrder: row.set_order,
  setType: row.set_type as WorkoutSetType,
  weightKg: toNumber(row.weight_kg),
  reps: row.reps,
  durationSeconds: row.duration_seconds,
  distanceMeters: row.distance_meters,
});

const toExercise = (
  row: NonNullable<LastLogRow['workout_exercise_logs']>[number],
): WorkoutLogLastExercise => {
  const variation = pickOne(row.variation);
  const sets = (row.workout_exercise_set_logs ?? [])
    .slice()
    .sort((a, b) => a.set_order - b.set_order)
    .map(toSet);

  return {
    variationId: row.variation_id,
    exerciseName: variation?.exercise_name ?? row.exercise_name,
    variationName: variation?.name ?? row.variation_name,
    measurementType: (variation?.measurement_type ?? 'weight_reps') as ExerciseMeasurementType,
    position: row.position,
    supersetGroupId: row.superset_group_id,
    sets,
  };
};

export function toWorkoutLogLast(row: LastLogRow): WorkoutLogLast {
  const exercises = (row.workout_exercise_logs ?? [])
    .filter((exercise) => exercise.exercise_type === 'strength')
    .sort((a, b) => a.position - b.position)
    .map(toExercise);

  return {
    workoutLogId: row.id,
    workoutId: row.workout_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    exercises,
  };
}
