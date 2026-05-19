import type { Equipment } from "@workout-tracker/domain";
import { z } from "zod";

export const EquipmentResponseSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
	preposition: z.string(),
	createdAt: z.iso.datetime({ offset: true }),
});

export const EquipmentListResponseSchema = z.array(EquipmentResponseSchema);

export type EquipmentResponse = z.infer<typeof EquipmentResponseSchema>;

export function toEquipmentResponse(equipment: Equipment): EquipmentResponse {
	return {
		id: equipment.id,
		name: equipment.name,
		slug: equipment.slug,
		preposition: equipment.preposition,
		createdAt: equipment.createdAt.toISOString(),
	};
}
