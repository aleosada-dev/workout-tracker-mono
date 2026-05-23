import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkDeleteExercises } from '@/features/exercises/api/exercises';

export function useBulkDeleteExercises() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variationIds: string[]) => bulkDeleteExercises(variationIds),
    onSuccess: (_data, variationIds) => {
      void queryClient.invalidateQueries({ queryKey: ['exercises', 'list'] });
      queryClient.removeQueries({ queryKey: ['exercises', 'names'] });
      for (const id of variationIds) {
        void queryClient.invalidateQueries({ queryKey: ['exercises', 'detail', id] });
      }
    },
  });
}
