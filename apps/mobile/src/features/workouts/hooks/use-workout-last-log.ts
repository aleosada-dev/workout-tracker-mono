import { useQuery } from '@tanstack/react-query';
import { fetchWorkoutLastLog } from '@/features/workouts/api/workouts';

export function useWorkoutLastLog(options: { workoutId?: string | null }) {
  const { workoutId } = options;

  return useQuery({
    queryKey: ['workouts', 'last-log', workoutId] as const,
    queryFn: ({ signal }) =>
      fetchWorkoutLastLog({ param: { id: workoutId as string } }, { signal }),
    enabled: !!workoutId,
  });
}
