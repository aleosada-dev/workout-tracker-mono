import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import { type UpsertWorkoutRequest, upsertWorkout } from '@/features/workouts/api/workouts';

export function useUpsertWorkout(workoutId: string, options: { userId?: string | null } = {}) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const targetUserId = options.userId ?? session?.user.id;

  return useMutation({
    mutationFn: (body: UpsertWorkoutRequest) => upsertWorkout(workoutId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['workouts', 'folders'] });
      queryClient.removeQueries({ queryKey: ['workouts', 'detail', targetUserId, workoutId] });
    },
  });
}
