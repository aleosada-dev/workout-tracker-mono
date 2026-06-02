import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $getSummaries = honoClient.api.v1['workout-logs'].summaries.$get;
const $createWorkoutLog = honoClient.api.v1['workout-logs'].$post;

export type WorkoutLogSummariesPage = InferResponseType<typeof $getSummaries, 200>;
export type WorkoutLogSummariesParams = InferRequestType<typeof $getSummaries>;
export type WorkoutLogSummary = WorkoutLogSummariesPage['items'][number];

export type CreateWorkoutLogRequest = InferRequestType<typeof $createWorkoutLog>['json'];
export type CreateWorkoutLogResponse = InferResponseType<typeof $createWorkoutLog, 201>;

export async function fetchWorkoutLogSummaries(
  query: WorkoutLogSummariesParams,
  signal?: AbortSignal,
): Promise<WorkoutLogSummariesPage> {
  const response = await $getSummaries(query, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function createWorkoutLog(
  body: CreateWorkoutLogRequest,
): Promise<CreateWorkoutLogResponse> {
  const response = await $createWorkoutLog({ json: body });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
