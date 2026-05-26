import type { DeleteWorkoutsInput, WorkoutRepository } from '@workout-tracker/domain';

export type DeleteWorkouts = (input: DeleteWorkoutsInput) => Promise<{ deletedIds: string[] }>;

export function makeDeleteWorkouts(repository: WorkoutRepository): DeleteWorkouts {
  return async (input) => repository.deleteWorkouts(input);
}
