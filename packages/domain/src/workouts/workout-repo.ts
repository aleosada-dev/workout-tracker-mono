import type {
  CopyWorkoutsInput,
  DeleteWorkoutsInput,
  ListWorkoutsFilter,
  MoveWorkoutsInput,
  Workout,
} from './workout';

export interface WorkoutRepository {
  listWorkouts(filter: ListWorkoutsFilter): Promise<Workout[]>;
  deleteWorkouts(input: DeleteWorkoutsInput): Promise<{ deletedIds: string[] }>;
  moveWorkouts(input: MoveWorkoutsInput): Promise<{ movedIds: string[] }>;
  copyWorkouts(input: CopyWorkoutsInput): Promise<{ newWorkoutIds: string[] }>;
}
