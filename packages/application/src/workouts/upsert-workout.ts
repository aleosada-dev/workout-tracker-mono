import type { UpsertWorkoutInput, WorkoutRepository } from '@workout-tracker/domain';

export type UpsertWorkout = (input: UpsertWorkoutInput) => Promise<{ workoutId: string }>;

export function makeUpsertWorkout(repository: WorkoutRepository): UpsertWorkout {
  return async (input) => repository.upsertWorkout(input);
}
