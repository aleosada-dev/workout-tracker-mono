import type { CreateWorkoutLogInput, CreateWorkoutLogResult } from './workout-log-create';
import type { SoftDeleteWorkoutLogInput } from './workout-log-delete';
import type { GetWorkoutLogFilter, GetWorkoutLogResult } from './workout-log-detail';
import type { GetLastWorkoutLogFilter, GetLastWorkoutLogResult } from './workout-log-last';
import type { ListWorkoutLogSummariesFilter, WorkoutLogSummaryPage } from './workout-log-summary';

export interface WorkoutLogRepository {
  listSummaries(filter: ListWorkoutLogSummariesFilter): Promise<WorkoutLogSummaryPage>;
  getLast(filter: GetLastWorkoutLogFilter): Promise<GetLastWorkoutLogResult>;
  getById(filter: GetWorkoutLogFilter): Promise<GetWorkoutLogResult>;
  create(input: CreateWorkoutLogInput): Promise<CreateWorkoutLogResult>;
  softDelete(input: SoftDeleteWorkoutLogInput): Promise<void>;
}
