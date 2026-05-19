import { useQuery } from '@tanstack/react-query';
import type { ExerciseListParams } from '@/exercises/api/exercises';
import { EMPTY_EXERCISE_LIST_PARAMS, fetchExercises } from '@/exercises/api/exercises';

export function useExercises(params: ExerciseListParams = EMPTY_EXERCISE_LIST_PARAMS) {
  return useQuery({
    queryKey: ['exercises', 'list', params] as const,
    queryFn: ({ signal }) => fetchExercises(params, { signal }),
  });
}
