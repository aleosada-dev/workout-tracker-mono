import type { WorkoutFolderRepository, WorkoutRepository } from '@workout-tracker/domain';
import { makeCreateWorkoutFolder } from './create-workout-folder';
import { makeListWorkoutFolders } from './list-workout-folders';
import { makeListWorkouts } from './list-workouts';

export function makeWorkoutApp(
  folderRepository: WorkoutFolderRepository,
  workoutRepository: WorkoutRepository,
) {
  return {
    listFolders: makeListWorkoutFolders(folderRepository),
    createFolder: makeCreateWorkoutFolder(folderRepository),
    listWorkouts: makeListWorkouts(workoutRepository),
  };
}

export * from './create-workout-folder';
export * from './list-workout-folders';
export * from './list-workouts';
