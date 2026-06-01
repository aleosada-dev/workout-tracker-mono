import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import { fetchUserPreferences } from '@/features/preferences/api/preferences';

export const userPreferencesQueryKey = (userId: string | undefined) =>
  ['preferences', userId] as const;

export function useUserPreferences() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userPreferencesQueryKey(userId),
    queryFn: ({ signal }) => fetchUserPreferences({ signal }),
    enabled: !!userId,
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}
