import type { GetWorkoutInput, WorkoutDetail, WorkoutRepository } from '@workout-tracker/domain';

export type GetWorkout = (input: GetWorkoutInput) => Promise<WorkoutDetail | null>;

export function makeGetWorkout(repository: WorkoutRepository): GetWorkout {
  return async (input) => repository.getWorkout(input);
}
