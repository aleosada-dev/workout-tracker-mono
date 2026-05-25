import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $getFolders = honoClient.api.v1.workouts.folders.$get;
const $postFolder = honoClient.api.v1.workouts.folders.$post;
const $getWorkouts = honoClient.api.v1.workouts.$get;

export type ListWorkoutFoldersParams = InferRequestType<typeof $getFolders>;
export type ListWorkoutFoldersResponse = InferResponseType<typeof $getFolders, 200>;
export type WorkoutFolderResponse = ListWorkoutFoldersResponse[number];

export type CreateWorkoutFolderRequest = InferRequestType<typeof $postFolder>['json'];
export type CreateWorkoutFolderResponse = InferResponseType<typeof $postFolder, 201>;

export type ListWorkoutsParams = InferRequestType<typeof $getWorkouts>;
export type ListWorkoutsResponse = InferResponseType<typeof $getWorkouts, 200>;
export type WorkoutResponse = ListWorkoutsResponse[number];

export async function fetchWorkoutFolders(
  params: ListWorkoutFoldersParams,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ListWorkoutFoldersResponse> {
  const response = await $getFolders({ query: params.query }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function createWorkoutFolder(
  body: CreateWorkoutFolderRequest,
): Promise<CreateWorkoutFolderResponse> {
  const response = await $postFolder({ json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function fetchWorkouts(
  params: ListWorkoutsParams,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ListWorkoutsResponse> {
  const response = await $getWorkouts({ query: params.query }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
