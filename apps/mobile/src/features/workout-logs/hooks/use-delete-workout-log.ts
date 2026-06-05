import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWorkoutLog } from '@/features/workout-logs/api/workout-logs';

export function useDeleteWorkoutLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWorkoutLog(id),
    onSuccess: (_data, id) => {
      // The home list is an inactive infinite query while the detail screen is
      // open, so refetchType 'all' is required to refresh it on invalidation.
      queryClient.invalidateQueries({
        queryKey: ['workout-logs', 'summaries'],
        refetchType: 'all',
      });
      queryClient.removeQueries({ queryKey: ['workout-logs', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['exercises', 'records'] });
      queryClient.invalidateQueries({ queryKey: ['exercises', 'last-sets'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'last-log'] });
    },
  });
}
