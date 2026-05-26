import type {
  CreateWorkoutFolderInput,
  DeleteWorkoutFolderInput,
  ListWorkoutFoldersFilter,
  UpdateWorkoutFolderInput,
  WorkoutFolder,
} from './workout-folder';

export interface WorkoutFolderRepository {
  listFolders(filter: ListWorkoutFoldersFilter): Promise<WorkoutFolder[]>;
  createFolder(input: CreateWorkoutFolderInput): Promise<WorkoutFolder>;
  updateFolder(input: UpdateWorkoutFolderInput): Promise<WorkoutFolder | null>;
  deleteFolder(input: DeleteWorkoutFolderInput): Promise<{ deleted: boolean }>;
}
