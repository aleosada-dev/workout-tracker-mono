import { useQuery } from '@tanstack/react-query';
import { fetchExerciseDetail } from '@/features/exercises/api/exercises';

/** Logged-session detail for one exercise variation, powering the detail screen. */
export function useExerciseDetail(
  variationId: string,
  aliasId?: string | null,
  userId?: string | null,
) {
  return useQuery({
    queryKey: ['exercises', 'detail', variationId, aliasId ?? null, userId ?? null] as const,
    queryFn: ({ signal }) => fetchExerciseDetail(variationId, { aliasId, userId, signal }),
    enabled: variationId.length > 0,
  });
}
