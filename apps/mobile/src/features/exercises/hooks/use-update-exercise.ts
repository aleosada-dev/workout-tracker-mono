import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type UpdateExerciseRequest, updateExercise } from '@/features/exercises/api/exercises';

export function useUpdateExercise(variationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateExerciseRequest) => updateExercise(variationId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['exercises', 'detail', variationId] });
      void queryClient.invalidateQueries({ queryKey: ['exercises', 'edit', variationId] });
    },
  });
}
