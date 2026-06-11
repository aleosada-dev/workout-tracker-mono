import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $getFolders = honoClient.api.v1.workouts.folders.$get;
const $postFolder = honoClient.api.v1.workouts.folders.$post;
const $patchFolder = honoClient.api.v1.workouts.folders[':id'].$patch;
const $deleteFolder = honoClient.api.v1.workouts.folders[':id'].$delete;
const $getWorkouts = honoClient.api.v1.workouts.$get;
const $getWorkout = honoClient.api.v1.workouts[':id'].$get;
const $getWorkoutLastLog = honoClient.api.v1.workouts[':id']['workout-logs'].last.$get;
const $putWorkout = honoClient.api.v1.workouts[':id'].$put;
const $deleteWorkouts = honoClient.api.v1.workouts.$delete;
const $patchWorkouts = honoClient.api.v1.workouts.$patch;
const $copyWorkouts = honoClient.api.v1.workouts.copy.$post;

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

export type UpdateWorkoutFolderRequest = InferRequestType<typeof $patchFolder>['json'];
export type UpdateWorkoutFolderResponse = InferResponseType<typeof $patchFolder, 200>;

export async function updateWorkoutFolder(
  folderId: string,
  body: UpdateWorkoutFolderRequest,
): Promise<UpdateWorkoutFolderResponse> {
  const response = await $patchFolder({ param: { id: folderId }, json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export type DeleteWorkoutFolderRequest = InferRequestType<typeof $deleteFolder>['json'];
export type DeleteWorkoutFolderResponse = InferResponseType<typeof $deleteFolder, 200>;

export async function deleteWorkoutFolder(
  folderId: string,
  body: DeleteWorkoutFolderRequest,
): Promise<DeleteWorkoutFolderResponse> {
  const response = await $deleteFolder({ param: { id: folderId }, json: body });
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

export type GetWorkoutParams = InferRequestType<typeof $getWorkout>;
export type GetWorkoutResponse = InferResponseType<typeof $getWorkout, 200>;

export async function fetchWorkout(
  params: GetWorkoutParams,
  { signal }: { signal?: AbortSignal } = {},
): Promise<GetWorkoutResponse> {
  const response = await $getWorkout(
    { param: params.param, query: params.query },
    { init: { signal } },
  );
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export type UpsertWorkoutRequest = InferRequestType<typeof $putWorkout>['json'];
export type UpsertWorkoutResponse = InferResponseType<typeof $putWorkout, 200>;

export async function upsertWorkout(
  workoutId: string,
  body: UpsertWorkoutRequest,
): Promise<UpsertWorkoutResponse> {
  const response = await $putWorkout({ param: { id: workoutId }, json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export type GetWorkoutLastLogParams = InferRequestType<typeof $getWorkoutLastLog>;
export type GetWorkoutLastLogResponse = InferResponseType<typeof $getWorkoutLastLog, 200>;

export async function fetchWorkoutLastLog(
  params: GetWorkoutLastLogParams,
  { signal }: { signal?: AbortSignal } = {},
): Promise<GetWorkoutLastLogResponse> {
  const response = await $getWorkoutLastLog({ param: params.param }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export type DeleteWorkoutsRequest = InferRequestType<typeof $deleteWorkouts>['json'];
export type DeleteWorkoutsResponse = InferResponseType<typeof $deleteWorkouts, 200>;

export async function deleteWorkouts(body: DeleteWorkoutsRequest): Promise<DeleteWorkoutsResponse> {
  const response = await $deleteWorkouts({ json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export type MoveWorkoutsRequest = InferRequestType<typeof $patchWorkouts>['json'];
export type MoveWorkoutsResponse = InferResponseType<typeof $patchWorkouts, 200>;

export async function moveWorkouts(body: MoveWorkoutsRequest): Promise<MoveWorkoutsResponse> {
  const response = await $patchWorkouts({ json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export type CopyWorkoutsRequest = InferRequestType<typeof $copyWorkouts>['json'];
export type CopyWorkoutsResponse = InferResponseType<typeof $copyWorkouts, 201>;

export async function copyWorkouts(body: CopyWorkoutsRequest): Promise<CopyWorkoutsResponse> {
  const response = await $copyWorkouts({ json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
