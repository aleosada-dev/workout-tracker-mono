import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $get = honoClient.api.v1.exercises.$get;
const $getNames = honoClient.api.v1.exercises.names.$get;
const $getRecords = honoClient.api.v1.exercises.records.$get;
const $getLastSets = honoClient.api.v1.exercises.last.$get;
const $getDetail = honoClient.api.v1.exercises[':id'].detail.$get;
const $getEdit = honoClient.api.v1.exercises[':id'].$get;
const $post = honoClient.api.v1.exercises.$post;
const $put = honoClient.api.v1.exercises[':id'].$put;
const $delete = honoClient.api.v1.exercises[':id'].$delete;
const $bulkDelete = honoClient.api.v1.exercises.$delete;
const $bulkCopy = honoClient.api.v1.exercises.copy.$post;
const $videoUploadUrls = honoClient.api.v1.medias['video-upload-urls'].$post;
const $getAliases = honoClient.api.v1.exercises['variation-aliases'].$get;
const $postAlias = honoClient.api.v1.exercises['variation-aliases'].$post;
const $patchAlias = honoClient.api.v1.exercises['variation-aliases'][':id'].$patch;
const $deleteAlias = honoClient.api.v1.exercises['variation-aliases'][':id'].$delete;

export type ListExercisesResponse = InferResponseType<typeof $get, 200>;
export type ExerciseListParams = InferRequestType<typeof $get>;
export type ListExercisesResponseExercise = ListExercisesResponse[number];
export type ListExercisesResponseVariation = ListExercisesResponseExercise['variations'][number];

export type ListExerciseNamesResponse = InferResponseType<typeof $getNames, 200>;
export type ListExerciseNamesResponseItem = ListExerciseNamesResponse[number];

export type ExerciseRecordsResponse = InferResponseType<typeof $getRecords, 200>;
export type ExerciseRecord = ExerciseRecordsResponse[number];

export type ExerciseLastSetsResponse = InferResponseType<typeof $getLastSets, 200>;
export type ExerciseLastSetsItem = ExerciseLastSetsResponse[number];

export type CreateExerciseRequest = InferRequestType<typeof $post>['json'];
export type CreateExerciseResponse = InferResponseType<typeof $post, 201>;

export type ExerciseForEditResponse = InferResponseType<typeof $getEdit, 200>;
export type UpdateExerciseRequest = InferRequestType<typeof $put>['json'];
export type UpdateExerciseResponse = InferResponseType<typeof $put, 200>;

export type DeleteExerciseResponse = InferResponseType<typeof $delete, 200>;

export type BulkDeleteExercisesResponse = InferResponseType<typeof $bulkDelete, 200>;

export type BulkCopyExercisesResponse = InferResponseType<typeof $bulkCopy, 200>;

export type VideoUploadUrlsRequest = InferRequestType<typeof $videoUploadUrls>['json'];
export type VideoUploadUrlsResponse = InferResponseType<typeof $videoUploadUrls, 200>;

export type ExerciseDetailResponse = InferResponseType<typeof $getDetail, 200>;
export type ExerciseDetailResponseVariation = ExerciseDetailResponse['variation'];
export type ExerciseDetailResponseSession = ExerciseDetailResponse['sessions'][number];
export type ExerciseDetailResponseSet = ExerciseDetailResponseSession['sets'][number];

export type VariationAliasesResponse = InferResponseType<typeof $getAliases, 200>;
export type VariationAlias = VariationAliasesResponse[number];
export type CreateVariationAliasRequest = InferRequestType<typeof $postAlias>['json'];
export type CreateVariationAliasResponse = InferResponseType<typeof $postAlias, 201>;
export type UpdateVariationAliasRequest = InferRequestType<typeof $patchAlias>['json'];
export type UpdateVariationAliasResponse = InferResponseType<typeof $patchAlias, 200>;

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

export async function fetchExerciseRecords(
  variationIds: string[],
  { userId, signal }: { userId?: string; signal?: AbortSignal } = {},
): Promise<ExerciseRecordsResponse> {
  const response = await $getRecords(
    { query: { variationIds, ...(userId ? { userId } : {}) } },
    { init: { signal } },
  );
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function fetchExerciseLastSets(
  variationIds: string[],
  { userId, signal }: { userId?: string; signal?: AbortSignal } = {},
): Promise<ExerciseLastSetsResponse> {
  const response = await $getLastSets(
    { query: { variationIds, ...(userId ? { userId } : {}) } },
    { init: { signal } },
  );
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function fetchExerciseDetail(
  variationId: string,
  { aliasId, signal }: { aliasId?: string | null; signal?: AbortSignal } = {},
): Promise<ExerciseDetailResponse> {
  const response = await $getDetail(
    { param: { id: variationId }, query: aliasId ? { aliasId } : {} },
    { init: { signal } },
  );
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

export async function bulkCopyExercises(
  variationIds: string[],
): Promise<BulkCopyExercisesResponse> {
  const response = await $bulkCopy({ json: { variationIds } });
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

export async function fetchVariationAliases(
  variationIds: string[],
  { userId, signal }: { userId?: string; signal?: AbortSignal } = {},
): Promise<VariationAliasesResponse> {
  const response = await $getAliases(
    { query: { variationIds, ...(userId ? { userId } : {}) } },
    { init: { signal } },
  );
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function createVariationAlias(
  body: CreateVariationAliasRequest,
): Promise<CreateVariationAliasResponse> {
  const response = await $postAlias({ json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function updateVariationAlias(
  aliasId: string,
  body: UpdateVariationAliasRequest,
): Promise<UpdateVariationAliasResponse> {
  const response = await $patchAlias({ param: { id: aliasId }, json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function deleteVariationAlias(aliasId: string): Promise<void> {
  const response = await $deleteAlias({ param: { id: aliasId }, json: {} });
  if (!response.ok) throw await buildApiError(response);
}
