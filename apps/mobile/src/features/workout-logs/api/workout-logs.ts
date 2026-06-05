import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $getSummaries = honoClient.api.v1['workout-logs'].summaries.$get;
const $getWorkoutLog = honoClient.api.v1['workout-logs'][':id'].$get;
const $createWorkoutLog = honoClient.api.v1['workout-logs'].$post;
const $deleteWorkoutLog = honoClient.api.v1['workout-logs'][':id'].$delete;

export type WorkoutLogSummariesPage = InferResponseType<typeof $getSummaries, 200>;
export type WorkoutLogSummariesParams = InferRequestType<typeof $getSummaries>;
export type WorkoutLogSummary = WorkoutLogSummariesPage['items'][number];

export type WorkoutLogDetail = InferResponseType<typeof $getWorkoutLog, 200>;
export type WorkoutLogDetailExercise = WorkoutLogDetail['exercises'][number];
export type WorkoutLogDetailSet = WorkoutLogDetailExercise['sets'][number];

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

export async function fetchWorkoutLog(id: string, signal?: AbortSignal): Promise<WorkoutLogDetail> {
  const response = await $getWorkoutLog({ param: { id } }, { init: { signal } });
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

export async function deleteWorkoutLog(id: string): Promise<void> {
  const response = await $deleteWorkoutLog({ param: { id } });
  if (!response.ok) throw await buildApiError(response);
}
