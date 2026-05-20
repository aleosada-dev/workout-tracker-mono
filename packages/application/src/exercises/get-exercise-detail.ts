import type {
  ExerciseDetail,
  ExerciseRepository,
  GetExerciseDetailFilter,
} from '@workout-tracker/domain';

export type GetExerciseHistory = (filter: GetExerciseDetailFilter) => Promise<ExerciseDetail>;

export function makeGetExerciseDetail(repository: ExerciseRepository): GetExerciseHistory {
  return async (filter) => repository.getExerciseDetail(filter);
}
