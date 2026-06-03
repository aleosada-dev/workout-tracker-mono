import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $getOccurrenceWorkout =
  honoClient.api.v1.periodizations.occurrences[':occurrenceId'].workout.$get;

export type OccurrenceWorkoutParams = InferRequestType<typeof $getOccurrenceWorkout>;
export type OccurrenceWorkoutResponse = InferResponseType<typeof $getOccurrenceWorkout, 200>;

export async function fetchOccurrenceWorkout(
  params: OccurrenceWorkoutParams,
  signal?: AbortSignal,
): Promise<OccurrenceWorkoutResponse> {
  const response = await $getOccurrenceWorkout(params, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
