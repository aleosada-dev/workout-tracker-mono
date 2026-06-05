import type { VariationAlias } from "@workout-tracker/domain";
import { z } from "zod";
import { arrayQuery } from "../../shared/http/schemas";

export const VariationAliasIdParamSchema = z.object({
	id: z.uuid(),
});

export const ListVariationAliasesQuerySchema = z.object({
	variationIds: arrayQuery(z.uuid()),
	userId: z.uuid().optional(),
});

export const VariationAliasResponseSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	variationId: z.uuid(),
	locationId: z.uuid().nullable(),
	name: z.string().trim().min(1),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
});

export type VariationAliasResponse = z.infer<typeof VariationAliasResponseSchema>;

export const VariationAliasListResponseSchema = z.array(VariationAliasResponseSchema);

export const CreateVariationAliasRequestSchema = z.object({
	userId: z.uuid().optional(),
	variationId: z.uuid(),
	locationId: z.uuid().nullable(),
	name: z.string().trim().min(1).max(60),
});

export const UpdateVariationAliasRequestSchema = z
	.object({
		userId: z.uuid().optional(),
		name: z.string().trim().min(1).max(60).optional(),
		locationId: z.uuid().nullable().optional(),
	})
	.refine((v) => v.name !== undefined || v.locationId !== undefined, {
		message: "validation.no_fields_to_update",
	});

export const DeleteVariationAliasRequestSchema = z.object({
	userId: z.uuid().optional(),
});

export const DeleteVariationAliasResponseSchema = z.object({
	id: z.uuid(),
});

export function toVariationAliasResponse(alias: VariationAlias): VariationAliasResponse {
	return {
		id: alias.id,
		userId: alias.userId,
		variationId: alias.variationId,
		locationId: alias.locationId,
		name: alias.name,
		createdAt: alias.createdAt.toISOString(),
		updatedAt: alias.updatedAt.toISOString(),
	};
}
