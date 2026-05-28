import type {
  CopyWorkoutsInput,
  DeleteWorkoutsInput,
  GetWorkoutInput,
  ListWorkoutsFilter,
  MoveWorkoutsInput,
  Workout,
  WorkoutDetail,
} from './workout';

export interface WorkoutRepository {
  listWorkouts(filter: ListWorkoutsFilter): Promise<Workout[]>;
  getWorkout(input: GetWorkoutInput): Promise<WorkoutDetail | null>;
  deleteWorkouts(input: DeleteWorkoutsInput): Promise<{ deletedIds: string[] }>;
  moveWorkouts(input: MoveWorkoutsInput): Promise<{ movedIds: string[] }>;
  copyWorkouts(input: CopyWorkoutsInput): Promise<{ newWorkoutIds: string[] }>;
}
