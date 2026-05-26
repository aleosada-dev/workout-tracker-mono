import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWorkoutFolder } from '@/features/workouts/api/workouts';
import type { DeleteFolderAction } from '@/features/workouts/components/WorkoutFolderDeleteSheet';

export function useDeleteWorkoutFolder(folderId: string, options: { userId?: string | null } = {}) {
  const queryClient = useQueryClient();
  const { userId } = options;

  return useMutation({
    mutationFn: (action: DeleteFolderAction) =>
      deleteWorkoutFolder(folderId, { ...action, ...(userId ? { userId } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', 'folders'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'list'] });
    },
  });
}
