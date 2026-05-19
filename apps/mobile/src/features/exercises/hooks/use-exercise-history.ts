import { useQuery } from '@tanstack/react-query';
import { fetchExerciseHistory } from '@/features/exercises/api/exercises';

/** Logged-session history for one exercise variation, powering the detail screen. */
export function useExerciseHistory(variationId: string) {
  return useQuery({
    queryKey: ['exercises', 'history', variationId] as const,
    queryFn: ({ signal }) => fetchExerciseHistory(variationId, { signal }),
    enabled: variationId.length > 0,
  });
}
