import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moveWorkouts } from '@/features/workouts/api/workouts';

export function useMoveWorkouts(options: { userId?: string | null } = {}) {
  const queryClient = useQueryClient();
  const { userId } = options;

  return useMutation({
    mutationFn: (input: { workoutIds: string[]; targetFolderId: string | null }) =>
      moveWorkouts({ ...input, ...(userId ? { userId } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'folders'] });
    },
  });
}
