import { useQuery } from '@tanstack/react-query';
import { fetchExerciseForEdit } from '@/features/exercises/api/exercises';

export function useExerciseForEdit(variationId: string) {
  return useQuery({
    queryKey: ['exercises', 'edit', variationId] as const,
    queryFn: ({ signal }) => fetchExerciseForEdit(variationId, { signal }),
    enabled: variationId.length > 0,
    staleTime: 0,
    gcTime: 0,
  });
}
