import type { DeleteWorkoutsInput, ListWorkoutsFilter, Workout } from './workout';

export interface WorkoutRepository {
  listWorkouts(filter: ListWorkoutsFilter): Promise<Workout[]>;
  deleteWorkouts(input: DeleteWorkoutsInput): Promise<{ deletedIds: string[] }>;
}
