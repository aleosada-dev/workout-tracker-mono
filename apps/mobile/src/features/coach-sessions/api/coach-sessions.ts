import type { InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $getCoachSessions = honoClient.api.v1['coach-sessions'].$get;

export type CoachSessionResponse = InferResponseType<typeof $getCoachSessions, 200>[number];

export async function fetchScheduledSessions(
  athleteId: string,
  date: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<CoachSessionResponse[]> {
  const response = await $getCoachSessions({ query: { athleteId, date } }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
