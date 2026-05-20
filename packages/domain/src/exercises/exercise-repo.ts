import type { CreateExerciseInput } from './create-exercise';
import type { ExerciseDetail, GetExerciseDetailFilter } from './exercise-detail';
import type { ExerciseListItem, ListExercisesFilter } from './exercise-list';

export interface ExerciseRepository {
  list(filter: ListExercisesFilter): Promise<ExerciseListItem[]>;
  getExerciseDetail(filter: GetExerciseDetailFilter): Promise<ExerciseDetail>;
  createExercise(input: CreateExerciseInput): Promise<{ id: string }>;
}
