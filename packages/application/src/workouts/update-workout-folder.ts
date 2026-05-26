import type {
  UpdateWorkoutFolderInput,
  WorkoutFolder,
  WorkoutFolderRepository,
} from '@workout-tracker/domain';

export type UpdateWorkoutFolder = (
  input: UpdateWorkoutFolderInput,
) => Promise<WorkoutFolder | null>;

export function makeUpdateWorkoutFolder(repository: WorkoutFolderRepository): UpdateWorkoutFolder {
  return async (input) => repository.updateFolder(input);
}
