import { useQuery } from '@tanstack/react-query';
import { fetchExerciseDetail } from '@/features/exercises/api/exercises';

/** Logged-session detail for one exercise variation, powering the detail screen. */
export function useExerciseDetail(variationId: string) {
  return useQuery({
    queryKey: ['exercises', 'detail', variationId] as const,
    queryFn: ({ signal }) => fetchExerciseDetail(variationId, { signal }),
    enabled: variationId.length > 0,
  });
}
