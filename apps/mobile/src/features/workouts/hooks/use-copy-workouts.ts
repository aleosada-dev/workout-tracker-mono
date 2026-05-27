import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type CopyWorkoutsRequest, copyWorkouts } from '@/features/workouts/api/workouts';

export function useCopyWorkouts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CopyWorkoutsRequest) => copyWorkouts(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'folders'] });
    },
  });
}
