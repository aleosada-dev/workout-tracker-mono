import type { ListWorkoutsFilter, Workout, WorkoutRepository } from '@workout-tracker/domain';

export type ListWorkouts = (filter: ListWorkoutsFilter) => Promise<Workout[]>;

export function makeListWorkouts(repository: WorkoutRepository): ListWorkouts {
  return async (filter) => repository.listWorkouts(filter);
}
