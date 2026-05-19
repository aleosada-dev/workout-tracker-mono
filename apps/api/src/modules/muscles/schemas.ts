import type { Muscle } from "@workout-tracker/domain";
import { z } from "zod";

export type MuscleResponse = {
	id: string;
	name: string;
	slug: string;
	parentId: string | null;
	level: number;
	sortOrder: number;
	createdAt: string;
	children?: MuscleResponse[];
};

export const MuscleResponseSchema: z.ZodType<MuscleResponse> = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
	parentId: z.string().nullable(),
	level: z.number().int().min(1).max(3),
	sortOrder: z.number().int().min(0),
	createdAt: z.iso.datetime({ offset: true }),
	children: z.lazy(() => z.array(MuscleResponseSchema)).optional(),
});

export const MuscleListResponseSchema = z.array(MuscleResponseSchema);

export const MuscleModeSchema = z.enum(["flat", "nested"]).default("flat");

export const MusclesQuerySchema = z.object({
	mode: MuscleModeSchema,
});

export type MusclesQuery = z.infer<typeof MusclesQuerySchema>;

export function toMuscleResponse(muscle: Muscle): MuscleResponse {
	return {
		id: muscle.id,
		name: muscle.name,
		slug: muscle.slug,
		parentId: muscle.parentId,
		level: muscle.level,
		sortOrder: muscle.sortOrder,
		createdAt: muscle.createdAt.toISOString(),
	};
}

export function toMuscleTreeResponse(muscle: Muscle): MuscleResponse {
	return {
		...toMuscleResponse(muscle),
		children: (muscle.children ?? []).map(toMuscleTreeResponse),
	};
}
