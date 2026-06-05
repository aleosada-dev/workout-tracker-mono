import type { TrainingLocation } from "@workout-tracker/domain";
import { z } from "zod";

export const TrainingLocationIdParamSchema = z.object({
	id: z.uuid(),
});

export const ListTrainingLocationsQuerySchema = z.object({
	userId: z.uuid().optional(),
});

export const TrainingLocationResponseSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	name: z.string().trim().min(1),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
});

export type TrainingLocationResponse = z.infer<typeof TrainingLocationResponseSchema>;

export const TrainingLocationListResponseSchema = z.array(TrainingLocationResponseSchema);

export const CreateTrainingLocationRequestSchema = z.object({
	userId: z.uuid().optional(),
	name: z.string().trim().min(1).max(60),
});

export const UpdateTrainingLocationRequestSchema = z.object({
	userId: z.uuid().optional(),
	name: z.string().trim().min(1).max(60),
});

export const DeleteTrainingLocationRequestSchema = z.object({
	userId: z.uuid().optional(),
});

export const DeleteTrainingLocationResponseSchema = z.object({
	id: z.uuid(),
});

export function toTrainingLocationResponse(location: TrainingLocation): TrainingLocationResponse {
	return {
		id: location.id,
		userId: location.userId,
		name: location.name,
		createdAt: location.createdAt.toISOString(),
		updatedAt: location.updatedAt.toISOString(),
	};
}
