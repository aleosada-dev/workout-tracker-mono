import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createExercise } from '@/features/exercises/api/exercises';

export function useCreateExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExercise,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises', 'list'] });
    },
  });
}
