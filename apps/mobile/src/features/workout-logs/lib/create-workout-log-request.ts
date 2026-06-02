import type { CreateWorkoutLogRequest } from '@/features/workout-logs/api/workout-logs';
import type { CompletedExecution } from '@/features/workouts/lib/completed-execution';

function normalizeNote(note: string | null): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}

export function buildCreateWorkoutLogRequest(input: {
  workoutId: string | null;
  userId: string | null;
  startedAt: string;
  finishedAt: string;
  note: string | null;
  isCoached: boolean;
  coachSessionId: string | null;
  execution: CompletedExecution;
}): CreateWorkoutLogRequest {
  return {
    workoutId: input.workoutId,
    userId: input.userId,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    note: normalizeNote(input.note),
    isCoached: input.isCoached,
    coachSessionId: input.coachSessionId,
    exercises: input.execution.exercises.map((exercise) => ({
      variationId: exercise.variation.id,
      exerciseType: exercise.exerciseType,
      position: exercise.position,
      note: normalizeNote(exercise.note),
      restSeconds: exercise.restSeconds,
      supersetGroupId: exercise.supersetGroupId,
      sets: exercise.sets.map((set, index) => ({
        setOrder: index,
        setType: set.type,
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
