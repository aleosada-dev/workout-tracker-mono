import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $get = honoClient.api.v1.exercises.$get;
const $getDetail = honoClient.api.v1.exercises[':id'].detail.$get;
const $post = honoClient.api.v1.exercises.$post;

export type ListExercisesResponse = InferResponseType<typeof $get, 200>;
export type ExerciseListParams = InferRequestType<typeof $get>;
export type ListExercisesResponseExercise = ListExercisesResponse[number];
export type ListExercisesResponseVariation = ListExercisesResponseExercise['variations'][number];

export type CreateExerciseRequest = InferRequestType<typeof $post>['json'];
export type CreateExerciseResponse = InferResponseType<typeof $post, 201>;

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
