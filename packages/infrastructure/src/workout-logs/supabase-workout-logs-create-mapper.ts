import type { CreateWorkoutLogInput } from '@workout-tracker/domain';

/**
 * Maps the domain create input into the camelCase `payload` consumed by the
 * `wt_insert_workout_log` RPC (which reads `payload->>'...'` per field).
 */
export function toWorkoutLogCreatePayload(input: CreateWorkoutLogInput) {
  return {
    userId: input.userId,
    workoutId: input.workoutId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    note: input.note,
    isCoached: input.isCoached,
    coachSessionId: input.coachSessionId,
    periodizationOccurrenceId: input.periodizationOccurrenceId,
    exercises: input.exercises.map((exercise) => ({
      variationId: exercise.variationId,
      exerciseType: exercise.exerciseType,
      position: exercise.position,
      note: exercise.note,
      restSeconds: exercise.restSeconds,
      supersetGroupId: exercise.supersetGroupId,
      sets: exercise.sets.map((set) => ({
        setOrder: set.setOrder,
        roundOrder: set.roundOrder,
        setType: set.setType,
        measurementType: set.measurementType,
        weightKg: set.weightKg,
        reps: set.reps,
        repsMin: set.repsMin,
        repsMax: set.repsMax,
        durationSeconds: set.durationSeconds,
      })),
    })),
  };
}
