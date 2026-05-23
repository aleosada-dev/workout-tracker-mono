import type { CreateExerciseInput } from './create-exercise';
import type { DeleteExercisesInput, DeleteExercisesResult } from './delete-exercises';
import type { ExerciseDetail, GetExerciseDetailFilter } from './exercise-detail';
import type { ExerciseForEdit, GetExerciseForEditFilter } from './exercise-edit';
import type { ExerciseListItem, ListExercisesFilter } from './exercise-list';
import type { UpdateExerciseInput } from './update-exercise';

export interface ExerciseRepository {
  list(filter: ListExercisesFilter): Promise<ExerciseListItem[]>;
  getExerciseDetail(filter: GetExerciseDetailFilter): Promise<ExerciseDetail>;
  getExerciseForEdit(filter: GetExerciseForEditFilter): Promise<ExerciseForEdit>;
  createExercise(input: CreateExerciseInput): Promise<{ id: string }>;
  updateExercise(input: UpdateExerciseInput): Promise<{ id: string }>;
  deleteExercises(input: DeleteExercisesInput): Promise<DeleteExercisesResult>;
}
