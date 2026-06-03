import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fetchOccurrences } from '@/features/periodizations/api/occurrences';

export function useTodayOccurrences() {
  const date = format(new Date(), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['periodizations', 'occurrences', date, 'pending'] as const,
    queryFn: ({ signal }) => fetchOccurrences({ query: { date } }, signal),
  });
}
