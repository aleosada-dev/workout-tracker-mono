import type {
  CreateWorkoutFolderInput,
  WorkoutFolder,
  WorkoutFolderRepository,
} from '@workout-tracker/domain';

export type CreateWorkoutFolder = (input: CreateWorkoutFolderInput) => Promise<WorkoutFolder>;

export function makeCreateWorkoutFolder(repository: WorkoutFolderRepository): CreateWorkoutFolder {
  return async (input) => repository.createFolder(input);
}
