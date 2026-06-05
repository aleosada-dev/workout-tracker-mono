import { useQuery } from '@tanstack/react-query';
import { fetchOccurrenceWorkout } from '@/features/periodizations/api/occurrence-workout';

export function useOccurrenceWorkout(occurrenceId: string | null, userId?: string | null) {
  return useQuery({
    queryKey: ['periodizations', 'occurrence-workout', occurrenceId, userId ?? null] as const,
    queryFn: ({ signal }) =>
      fetchOccurrenceWorkout(
        {
          param: { occurrenceId: occurrenceId as string },
          query: userId ? { userId } : {},
        },
        signal,
      ),
    enabled: !!occurrenceId,
    // The materialized workout reflects the periodization's current adjustments
    // and is only read at "start", so it must never be served from cache.
    staleTime: 0,
    gcTime: 0,
  });
}
