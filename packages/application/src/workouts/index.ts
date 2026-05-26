import type { WorkoutFolderRepository, WorkoutRepository } from '@workout-tracker/domain';
import { makeCreateWorkoutFolder } from './create-workout-folder';
import { makeDeleteWorkoutFolder } from './delete-workout-folder';
import { makeListWorkoutFolders } from './list-workout-folders';
import { makeListWorkouts } from './list-workouts';
import { makeUpdateWorkoutFolder } from './update-workout-folder';

export function makeWorkoutApp(
  folderRepository: WorkoutFolderRepository,
  workoutRepository: WorkoutRepository,
) {
  return {
    listFolders: makeListWorkoutFolders(folderRepository),
    createFolder: makeCreateWorkoutFolder(folderRepository),
    updateFolder: makeUpdateWorkoutFolder(folderRepository),
    deleteFolder: makeDeleteWorkoutFolder(folderRepository),
    listWorkouts: makeListWorkouts(workoutRepository),
  };
}

export * from './create-workout-folder';
export * from './delete-workout-folder';
export * from './list-workout-folders';
export * from './list-workouts';
export * from './update-workout-folder';
