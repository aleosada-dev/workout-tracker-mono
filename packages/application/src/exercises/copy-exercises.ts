import type {
  CopyExercisesInput,
  CopyExercisesResult,
  ExerciseRepository,
} from '@workout-tracker/domain';

export type CopyExercises = (input: CopyExercisesInput) => Promise<CopyExercisesResult>;

export function makeCopyExercises(repository: ExerciseRepository): CopyExercises {
  return async (input) => repository.copyExercises(input);
}
