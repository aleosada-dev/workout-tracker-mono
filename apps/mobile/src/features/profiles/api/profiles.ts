import type { InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $getProfile = honoClient.api.v1.profiles[':id'].$get;

export type ProfileResponse = InferResponseType<typeof $getProfile, 200>;

export async function fetchProfile(
  userId: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<ProfileResponse> {
  const response = await $getProfile({ param: { id: userId } }, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
