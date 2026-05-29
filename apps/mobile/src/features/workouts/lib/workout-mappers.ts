import type { TFunction } from 'i18next';
import {
  composeExerciseName,
  resolveExerciseName,
  resolveVariationName,
} from '@/features/exercises/lib/format';
import type { GetWorkoutResponse, WorkoutResponse } from '@/features/workouts/api/workouts';
import type { WorkoutCardData } from '@/features/workouts/components/WorkoutCard';

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
  setTargets: string[];
};

export function toExerciseExecutionItems(
  workout: GetWorkoutResponse,
  type: 'preparatorio' | 'musculacao',
  t: TFunction,
  language: string,
): ExerciseExecutionItem[] {
  return workout.exercises
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
      const setTargets = exercise.sets.map((set) =>
        set.repsMin === set.repsMax ? `${set.repsMin}` : `${set.repsMin}-${set.repsMax}`,
      );
      return {
        id: exercise.id,
        exerciseIndex,
        variationId: variation.id,
        name,
        variationName,
        setTargets,
      };
    });
}
