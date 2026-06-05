import type { SoftDeleteWorkoutLogInput, WorkoutLogRepository } from '@workout-tracker/domain';

export type DeleteWorkoutLog = (input: SoftDeleteWorkoutLogInput) => Promise<void>;

export function makeDeleteWorkoutLog(repository: WorkoutLogRepository): DeleteWorkoutLog {
  return async (input) => repository.softDelete(input);
}
