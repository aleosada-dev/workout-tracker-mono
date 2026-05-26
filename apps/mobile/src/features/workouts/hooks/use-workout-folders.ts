import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import { fetchWorkoutFolders } from '@/features/workouts/api/workouts';

export function useWorkoutFolders(options: { userId?: string | null } = {}) {
  const { session } = useSession();
  const sessionUserId = session?.user.id;
  const targetUserId = options.userId ?? sessionUserId;

  return useQuery({
    queryKey: ['workouts', 'folders', targetUserId] as const,
    queryFn: ({ signal }) =>
      fetchWorkoutFolders({ query: { userId: targetUserId as string } }, { signal }),
    enabled: !!targetUserId,
  });
}
