import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import type { ExerciseListParams } from '@/features/exercises/api/exercises';
import { EMPTY_EXERCISE_LIST_PARAMS, fetchExercises } from '@/features/exercises/api/exercises';

export function useExercises(params: ExerciseListParams = EMPTY_EXERCISE_LIST_PARAMS) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['exercises', 'list', userId, params] as const,
    queryFn: ({ signal }) => fetchExercises(params, { signal }),
    enabled: !!userId,
  });
}
