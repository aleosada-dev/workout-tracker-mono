import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWorkoutFolder } from '@/features/workouts/api/workouts';
import type { DeleteFolderAction } from '@/features/workouts/components/WorkoutFolderDeleteSheet';

export function useDeleteWorkoutFolder(folderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: DeleteFolderAction) => deleteWorkoutFolder(folderId, action),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workouts', 'folders'] }),
        queryClient.invalidateQueries({ queryKey: ['workouts', 'list'] }),
      ]);
    },
  });
}
