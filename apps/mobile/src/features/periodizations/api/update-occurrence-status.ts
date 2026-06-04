import type { InferRequestType, InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $patchOccurrenceStatus = honoClient.api.v1.periodizations.occurrences[':id'].$patch;

export type UpdateOccurrenceStatusInput = InferRequestType<typeof $patchOccurrenceStatus>;
export type OccurrenceStatus = UpdateOccurrenceStatusInput['json']['status'];
export type UpdatedOccurrence = InferResponseType<typeof $patchOccurrenceStatus, 200>;

export async function updateOccurrenceStatus(
  input: UpdateOccurrenceStatusInput,
): Promise<UpdatedOccurrence> {
  const response = await $patchOccurrenceStatus(input);
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
