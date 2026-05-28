import type { TFunction } from 'i18next';
import {
  composeExerciseName,
  resolveExerciseName,
  resolveVariationName,
} from '@/features/exercises/lib/format';
import type { GetWorkoutResponse, WorkoutResponse } from '@/features/workouts/api/workouts';
import type { ExerciseExecutionSet } from '@/features/workouts/components/ExerciseExecutionCard';
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
  variationId: string;
  name: string;
  variationName: string | null;
  sets: ExerciseExecutionSet[];
};

export function toExerciseExecutionItems(
  workout: GetWorkoutResponse,
  type: 'preparatorio' | 'musculacao',
  t: TFunction,
  language: string,
): ExerciseExecutionItem[] {
  return workout.exercises
    .filter((exercise) => exercise.variation.exercise.type === type)
    .map((exercise) => {
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
      const sets: ExerciseExecutionSet[] = exercise.sets.map((set) => ({
        id: set.id,
        type: set.setType,
        kg: '',
        reps: '',
        target: set.repsMin === set.repsMax ? `${set.repsMin}` : `${set.repsMin}-${set.repsMax}`,
        done: false,
      }));
      return { id: exercise.id, variationId: variation.id, name, variationName, sets };
    });
}
