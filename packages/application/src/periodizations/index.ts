import type {
  PeriodizationAdjustmentRepository,
  PeriodizationOccurrenceRepository,
  WorkoutRepository,
} from '@workout-tracker/domain';
import { makeGetOccurrenceWorkout } from './get-occurrence-workout';
import { makeListOccurrences } from './list-occurrences';
import { makeUpdateOccurrenceStatus } from './update-occurrence-status';

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
    updateOccurrenceStatus: makeUpdateOccurrenceStatus(occurrenceRepository),
  };
}

export * from './get-occurrence-workout';
export * from './list-occurrences';
export * from './update-occurrence-status';
