import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/api/lib/hono-client';

const $get = honoClient.api.v1.exercises.$get;
const $getHistory = honoClient.api.v1.exercises[':id'].history.$get;

export type ListExercisesResponse = InferResponseType<typeof $get, 200>;
export type ExerciseListParams = InferRequestType<typeof $get>;
export type ListExercisesResponseExercise = ListExercisesResponse[number];
export type ListExercisesResponseVariation = ListExercisesResponseExercise['variations'][number];

export type ExerciseHistoryResponse = InferResponseType<typeof $getHistory, 200>;
export type ExerciseHistoryResponseVariation = ExerciseHistoryResponse['variation'];
export type ExerciseHistoryResponseSession = ExerciseHistoryResponse['sessions'][number];
export type ExerciseHistoryResponseSet = ExerciseHistoryResponseSession['sets'][number];

export const EMPTY_EXERCISE_LIST_PARAMS: ExerciseListParams = { query: {} };

export async function fetchExercises(
  params: ExerciseListParams = EMPTY_EXERCISE_LIST_PARAMS,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ListExercisesResponse> {
  const response = await $get({ query: params.query }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function fetchExerciseHistory(
  variationId: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ExerciseHistoryResponse> {
  const response = await $getHistory({ param: { id: variationId } }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
