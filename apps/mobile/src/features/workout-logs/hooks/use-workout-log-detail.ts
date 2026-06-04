import { useQuery } from '@tanstack/react-query';
import { fetchWorkoutLog } from '@/features/workout-logs/api/workout-logs';

export function useWorkoutLogDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['workout-logs', 'detail', id] as const,
    queryFn: ({ signal }) => fetchWorkoutLog(id as string, signal),
    enabled: !!id,
  });
}
