import type {
  ListWorkoutLogSummariesFilter,
  WorkoutLogRepository,
  WorkoutLogSummaryPage,
} from '@workout-tracker/domain';

export type ListWorkoutLogSummaries = (
  filter: ListWorkoutLogSummariesFilter,
) => Promise<WorkoutLogSummaryPage>;

export function makeListWorkoutLogSummaries(
  repository: WorkoutLogRepository,
): ListWorkoutLogSummaries {
  return async (filter) => repository.listSummaries(filter);
}
