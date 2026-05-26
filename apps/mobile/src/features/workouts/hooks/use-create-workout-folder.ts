import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CreateWorkoutFolderRequest,
  createWorkoutFolder,
} from '@/features/workouts/api/workouts';

export function useCreateWorkoutFolder(options: { userId?: string | null } = {}) {
  const queryClient = useQueryClient();
  const { userId } = options;

  return useMutation({
    mutationFn: (body: Omit<CreateWorkoutFolderRequest, 'userId'>) =>
      createWorkoutFolder({ ...body, ...(userId ? { userId } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', 'folders'] });
    },
  });
}
