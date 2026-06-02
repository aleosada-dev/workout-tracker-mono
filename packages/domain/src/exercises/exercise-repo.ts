import type { CopyExercisesInput, CopyExercisesResult } from './copy-exercises';
import type { CreateExerciseInput } from './create-exercise';
import type { DeleteExercisesInput, DeleteExercisesResult } from './delete-exercises';
import type { ExerciseDetail, GetExerciseDetailFilter } from './exercise-detail';
import type { ExerciseForEdit, GetExerciseForEditFilter } from './exercise-edit';
import type { ExerciseLastSets, GetExerciseLastSetsFilter } from './exercise-last-sets';
import type { ExerciseListItem, ListExercisesFilter } from './exercise-list';
import type { ListExerciseName, ListExerciseNamesFilter } from './exercise-name';
import type { ExerciseRecords, GetExerciseRecordsFilter } from './exercise-records';
import type { UpdateExerciseInput } from './update-exercise';

export interface ExerciseRepository {
  list(filter: ListExercisesFilter): Promise<ExerciseListItem[]>;
  listNames(filter: ListExerciseNamesFilter): Promise<ListExerciseName[]>;
  getExerciseDetail(filter: GetExerciseDetailFilter): Promise<ExerciseDetail>;
  getExerciseRecords(filter: GetExerciseRecordsFilter): Promise<ExerciseRecords[]>;
  getLastSets(filter: GetExerciseLastSetsFilter): Promise<ExerciseLastSets[]>;
  getExerciseForEdit(filter: GetExerciseForEditFilter): Promise<ExerciseForEdit>;
  createExercise(input: CreateExerciseInput): Promise<{ id: string }>;
  updateExercise(input: UpdateExerciseInput): Promise<{ id: string }>;
  deleteExercises(input: DeleteExercisesInput): Promise<DeleteExercisesResult>;
  copyExercises(input: CopyExercisesInput): Promise<CopyExercisesResult>;
}
