import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import { fetchExerciseNames } from '@/features/exercises/api/exercises';

export function useExerciseNames() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['exercises', 'names', userId] as const,
    queryFn: ({ signal }) => fetchExerciseNames({ signal }),
    enabled: !!userId,
  });
}
