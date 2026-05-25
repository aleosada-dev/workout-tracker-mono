import type { ListWorkoutsFilter, Workout } from './workout';

export interface WorkoutRepository {
  listWorkouts(filter: ListWorkoutsFilter): Promise<Workout[]>;
}
