import type {
  ExerciseLastSets,
  ExerciseRepository,
  GetExerciseLastSetsFilter,
} from '@workout-tracker/domain';

export type ListExerciseLastSets = (
  filter: GetExerciseLastSetsFilter,
) => Promise<ExerciseLastSets[]>;

export function makeListExerciseLastSets(repository: ExerciseRepository): ListExerciseLastSets {
  return async (filter) => repository.getLastSets(filter);
}
