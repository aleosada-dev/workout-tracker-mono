import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  type UpdateUserPreferencesRequest,
  type UserPreferencesResponse,
  updateUserPreferences,
} from '@/features/preferences/api/preferences';
import { userPreferencesQueryKey } from '@/features/preferences/hooks/use-user-preferences';

export function useUpdateUserPreferences() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const queryKey = userPreferencesQueryKey(userId);

  return useMutation({
    mutationFn: (patch: UpdateUserPreferencesRequest) => updateUserPreferences(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<UserPreferencesResponse>(queryKey);
      if (previous) {
        queryClient.setQueryData<UserPreferencesResponse>(queryKey, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
