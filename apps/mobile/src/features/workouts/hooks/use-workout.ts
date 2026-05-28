import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import { fetchWorkout } from '@/features/workouts/api/workouts';

export function useWorkout(options: { workoutId?: string | null; userId?: string | null }) {
  const { session } = useSession();
  const sessionUserId = session?.user.id;
  const targetUserId = options.userId ?? sessionUserId;
  const { workoutId } = options;

  return useQuery({
    queryKey: ['workouts', 'detail', targetUserId, workoutId] as const,
    queryFn: ({ signal }) =>
      fetchWorkout(
        {
          param: { id: workoutId as string },
          query: { userId: targetUserId as string },
        },
        { signal },
      ),
    enabled: !!workoutId && !!targetUserId,
  });
}
