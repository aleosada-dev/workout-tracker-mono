import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $get = honoClient.api.v1['training-locations'].$get;
const $post = honoClient.api.v1['training-locations'].$post;
const $patch = honoClient.api.v1['training-locations'][':id'].$patch;
const $delete = honoClient.api.v1['training-locations'][':id'].$delete;

export type TrainingLocationsResponse = InferResponseType<typeof $get, 200>;
export type TrainingLocation = TrainingLocationsResponse[number];
export type CreateTrainingLocationRequest = InferRequestType<typeof $post>['json'];
export type CreateTrainingLocationResponse = InferResponseType<typeof $post, 201>;
export type UpdateTrainingLocationRequest = InferRequestType<typeof $patch>['json'];
export type UpdateTrainingLocationResponse = InferResponseType<typeof $patch, 200>;
export type DeleteTrainingLocationRequest = InferRequestType<typeof $delete>['json'];

export async function fetchTrainingLocations({
  userId,
  signal,
}: {
  userId?: string;
  signal?: AbortSignal;
} = {}): Promise<TrainingLocationsResponse> {
  const response = await $get({ query: { ...(userId ? { userId } : {}) } }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function createTrainingLocation(
  body: CreateTrainingLocationRequest,
): Promise<CreateTrainingLocationResponse> {
  const response = await $post({ json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function updateTrainingLocation(
  locationId: string,
  body: UpdateTrainingLocationRequest,
): Promise<UpdateTrainingLocationResponse> {
  const response = await $patch({ param: { id: locationId }, json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function deleteTrainingLocation(
  locationId: string,
  body: DeleteTrainingLocationRequest = {},
): Promise<void> {
  const response = await $delete({ param: { id: locationId }, json: body });
  if (!response.ok) throw await buildApiError(response);
}
