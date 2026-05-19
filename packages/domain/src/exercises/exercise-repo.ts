import type { ExerciseListItem, ListExercisesFilter } from './exercise-list-item';

export interface ExerciseRepository {
  list(filter: ListExercisesFilter): Promise<ExerciseListItem[]>;
}
