import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWorkouts } from '@/features/workouts/api/workouts';

export function useDeleteWorkouts(options: { userId?: string | null } = {}) {
  const queryClient = useQueryClient();
  const { userId } = options;

  return useMutation({
    mutationFn: (workoutIds: string[]) =>
      deleteWorkouts({ workoutIds, ...(userId ? { userId } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'folders'] });
    },
  });
}
