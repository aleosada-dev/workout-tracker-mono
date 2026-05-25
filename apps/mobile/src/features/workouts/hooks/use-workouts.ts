import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import { fetchWorkouts } from '@/features/workouts/api/workouts';

type FolderScope = string | null | undefined;

export function useWorkouts(options: { folderId?: FolderScope } = {}) {
  const { session } = useSession();
  const userId = session?.user.id;
  const { folderId } = options;

  const folderKey = folderId === undefined ? 'any' : folderId === null ? 'root' : folderId;

  return useQuery({
    queryKey: ['workouts', 'list', userId, folderKey] as const,
    queryFn: ({ signal }) =>
      fetchWorkouts(
        {
          query: {
            userId: userId as string,
            ...(folderId === undefined ? {} : { folderId: folderId === null ? 'null' : folderId }),
          },
        },
        { signal },
      ),
    enabled: !!userId,
  });
}
