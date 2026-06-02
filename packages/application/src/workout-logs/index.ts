import type { NotificationRepository, WorkoutLogRepository } from '@workout-tracker/domain';
import { makeCreateWorkoutLog } from './create';
import { makeGetLastWorkoutLog } from './get-last';
import { makeListWorkoutLogSummaries } from './list-summaries';

export function makeWorkoutLogApp(
  repository: WorkoutLogRepository,
  notifications: NotificationRepository,
) {
  return {
    listSummaries: makeListWorkoutLogSummaries(repository),
    getLast: makeGetLastWorkoutLog(repository),
    create: makeCreateWorkoutLog(repository, notifications),
  };
}

export * from './create';
export * from './get-last';
export * from './list-summaries';
