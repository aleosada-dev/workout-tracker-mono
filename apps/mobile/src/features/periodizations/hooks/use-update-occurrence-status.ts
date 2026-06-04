import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Occurrences } from '@/features/periodizations/api/occurrences';
import {
  type OccurrenceStatus,
  updateOccurrenceStatus,
} from '@/features/periodizations/api/update-occurrence-status';
import { OCCURRENCES_QUERY_PREFIX } from '@/features/periodizations/hooks/use-today-occurrences';

const OCCURRENCES_KEY = OCCURRENCES_QUERY_PREFIX;

type Variables = {
  occurrenceId: string;
  status: OccurrenceStatus;
  skippedReason?: string;
};

export function useUpdateOccurrenceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ occurrenceId, status, skippedReason }: Variables) =>
      updateOccurrenceStatus({ param: { id: occurrenceId }, json: { status, skippedReason } }),
    onMutate: async ({ occurrenceId }) => {
      await queryClient.cancelQueries({ queryKey: OCCURRENCES_KEY });
      const snapshots = queryClient.getQueriesData<Occurrences>({ queryKey: OCCURRENCES_KEY });
      for (const [key, list] of snapshots) {
        if (!list) continue;
        queryClient.setQueryData<Occurrences>(
          key,
          list.filter((occurrence) => occurrence.occurrenceId !== occurrenceId),
        );
      }
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      for (const [key, list] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, list);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: OCCURRENCES_KEY });
    },
  });
}
