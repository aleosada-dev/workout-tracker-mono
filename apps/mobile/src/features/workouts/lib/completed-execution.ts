import {
  type MeasurementType,
  setVolume,
  type WorkoutExerciseType,
  type WorkoutSetType,
} from '@workout-tracker/domain';
import type { ExecutionExerciseVariation, ExecutionFormValues } from './execution-form';

export type CompletedSet = {
  id: string;
  type: WorkoutSetType;
  measurementType: MeasurementType;
  weightKg: number | null;
  reps: number | null;
  repsMin: number | null;
  repsMax: number | null;
  durationSeconds: number | null;
};

export type CompletedExercise = {
  id: string;
  exerciseType: WorkoutExerciseType;
  position: number;
  supersetGroupId: string;
  supersetOrder: number;
  note: string | null;
  restSeconds: number | null;
  variation: ExecutionExerciseVariation;
  sets: CompletedSet[];
};

export type CompletedExecution = {
  exercises: CompletedExercise[];
};

export function buildCompletedExecution(values: ExecutionFormValues): CompletedExecution {
  return {
    exercises: values.exercises
      .map((exercise) => ({
        id: exercise.id,
        exerciseType: exercise.exerciseType,
        position: exercise.position,
        supersetGroupId: exercise.supersetGroupId,
        supersetOrder: exercise.supersetOrder,
        note: exercise.note,
        restSeconds: exercise.restSeconds,
        variation: exercise.variation,
        sets: exercise.sets
          .filter((set) => set.done)
          .map((set) => ({
            id: set.id,
            type: set.type,
            measurementType: set.measurementType,
            weightKg: set.kg ?? null,
            reps: set.reps ?? null,
            repsMin: set.repsMin,
            repsMax: set.repsMax,
            durationSeconds: set.duration ?? null,
          })),
      }))
      .filter((exercise) => exercise.sets.length > 0),
  };
}

export type ExecutionSummary = {
  completedSets: number;
  totalVolumeKg: number;
};

export function summarizeExecution(
  execution: CompletedExecution,
  includeWarmup = false,
): ExecutionSummary {
  let completedSets = 0;
  let totalVolumeKg = 0;

  for (const exercise of execution.exercises) {
    if (exercise.exerciseType === 'preparatory') continue;
    for (const set of exercise.sets) {
      if (!includeWarmup && set.type === 'warmup') continue;
      completedSets += 1;
      totalVolumeKg += setVolume({ weight: set.weightKg, reps: set.reps });
    }
  }

  return { completedSets, totalVolumeKg };
}
