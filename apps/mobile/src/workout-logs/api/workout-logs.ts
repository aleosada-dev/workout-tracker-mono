import type { InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/api/lib/hono-client';

const $getSummaries = honoClient.api.v1['workout-logs'].summaries.$get;

export type WorkoutLogSummariesPage = InferResponseType<typeof $getSummaries, 200>;
export type WorkoutLogSummary = WorkoutLogSummariesPage['items'][number];

export type FetchWorkoutLogSummariesParams = {
  limit: number;
  /** ISO do startedAt do último item da página anterior. */
  cursor?: string;
  signal?: AbortSignal;
};

export async function fetchWorkoutLogSummaries({
  limit,
  cursor,
  signal,
}: FetchWorkoutLogSummariesParams): Promise<WorkoutLogSummariesPage> {
  const response = await $getSummaries(
    { query: { limit: String(limit), ...(cursor ? { cursor } : {}) } },
    { init: { signal } },
  );
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
