import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth/hooks/useSession';
import {
  type CreateVariationAliasRequest,
  createVariationAlias,
  deleteVariationAlias,
  fetchVariationAliases,
  type UpdateVariationAliasRequest,
  updateVariationAlias,
  type VariationAliasesResponse,
} from '@/features/exercises/api/exercises';

const VARIATION_ALIASES_KEY = ['exercises', 'variation-aliases'] as const;

export const variationAliasesQueryKey = (userId: string | undefined, variationIds: string[]) =>
  [...VARIATION_ALIASES_KEY, userId, variationIds] as const;

export function useVariationAliases(variationIds: string[], userId?: string | null) {
  const { session } = useSession();
  const targetUserId = userId ?? session?.user.id;
  const sortedIds = [...variationIds].sort();

  return useQuery<VariationAliasesResponse>({
    queryKey: variationAliasesQueryKey(targetUserId ?? undefined, sortedIds),
    queryFn: ({ signal }) =>
      fetchVariationAliases(sortedIds, { userId: targetUserId ?? undefined, signal }),
    enabled: !!targetUserId && sortedIds.length > 0,
  });
}

export function useCreateVariationAlias(options: { userId?: string | null } = {}) {
  const queryClient = useQueryClient();
  const { userId } = options;

  return useMutation({
    mutationFn: (body: Omit<CreateVariationAliasRequest, 'userId'>) =>
      createVariationAlias({ ...body, ...(userId ? { userId } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VARIATION_ALIASES_KEY });
    },
  });
}

export function useUpdateVariationAlias(options: { userId?: string | null } = {}) {
  const queryClient = useQueryClient();
  const { userId } = options;

  return useMutation({
    mutationFn: ({ aliasId, body }: { aliasId: string; body: UpdateVariationAliasRequest }) =>
      updateVariationAlias(aliasId, { ...body, ...(userId ? { userId } : {}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VARIATION_ALIASES_KEY });
    },
  });
}

export function useDeleteVariationAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (aliasId: string) => deleteVariationAlias(aliasId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VARIATION_ALIASES_KEY });
    },
  });
}
