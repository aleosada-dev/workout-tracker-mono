import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type UpdateWorkoutFolderRequest,
  updateWorkoutFolder,
} from '@/features/workouts/api/workouts';

export function useUpdateWorkoutFolder(folderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateWorkoutFolderRequest) => updateWorkoutFolder(folderId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workouts', 'folders'] }),
        queryClient.invalidateQueries({ queryKey: ['workouts', 'list'] }),
      ]);
    },
  });
}
