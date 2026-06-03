import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $getOccurrences = honoClient.api.v1.periodizations.occurrences.$get;

export type OccurrencesParams = InferRequestType<typeof $getOccurrences>;
export type Occurrences = InferResponseType<typeof $getOccurrences, 200>;
export type Occurrence = Occurrences[number];

export async function fetchOccurrences(
  query: OccurrencesParams,
  signal?: AbortSignal,
): Promise<Occurrences> {
  const response = await $getOccurrences(query, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
