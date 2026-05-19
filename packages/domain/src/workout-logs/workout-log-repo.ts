import type { ExerciseHistory, GetExerciseHistoryFilter } from './exercise-history';
import type { ListWorkoutLogSummariesFilter, WorkoutLogSummaryPage } from './workout-log-summary';

export interface WorkoutLogRepository {
  getExerciseHistory(filter: GetExerciseHistoryFilter): Promise<ExerciseHistory>;
  listSummaries(filter: ListWorkoutLogSummariesFilter): Promise<WorkoutLogSummaryPage>;
}
