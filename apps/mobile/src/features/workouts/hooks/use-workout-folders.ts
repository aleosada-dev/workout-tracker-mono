import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import { fetchWorkoutFolders } from '@/features/workouts/api/workouts';

export function useWorkoutFolders() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['workouts', 'folders', userId] as const,
    queryFn: ({ signal }) =>
      fetchWorkoutFolders({ query: { userId: userId as string } }, { signal }),
    enabled: !!userId,
  });
}
