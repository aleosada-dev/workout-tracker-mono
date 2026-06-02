import type {
  CreateWorkoutLogInput,
  CreateWorkoutLogResult,
  WorkoutLogRepository,
} from '@workout-tracker/domain';

export type CreateWorkoutLog = (input: CreateWorkoutLogInput) => Promise<CreateWorkoutLogResult>;

export function makeCreateWorkoutLog(repository: WorkoutLogRepository): CreateWorkoutLog {
  return async (input) => repository.create(input);
}
