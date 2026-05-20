import type { ListWorkoutLogSummariesFilter, WorkoutLogSummaryPage } from './workout-log-summary';

export interface WorkoutLogRepository {
  listSummaries(filter: ListWorkoutLogSummariesFilter): Promise<WorkoutLogSummaryPage>;
}
