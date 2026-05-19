import { useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchWorkoutLogSummaries,
  type WorkoutLogSummariesPage,
} from '@/features/workout-logs/api/workout-logs';

export const PAGE_SIZE = 10;

export function useWorkoutLogSummaries() {
  return useInfiniteQuery<
    WorkoutLogSummariesPage,
    Error,
    { pages: WorkoutLogSummariesPage[]; pageParams: (string | undefined)[] },
    readonly ['workout-logs', 'summaries'],
    string | undefined
  >({
    queryKey: ['workout-logs', 'summaries'] as const,
    initialPageParam: undefined,
    queryFn: ({ pageParam, signal }) =>
      fetchWorkoutLogSummaries({ limit: PAGE_SIZE, cursor: pageParam, signal }),
    getNextPageParam: (last) => (last.hasMore ? last.items.at(-1)?.startedAt : undefined),
  });
}
