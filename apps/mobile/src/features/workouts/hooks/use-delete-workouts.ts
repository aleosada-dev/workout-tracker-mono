import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWorkouts, type ListWorkoutsResponse } from '@/features/workouts/api/workouts';

const LIST_KEY = ['workouts', 'list'] as const;

export function useDeleteWorkouts(options: { userId?: string | null } = {}) {
  const queryClient = useQueryClient();
  const { userId } = options;

  return useMutation({
    mutationFn: (workoutIds: string[]) =>
      deleteWorkouts({ workoutIds, ...(userId ? { userId } : {}) }),
    onMutate: async (workoutIds) => {
      await queryClient.cancelQueries({ queryKey: LIST_KEY });
      const ids = new Set(workoutIds);
      const previous = queryClient.getQueriesData<ListWorkoutsResponse>({ queryKey: LIST_KEY });
      queryClient.setQueriesData<ListWorkoutsResponse>({ queryKey: LIST_KEY }, (list) =>
        list?.filter((workout) => !ids.has(workout.id)),
      );
      return { previous };
    },
    onError: (_error, _workoutIds, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'folders'] });
    },
  });
}
