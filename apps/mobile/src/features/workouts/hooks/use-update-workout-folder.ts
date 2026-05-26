import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type UpdateWorkoutFolderRequest,
  updateWorkoutFolder,
} from '@/features/workouts/api/workouts';

export function useUpdateWorkoutFolder(folderId: string, options: { userId?: string | null } = {}) {
  const queryClient = useQueryClient();
  const { userId } = options;

  return useMutation({
    mutationFn: (body: Omit<UpdateWorkoutFolderRequest, 'userId'>) =>
      updateWorkoutFolder(folderId, { ...body, ...(userId ? { userId } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', 'folders'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'list'] });
    },
  });
}
