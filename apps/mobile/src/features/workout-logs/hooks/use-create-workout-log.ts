import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type CreateWorkoutLogRequest,
  createWorkoutLog,
} from '@/features/workout-logs/api/workout-logs';

export function useCreateWorkoutLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateWorkoutLogRequest) => createWorkoutLog(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workout-logs', 'summaries'],
        refetchType: 'all',
      });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'last-log'] });
      queryClient.invalidateQueries({ queryKey: ['exercises', 'last-sets'] });
      queryClient.invalidateQueries({ queryKey: ['exercises', 'records'] });
      queryClient.invalidateQueries({
        queryKey: ['periodizations', 'occurrences'],
        refetchType: 'all',
      });
    },
  });
}
