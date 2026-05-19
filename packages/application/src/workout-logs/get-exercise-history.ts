import type {
  ExerciseHistory,
  GetExerciseHistoryFilter,
  WorkoutLogRepository,
} from '@workout-tracker/domain';

export type GetExerciseHistory = (filter: GetExerciseHistoryFilter) => Promise<ExerciseHistory>;

export function makeGetExerciseHistory(repository: WorkoutLogRepository): GetExerciseHistory {
  return async (filter) => repository.getExerciseHistory(filter);
}
