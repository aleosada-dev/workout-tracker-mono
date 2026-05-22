import type {
  ExerciseForEdit,
  ExerciseRepository,
  GetExerciseForEditFilter,
} from '@workout-tracker/domain';

export type GetExerciseForEdit = (filter: GetExerciseForEditFilter) => Promise<ExerciseForEdit>;

export function makeGetExerciseForEdit(repository: ExerciseRepository): GetExerciseForEdit {
  return async (filter) => repository.getExerciseForEdit(filter);
}
