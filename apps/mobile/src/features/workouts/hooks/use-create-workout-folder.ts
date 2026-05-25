import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createWorkoutFolder,
  type ListWorkoutFoldersResponse,
} from '@/features/workouts/api/workouts';

export function useCreateWorkoutFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkoutFolder,
    onSuccess: (folder) => {
      queryClient.setQueriesData<ListWorkoutFoldersResponse>(
        { queryKey: ['workouts', 'folders'] },
        (prev) => (prev ? [...prev, folder] : prev),
      );
      void queryClient.invalidateQueries({ queryKey: ['workouts', 'folders'] });
    },
  });
}
