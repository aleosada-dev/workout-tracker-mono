import {
	EXERCISE_TYPES,
	type ExerciseListItem,
	VISIBILITIES,
	WORKOUT_SET_TYPES,
} from "@workout-tracker/domain";
import { z } from "zod";
import { arrayQuery } from "../../shared/http/schemas";

export const VisibilitySchema = z.enum(VISIBILITIES);
export const ExerciseTypeSchema = z.enum(EXERCISE_TYPES);

export const ListExercisesQuerySchema = z.object({
	visibility: VisibilitySchema.default("all"),
	muscleIds: arrayQuery(z.uuid()).optional(),
	equipmentIds: arrayQuery(z.uuid()).optional(),
	exerciseTypes: arrayQuery(ExerciseTypeSchema).optional(),
});

export type ListExercisesQuery = z.infer<typeof ListExercisesQuerySchema>;

const VariationMuscleSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
	level2: z.object({
		name: z.string(),
		slug: z.string(),
	}),
});

const VariationSecondaryMuscleSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
});

const VariationEquipmentSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
	preposition: z.string(),
});

const VariationVideoSchema = z.object({
	url: z.string().nullable(),
	durationSeconds: z.number().nullable(),
	processingStatus: z.string().nullable(),
});

export const VariationResponseSchema = z.object({
	id: z.uuid(),
	name: z.string().nullable(),
	slug: z.string().nullable(),
	muscle: VariationMuscleSchema,
	secondaryMuscle: VariationSecondaryMuscleSchema.nullable(),
	equipment: VariationEquipmentSchema,
	video: VariationVideoSchema.nullable(),
	imageUrl: z.string().nullable(),
});

export const ExerciseListItemResponseSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string().nullable(),
	type: ExerciseTypeSchema,
	userId: z.uuid().nullable(),
	variations: z.array(VariationResponseSchema),
});

export const ExerciseListResponseSchema = z.array(ExerciseListItemResponseSchema);

export type VariationResponse = z.infer<typeof VariationResponseSchema>;
export type ExerciseListItemResponse = z.infer<typeof ExerciseListItemResponseSchema>;

export function toExerciseListItemResponse(item: ExerciseListItem): ExerciseListItemResponse {
	return {
		id: item.id,
		name: item.name,
		slug: item.slug,
		type: item.type,
		userId: item.userId,
		variations: item.variations,
	};
}

export const CreateExerciseRequestSchema = z.object({
	exerciseName: z.string().trim().min(1),
	exerciseType: ExerciseTypeSchema,
	variationName: z.string().trim().min(1).nullable(),
	muscleId: z.uuid(),
	secondaryMuscleId: z.uuid().nullable(),
	equipmentId: z.uuid(),
	youtubeVideoUrl: z.url().nullable(),
});

export type CreateExerciseRequest = z.infer<typeof CreateExerciseRequestSchema>;

export const CreateExerciseResponseSchema = z.object({
	id: z.uuid(),
});

export type CreateExerciseResponse = z.infer<typeof CreateExerciseResponseSchema>;

export const ExerciseIdParamSchema = z.object({
	id: z.uuid(),
});

const DetailSessionSetSchema = z.object({
	setOrder: z.number().int().nonnegative(),
	setType: z.enum(WORKOUT_SET_TYPES),
	weightKg: z.number().nullable(),
	reps: z.number().int().nullable(),
	repsMin: z.number().int().nullable(),
	repsMax: z.number().int().nullable(),
});

const DetailSessionSchema = z.object({
	workoutLogId: z.uuid(),
	startedAt: z.iso.datetime({ offset: true }),
	maxWeightKg: z.number().nullable(),
	totalVolumeKg: z.number(),
	maxReps: z.number().int().nullable(),
	totalSets: z.number().int().nonnegative(),
	sets: z.array(DetailSessionSetSchema),
});

const DetailRecordsSchema = z.object({
	maxWeightKg: z.number().nullable(),
	maxVolumeKg: z.number().nullable(),
	maxReps: z.number().int().nullable(),
	maxSets: z.number().int().nullable(),
});

const DetailVariationSchema = z.object({
	exerciseName: z.string().trim().min(1),
	exerciseSlug: z.string().nullable(),
	variationName: z.string().trim().min(1).nullable(),
	variationSlug: z.string().nullable(),
	equipmentSlug: z.string().trim().min(1),
	equipmentPreposition: z.string().trim().min(1),
	muscleSlug: z.string().trim().min(1),
	secondaryMuscleSlug: z.string().trim().min(1).nullable(),
	youtubeUrl: z.url().nullable(),
	videoUrl: z.url().nullable(),
});

export const ExerciseDetailResponseSchema = z.object({
	variationId: z.uuid(),
	variation: DetailVariationSchema,
	sessions: z.array(DetailSessionSchema),
	lastSession: DetailSessionSchema.nullable(),
	records: DetailRecordsSchema,
});

export type ExerciseDetailResponse = z.infer<typeof ExerciseDetailResponseSchema>;
