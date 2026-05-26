import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import { fetchCoachAthletes } from '@/features/coaches/api/coaches';

export function useCoachAthletes(options: { enabled?: boolean } = {}) {
  const { session } = useSession();
  const userId = session?.user.id;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['coaches', 'athletes', userId] as const,
    queryFn: ({ signal }) => fetchCoachAthletes(userId as string, { signal }),
    enabled: !!userId && enabled,
  });
}
