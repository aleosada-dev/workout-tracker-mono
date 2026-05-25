import type {
  CreateWorkoutFolderInput,
  DeleteWorkoutFolderInput,
  ListWorkoutFoldersFilter,
  WorkoutFolder,
} from './workout-folder';

export interface WorkoutFolderRepository {
  listFolders(filter: ListWorkoutFoldersFilter): Promise<WorkoutFolder[]>;
  createFolder(input: CreateWorkoutFolderInput): Promise<WorkoutFolder>;
  deleteFolder(input: DeleteWorkoutFolderInput): Promise<{ deleted: boolean }>;
}
