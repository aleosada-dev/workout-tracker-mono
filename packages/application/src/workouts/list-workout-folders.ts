import type {
  ListWorkoutFoldersFilter,
  WorkoutFolder,
  WorkoutFolderRepository,
} from '@workout-tracker/domain';

export type ListWorkoutFolders = (filter: ListWorkoutFoldersFilter) => Promise<WorkoutFolder[]>;

export function makeListWorkoutFolders(repository: WorkoutFolderRepository): ListWorkoutFolders {
  return async (filter) => repository.listFolders(filter);
}
