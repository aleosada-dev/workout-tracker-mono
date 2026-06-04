import type {
  GetWorkoutLogFilter,
  GetWorkoutLogResult,
  WorkoutLogRepository,
} from '@workout-tracker/domain';

export type GetWorkoutLog = (filter: GetWorkoutLogFilter) => Promise<GetWorkoutLogResult>;

export function makeGetWorkoutLog(repository: WorkoutLogRepository): GetWorkoutLog {
  return async (filter) => repository.getById(filter);
}
