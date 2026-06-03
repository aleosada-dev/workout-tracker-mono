import { useQuery } from '@tanstack/react-query';
import { fetchOccurrenceWorkout } from '@/features/periodizations/api/occurrence-workout';

export function useOccurrenceWorkout(occurrenceId: string | null) {
  return useQuery({
    queryKey: ['periodizations', 'occurrence-workout', occurrenceId] as const,
    queryFn: ({ signal }) =>
      fetchOccurrenceWorkout({ param: { occurrenceId: occurrenceId as string } }, signal),
    enabled: !!occurrenceId,
    // The materialized workout reflects the periodization's current adjustments
    // and is only read at "start", so it must never be served from cache.
    staleTime: 0,
    gcTime: 0,
  });
}
