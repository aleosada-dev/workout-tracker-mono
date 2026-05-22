import type { ExerciseRepository, UpdateExerciseInput } from '@workout-tracker/domain';

export type UpdateExercise = (input: UpdateExerciseInput) => Promise<{ id: string }>;

export function makeUpdateExercise(repository: ExerciseRepository): UpdateExercise {
  return async (input) => repository.updateExercise(input);
}
