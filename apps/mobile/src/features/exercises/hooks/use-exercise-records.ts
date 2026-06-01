import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  type ExerciseRecordsResponse,
  fetchExerciseRecords,
} from '@/features/exercises/api/exercises';

export const exerciseRecordsQueryKey = (userId: string | undefined, variationIds: string[]) =>
  ['exercises', 'records', userId, variationIds] as const;

export function useExerciseRecords(variationIds: string[], userId?: string | null) {
  const { session } = useSession();
  const targetUserId = userId ?? session?.user.id;
  const sortedIds = [...variationIds].sort();

  return useQuery<ExerciseRecordsResponse>({
    queryKey: exerciseRecordsQueryKey(targetUserId ?? undefined, sortedIds),
    queryFn: ({ signal }) =>
      fetchExerciseRecords(sortedIds, { userId: targetUserId ?? undefined, signal }),
    enabled: !!targetUserId && sortedIds.length > 0,
  });
}
