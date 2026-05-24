import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkCopyExercises } from '@/features/exercises/api/exercises';

export function useBulkCopyExercises() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variationIds: string[]) => bulkCopyExercises(variationIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises', 'list'] });
      queryClient.removeQueries({ queryKey: ['exercises', 'names'] });
    },
  });
}
