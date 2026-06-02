import type { CreateWorkoutLogInput, CreateWorkoutLogResult } from './workout-log-create';
import type { GetLastWorkoutLogFilter, GetLastWorkoutLogResult } from './workout-log-last';
import type { ListWorkoutLogSummariesFilter, WorkoutLogSummaryPage } from './workout-log-summary';

export interface WorkoutLogRepository {
  listSummaries(filter: ListWorkoutLogSummariesFilter): Promise<WorkoutLogSummaryPage>;
  getLast(filter: GetLastWorkoutLogFilter): Promise<GetLastWorkoutLogResult>;
  create(input: CreateWorkoutLogInput): Promise<CreateWorkoutLogResult>;
}
