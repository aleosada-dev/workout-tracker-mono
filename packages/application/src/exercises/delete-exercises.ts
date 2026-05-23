import type {
  DeleteExercisesInput,
  DeleteExercisesResult,
  ExerciseRepository,
} from '@workout-tracker/domain';

export type DeleteExercises = (input: DeleteExercisesInput) => Promise<DeleteExercisesResult>;

export function makeDeleteExercises(repository: ExerciseRepository): DeleteExercises {
  return async (input) => repository.deleteExercises(input);
}
