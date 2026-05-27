import type {
  CopyWorkoutsCommand,
  WorkoutFolderRepository,
  WorkoutRepository,
} from '@workout-tracker/domain';

export type CopyWorkouts = (input: CopyWorkoutsCommand) => Promise<{ newWorkoutIds: string[] }>;

export function makeCopyWorkouts(
  workoutRepository: WorkoutRepository,
  folderRepository: WorkoutFolderRepository,
): CopyWorkouts {
  return async ({ workoutIds, targetUserId, target }) => {
    let targetFolderId: string | null = null;

    if (target.kind === 'existing') {
      targetFolderId = target.folderId;
    } else if (target.kind === 'new') {
      const folder = await folderRepository.createFolder({
        userId: targetUserId,
        name: target.name,
        color: target.color,
      });
      targetFolderId = folder.id;
    }

    return workoutRepository.copyWorkouts({ workoutIds, targetUserId, targetFolderId });
  };
}
