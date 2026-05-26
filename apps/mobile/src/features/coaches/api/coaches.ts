import type { InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $getAthletes = honoClient.api.v1.coachs[':id'].athletes.$get;

export type CoachAthleteResponse = InferResponseType<typeof $getAthletes, 200>[number];

export async function fetchCoachAthletes(
  coachId: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<CoachAthleteResponse[]> {
  const response = await $getAthletes({ param: { id: coachId } }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
