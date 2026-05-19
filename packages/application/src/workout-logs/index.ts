import type { WorkoutLogRepository } from '@workout-tracker/domain';
import { makeGetExerciseHistory } from './get-exercise-history';
import { makeListWorkoutLogSummaries } from './list-summaries';

export function makeWorkoutLogApp(repository: WorkoutLogRepository) {
  return {
    getExerciseHistory: makeGetExerciseHistory(repository),
    listSummaries: makeListWorkoutLogSummaries(repository),
  };
}

export * from './get-exercise-history';
export * from './list-summaries';
