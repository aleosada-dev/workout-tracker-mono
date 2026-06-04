import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fetchOccurrences } from '@/features/periodizations/api/occurrences';

export const OCCURRENCES_QUERY_PREFIX = ['periodizations', 'occurrences'] as const;

export function useTodayOccurrences() {
  const date = format(new Date(), 'yyyy-MM-dd');
  return useQuery({
    queryKey: [...OCCURRENCES_QUERY_PREFIX, date, 'pending'] as const,
    queryFn: ({ signal }) => fetchOccurrences({ query: { date } }, signal),
  });
}
