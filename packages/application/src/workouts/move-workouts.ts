import type { MoveWorkoutsInput, WorkoutRepository } from '@workout-tracker/domain';

export type MoveWorkouts = (input: MoveWorkoutsInput) => Promise<{ movedIds: string[] }>;

export function makeMoveWorkouts(repository: WorkoutRepository): MoveWorkouts {
  return async (input) => repository.moveWorkouts(input);
}
