import type {
  ExerciseListItem,
  ExerciseRepository,
  ListExercisesFilter,
} from '@workout-tracker/domain';

export type ListExercises = (filter: ListExercisesFilter) => Promise<ExerciseListItem[]>;

export function makeListExercises(repository: ExerciseRepository): ListExercises {
  return async (filter) => repository.list(filter);
}
