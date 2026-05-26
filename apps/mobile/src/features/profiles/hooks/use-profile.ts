import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import { fetchProfile } from '@/features/profiles/api/profiles';

export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['profile', userId] as const,
    queryFn: ({ signal }) => fetchProfile(userId as string, { signal }),
    enabled: !!userId,
    staleTime: 2 * 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}
