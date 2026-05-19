import { useQuery } from '@tanstack/react-query';
import { fetchMuscles } from '@/features/muscles/api/muscles';

export function useMuscles() {
  return useQuery({
    queryKey: ['muscles', 'nested'] as const,
    queryFn: ({ signal }) => fetchMuscles({ signal }),
    staleTime: 1000 * 60 * 60,
  });
}
