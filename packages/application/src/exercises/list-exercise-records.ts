import type {
  ExerciseRecords,
  ExerciseRepository,
  GetExerciseRecordsFilter,
} from '@workout-tracker/domain';

export type ListExerciseRecords = (filter: GetExerciseRecordsFilter) => Promise<ExerciseRecords[]>;

export function makeListExerciseRecords(repository: ExerciseRepository): ListExerciseRecords {
  return async (filter) => repository.getExerciseRecords(filter);
}
