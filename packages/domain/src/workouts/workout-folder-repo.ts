import type {
  CreateWorkoutFolderInput,
  ListWorkoutFoldersFilter,
  WorkoutFolder,
} from './workout-folder';

export interface WorkoutFolderRepository {
  listFolders(filter: ListWorkoutFoldersFilter): Promise<WorkoutFolder[]>;
  createFolder(input: CreateWorkoutFolderInput): Promise<WorkoutFolder>;
}
