import type { WorkoutLogRepository } from '@workout-tracker/domain';
import { makeListWorkoutLogSummaries } from './list-summaries';

export function makeWorkoutLogApp(repository: WorkoutLogRepository) {
  return {
    listSummaries: makeListWorkoutLogSummaries(repository),
  };
}

export * from './list-summaries';
