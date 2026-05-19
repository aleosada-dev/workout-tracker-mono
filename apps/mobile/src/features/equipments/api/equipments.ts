import type { InferResponseType } from 'hono/client';
import { buildApiError, honoClient } from '@/features/api/lib/hono-client';

const $get = honoClient.api.v1.equipments.$get;

export type ListEquipmentsResponse = InferResponseType<typeof $get, 200>;
export type ApiEquipment = ListEquipmentsResponse[number];

export async function fetchEquipments({
  signal,
}: {
  signal?: AbortSignal;
} = {}): Promise<ListEquipmentsResponse> {
  const response = await $get({}, { init: { signal } });
  if (!response.ok) throw await buildApiError(response);
  return response.json();
}
