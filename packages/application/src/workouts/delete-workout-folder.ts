import type { DeleteWorkoutFolderInput, WorkoutFolderRepository } from '@workout-tracker/domain';

export type DeleteWorkoutFolder = (
  input: DeleteWorkoutFolderInput,
) => Promise<{ deleted: boolean }>;

export function makeDeleteWorkoutFolder(repository: WorkoutFolderRepository): DeleteWorkoutFolder {
  return async (input) => repository.deleteFolder(input);
}
