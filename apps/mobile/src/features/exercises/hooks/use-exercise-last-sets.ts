import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  type ExerciseLastSetsResponse,
  fetchExerciseLastSets,
} from '@/features/exercises/api/exercises';

export const exerciseLastSetsQueryKey = (userId: string | undefined, variationIds: string[]) =>
  ['exercises', 'last-sets', userId, variationIds] as const;

export function useExerciseLastSets(variationIds: string[], userId?: string | null) {
  const { session } = useSession();
  const targetUserId = userId ?? session?.user.id;
  const sortedIds = [...variationIds].sort();

  return useQuery<ExerciseLastSetsResponse>({
    queryKey: exerciseLastSetsQueryKey(targetUserId ?? undefined, sortedIds),
    queryFn: ({ signal }) =>
      fetchExerciseLastSets(sortedIds, { userId: targetUserId ?? undefined, signal }),
    enabled: !!targetUserId && sortedIds.length > 0,
  });
}
