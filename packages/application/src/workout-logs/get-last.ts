import type {
  GetLastWorkoutLogFilter,
  GetLastWorkoutLogResult,
  WorkoutLogRepository,
} from '@workout-tracker/domain';

export type GetLastWorkoutLog = (
  filter: GetLastWorkoutLogFilter,
) => Promise<GetLastWorkoutLogResult>;

export function makeGetLastWorkoutLog(repository: WorkoutLogRepository): GetLastWorkoutLog {
  return async (filter) => repository.getLast(filter);
}
