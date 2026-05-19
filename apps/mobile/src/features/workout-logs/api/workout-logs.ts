import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $getSummaries = honoClient.api.v1['workout-logs'].summaries.$get;

export type WorkoutLogSummariesPage = InferResponseType<typeof $getSummaries, 200>;
export type WorkoutLogSummariesParams = InferRequestType<typeof $getSummaries>;
export type WorkoutLogSummary = WorkoutLogSummariesPage['items'][number];

export async function fetchWorkoutLogSummaries(
  query: WorkoutLogSummariesParams,
  signal?: AbortSignal,
): Promise<WorkoutLogSummariesPage> {
  const response = await $getSummaries(query, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
