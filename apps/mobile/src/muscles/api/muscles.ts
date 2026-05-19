import type { InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/api/lib/hono-client';

const $get = honoClient.api.v1.muscles.$get;

export type ListMusclesResponse = InferResponseType<typeof $get, 200>;
export type ApiMuscle = ListMusclesResponse[number];

export async function fetchMuscles({
  signal,
}: {
  signal?: AbortSignal;
} = {}): Promise<ListMusclesResponse> {
  const response = await $get({ query: { mode: 'nested' } }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
