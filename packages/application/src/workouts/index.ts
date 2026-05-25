import type { WorkoutFolderRepository } from '@workout-tracker/domain';
import { makeCreateWorkoutFolder } from './create-workout-folder';
import { makeListWorkoutFolders } from './list-workout-folders';

export function makeWorkoutApp(repository: WorkoutFolderRepository) {
  return {
    listFolders: makeListWorkoutFolders(repository),
    createFolder: makeCreateWorkoutFolder(repository),
  };
}

export * from './create-workout-folder';
export * from './list-workout-folders';
