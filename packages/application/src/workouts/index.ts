import type { WorkoutFolderRepository } from '@workout-tracker/domain';
import { makeListWorkoutFolders } from './list-workout-folders';

export function makeWorkoutApp(repository: WorkoutFolderRepository) {
  return {
    listFolders: makeListWorkoutFolders(repository),
  };
}

export * from './list-workout-folders';
