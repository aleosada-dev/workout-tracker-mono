import type { TFunction } from 'i18next';
import {
  composeExerciseName,
  resolveExerciseName,
  resolveVariationName,
} from '@/features/exercises/lib/format';
import type { WorkoutResponse } from '@/features/workouts/api/workouts';
import type { WorkoutCardData } from '@/features/workouts/components/WorkoutCard';
import type { ExecutionFormInput } from '@/features/workouts/lib/execution-form';

export function toWorkoutCardData(workout: WorkoutResponse): WorkoutCardData {
  return {
    id: workout.id,
    name: workout.name,
    exerciseCount: workout.exerciseCount,
    topExercises: workout.topExercises,
    lastPerformedAt: workout.lastPerformedAt,
  };
}

export type ExerciseExecutionItem = {
  id: string;
  exerciseIndex: number;
  variationId: string;
  name: string;
  variationName: string | null;
  note: string | null;
  restSeconds: number | null;
};

export function formatSetTarget(repsMin: number | null, repsMax: number | null): string {
  if (repsMin == null || repsMax == null) return '';
  return repsMin === repsMax ? `${repsMin}` : `${repsMin}-${repsMax}`;
}

export function toExerciseExecutionItems(
  exercises: ExecutionFormInput['exercises'],
  type: 'preparatorio' | 'musculacao',
  t: TFunction,
  language: string,
): ExerciseExecutionItem[] {
  return exercises
    .map((exercise, exerciseIndex) => ({ exercise, exerciseIndex }))
    .filter(({ exercise }) => exercise.variation.exercise.type === type)
    .map(({ exercise, exerciseIndex }) => {
      const { variation } = exercise;
      const name = composeExerciseName(
        {
          exerciseName: resolveExerciseName(variation.exercise.slug, variation.exercise.name, t),
          equipmentName: t(`equipment.${variation.equipment.slug}`),
          equipmentPreposition: variation.equipment.preposition,
        },
        language,
      );
      const variationName = resolveVariationName(variation.slug, variation.name, t);
      return {
        id: exercise.id,
        exerciseIndex,
        variationId: variation.id,
        name,
        variationName,
        note: exercise.note,
        restSeconds: exercise.restSeconds,
      };
    });
}
