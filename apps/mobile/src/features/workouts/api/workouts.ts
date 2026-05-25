import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $getFolders = honoClient.api.v1.workouts.folders.$get;

export type ListWorkoutFoldersParams = InferRequestType<typeof $getFolders>;
export type ListWorkoutFoldersResponse = InferResponseType<typeof $getFolders, 200>;
export type WorkoutFolderResponse = ListWorkoutFoldersResponse[number];

export async function fetchWorkoutFolders(
  params: ListWorkoutFoldersParams,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ListWorkoutFoldersResponse> {
  const response = await $getFolders({ query: params.query }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
