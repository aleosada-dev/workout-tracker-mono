import type {
  ExerciseRepository,
  ListExerciseName,
  ListExerciseNamesFilter,
} from '@workout-tracker/domain';

export type ListExerciseNames = (filter: ListExerciseNamesFilter) => Promise<ListExerciseName[]>;

export function makeListExerciseNames(repository: ExerciseRepository): ListExerciseNames {
  return async (filter) => repository.listNames(filter);
}
