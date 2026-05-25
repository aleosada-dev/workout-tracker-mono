import type { ListWorkoutFoldersFilter, WorkoutFolder } from './workout-folder';

export interface WorkoutFolderRepository {
  listFolders(filter: ListWorkoutFoldersFilter): Promise<WorkoutFolder[]>;
}
