import type { CreateExerciseInput, ExerciseRepository } from '@workout-tracker/domain';

export type CreateExercise = (input: CreateExerciseInput) => Promise<{ id: string }>;

export function makeCreateExercise(repository: ExerciseRepository): CreateExercise {
  return async (input) => repository.createExercise(input);
}
