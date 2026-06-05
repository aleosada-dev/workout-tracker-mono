import { useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchWorkoutLogSummaries,
  type WorkoutLogSummariesPage,
} from '@/features/workout-logs/api/workout-logs';

export const PAGE_SIZE = 10;

export function useWorkoutLogSummaries(userId?: string | null) {
  return useInfiniteQuery<
    WorkoutLogSummariesPage,
    Error,
    { pages: WorkoutLogSummariesPage[]; pageParams: (string | undefined)[] },
    readonly ['workout-logs', 'summaries', string | null],
    string | undefined
  >({
    queryKey: ['workout-logs', 'summaries', userId ?? null] as const,
    initialPageParam: undefined,
    queryFn: ({ pageParam, signal }) =>
      fetchWorkoutLogSummaries(
        {
          query: {
            limit: String(PAGE_SIZE),
            cursor: pageParam,
            ...(userId ? { userId } : {}),
          },
        },
        signal,
      ),
    getNextPageParam: (last) => (last.hasMore ? last.items.at(-1)?.startedAt : undefined),
  });
}
