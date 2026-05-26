import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import { fetchWorkouts } from '@/features/workouts/api/workouts';

type FolderScope = string | null | undefined;

export function useWorkouts(options: { folderId?: FolderScope; userId?: string | null } = {}) {
  const { session } = useSession();
  const sessionUserId = session?.user.id;
  const targetUserId = options.userId ?? sessionUserId;
  const { folderId } = options;

  const folderKey = folderId === undefined ? 'any' : folderId === null ? 'root' : folderId;

  return useQuery({
    queryKey: ['workouts', 'list', targetUserId, folderKey] as const,
    queryFn: ({ signal }) =>
      fetchWorkouts(
        {
          query: {
            userId: targetUserId as string,
            ...(folderId === undefined ? {} : { folderId: folderId === null ? 'null' : folderId }),
          },
        },
        { signal },
      ),
    enabled: !!targetUserId,
  });
}
