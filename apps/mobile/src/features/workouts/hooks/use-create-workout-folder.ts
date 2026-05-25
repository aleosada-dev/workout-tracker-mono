import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorkoutFolder } from '@/features/workouts/api/workouts';

export function useCreateWorkoutFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkoutFolder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workouts', 'folders'] });
    },
  });
}
