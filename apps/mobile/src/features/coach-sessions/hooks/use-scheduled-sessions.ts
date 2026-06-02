import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import { fetchScheduledSessions } from '@/features/coach-sessions/api/coach-sessions';

export function useScheduledSessions(date: string, options: { enabled?: boolean } = {}) {
  const { session } = useSession();
  const userId = session?.user.id;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['coach-sessions', userId, date] as const,
    queryFn: ({ signal }) => fetchScheduledSessions(userId as string, date, { signal }),
    enabled: !!userId && enabled,
  });
}
