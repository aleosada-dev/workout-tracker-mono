import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $get = honoClient.api.v1.exercises.$get;
const $getNames = honoClient.api.v1.exercises.names.$get;
const $getDetail = honoClient.api.v1.exercises[':id'].detail.$get;
const $getEdit = honoClient.api.v1.exercises[':id'].$get;
const $post = honoClient.api.v1.exercises.$post;
const $put = honoClient.api.v1.exercises[':id'].$put;
const $delete = honoClient.api.v1.exercises[':id'].$delete;
const $bulkDelete = honoClient.api.v1.exercises.$delete;
const $videoUploadUrls = honoClient.api.v1.medias['video-upload-urls'].$post;

export type ListExercisesResponse = InferResponseType<typeof $get, 200>;
export type ExerciseListParams = InferRequestType<typeof $get>;
export type ListExercisesResponseExercise = ListExercisesResponse[number];
export type ListExercisesResponseVariation = ListExercisesResponseExercise['variations'][number];

export type ListExerciseNamesResponse = InferResponseType<typeof $getNames, 200>;
export type ListExerciseNamesResponseItem = ListExerciseNamesResponse[number];

export type CreateExerciseRequest = InferRequestType<typeof $post>['json'];
export type CreateExerciseResponse = InferResponseType<typeof $post, 201>;

export type ExerciseForEditResponse = InferResponseType<typeof $getEdit, 200>;
export type UpdateExerciseRequest = InferRequestType<typeof $put>['json'];
export type UpdateExerciseResponse = InferResponseType<typeof $put, 200>;

export type DeleteExerciseResponse = InferResponseType<typeof $delete, 200>;

export type BulkDeleteExercisesResponse = InferResponseType<typeof $bulkDelete, 200>;

export type VideoUploadUrlsRequest = InferRequestType<typeof $videoUploadUrls>['json'];
export type VideoUploadUrlsResponse = InferResponseType<typeof $videoUploadUrls, 200>;

export type ExerciseDetailResponse = InferResponseType<typeof $getDetail, 200>;
export type ExerciseDetailResponseVariation = ExerciseDetailResponse['variation'];
export type ExerciseDetailResponseSession = ExerciseDetailResponse['sessions'][number];
export type ExerciseDetailResponseSet = ExerciseDetailResponseSession['sets'][number];

export const EMPTY_EXERCISE_LIST_PARAMS: ExerciseListParams = { query: {} };

export async function fetchExercises(
  params: ExerciseListParams = EMPTY_EXERCISE_LIST_PARAMS,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ListExercisesResponse> {
  const response = await $get({ query: params.query }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function fetchExerciseNames({
  signal,
}: {
  signal?: AbortSignal;
} = {}): Promise<ListExerciseNamesResponse> {
  const response = await $getNames({}, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function fetchExerciseDetail(
  variationId: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ExerciseDetailResponse> {
  const response = await $getDetail({ param: { id: variationId } }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function createExercise(body: CreateExerciseRequest): Promise<CreateExerciseResponse> {
  const response = await $post({ json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function fetchExerciseForEdit(
  variationId: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ExerciseForEditResponse> {
  const response = await $getEdit({ param: { id: variationId } }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function updateExercise(
  variationId: string,
  body: UpdateExerciseRequest,
): Promise<UpdateExerciseResponse> {
  const response = await $put({ param: { id: variationId }, json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function deleteExercise(variationId: string): Promise<DeleteExerciseResponse> {
  const response = await $delete({ param: { id: variationId } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function bulkDeleteExercises(
  variationIds: string[],
): Promise<BulkDeleteExercisesResponse> {
  const response = await $bulkDelete({ json: { variationIds } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

/**
 * Asks the API for presigned R2 URLs to upload an exercise video and its
 * thumbnail. The object keys are built server-side from the authenticated user.
 */
export async function createVideoUploadUrls(
  body: VideoUploadUrlsRequest,
): Promise<VideoUploadUrlsResponse> {
  const response = await $videoUploadUrls({ json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
