import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $getPreferences = honoClient.api.v1.preferences.$get;
const $patchPreferences = honoClient.api.v1.preferences.$patch;

export type UserPreferencesResponse = InferResponseType<typeof $getPreferences, 200>;
export type UpdateUserPreferencesRequest = InferRequestType<typeof $patchPreferences>['json'];

export async function fetchUserPreferences({
  signal,
}: {
  signal?: AbortSignal;
} = {}): Promise<UserPreferencesResponse> {
  const response = await $getPreferences({}, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}

export async function updateUserPreferences(
  patch: UpdateUserPreferencesRequest,
): Promise<UserPreferencesResponse> {
  const response = await $patchPreferences({ json: patch });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
