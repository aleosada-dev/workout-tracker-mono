import { useQuery } from '@tanstack/react-query';
import { fetchWorkoutLog } from '@/features/workout-logs/api/workout-logs';

export function useWorkoutLogDetail(id: string | undefined, userId?: string | null) {
  return useQuery({
    queryKey: ['workout-logs', 'detail', id, userId ?? null] as const,
    queryFn: ({ signal }) => fetchWorkoutLog(id as string, userId, signal),
    enabled: !!id,
  });
}
