import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteExercise } from '@/features/exercises/api/exercises';

export function useDeleteExercise(variationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteExercise(variationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['exercises', 'detail', variationId] });
      queryClient.removeQueries({ queryKey: ['exercises', 'edit', variationId] });
      queryClient.removeQueries({ queryKey: ['exercises', 'names'] });
    },
  });
}
