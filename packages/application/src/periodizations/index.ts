import type {
  PeriodizationAdjustmentRepository,
  PeriodizationOccurrenceRepository,
  WorkoutRepository,
} from '@workout-tracker/domain';
import { makeGetOccurrenceWorkout } from './get-occurrence-workout';
import { makeListOccurrences } from './list-occurrences';

export function makePeriodizationApp(
  occurrenceRepository: PeriodizationOccurrenceRepository,
  adjustmentRepository: PeriodizationAdjustmentRepository,
  workoutRepository: WorkoutRepository,
) {
  return {
    listOccurrences: makeListOccurrences(occurrenceRepository),
    getOccurrenceWorkout: makeGetOccurrenceWorkout({
      occurrenceRepository,
      adjustmentRepository,
      workoutRepository,
    }),
  };
}

export * from './get-occurrence-workout';
export * from './list-occurrences';
