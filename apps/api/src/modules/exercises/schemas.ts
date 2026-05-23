import {
	EXERCISE_TYPES,
	type ExerciseListItem,
	MAX_VIDEO_DURATION_SECONDS,
	MAX_VIDEO_SIZE_BYTES,
	VISIBILITIES,
	WORKOUT_SET_TYPES,
} from "@workout-tracker/domain";
import { z } from "zod";
import { arrayQuery } from "../../shared/http/schemas";
import { VideoContentTypeSchema } from "../medias/schemas";

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

export const ExerciseNameResponseSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string().nullable(),
});

export const ExerciseNamesResponseSchema = z.array(ExerciseNameResponseSchema);

export type ExerciseNameResponse = z.infer<typeof ExerciseNameResponseSchema>;

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

/** Metadata of a device video already uploaded to R2, sent with the exercise. */
export const CreateExerciseVideoSchema = z.object({
	objectKey: z.string().min(1),
	thumbnailKey: z.string().min(1),
	// Ranges come from the domain video module (which the variation_videos CHECK
	// constraints mirror), so a bad payload is a clean 400 instead of a DB error.
	durationSeconds: z.number().int().min(1).max(MAX_VIDEO_DURATION_SECONDS),
	sizeBytes: z.number().int().min(1).max(MAX_VIDEO_SIZE_BYTES),
	contentType: VideoContentTypeSchema,
});

export const CreateExerciseRequestSchema = z.object({
	// Minted by the client so the device video can be uploaded to R2 up front.
	variationId: z.uuid(),
	exerciseName: z.string().trim().min(1),
	exerciseType: ExerciseTypeSchema,
	variationName: z.string().trim().min(1).nullable(),
	muscleId: z.uuid(),
	secondaryMuscleId: z.uuid().nullable(),
	equipmentId: z.uuid(),
	youtubeVideoUrl: z.url().nullable(),
	video: CreateExerciseVideoSchema.nullable(),
});

export type CreateExerciseRequest = z.infer<typeof CreateExerciseRequestSchema>;

export const CreateExerciseResponseSchema = z.object({
	id: z.uuid(),
});

export type CreateExerciseResponse = z.infer<typeof CreateExerciseResponseSchema>;

export const ExerciseIdParamSchema = z.object({
	id: z.uuid(),
});

/** Body of PUT /exercises/:id — same fields as create, minus the path-supplied id. */
export const UpdateExerciseRequestSchema = z.object({
	exerciseName: z.string().trim().min(1),
	exerciseType: ExerciseTypeSchema,
	variationName: z.string().trim().min(1).nullable(),
	muscleId: z.uuid(),
	secondaryMuscleId: z.uuid().nullable(),
	equipmentId: z.uuid(),
	youtubeVideoUrl: z.url().nullable(),
	video: CreateExerciseVideoSchema.nullable(),
});

export type UpdateExerciseRequest = z.infer<typeof UpdateExerciseRequestSchema>;

export const DeleteExercisesRequestSchema = z.object({
	variationIds: z.array(z.uuid()).min(1),
});

export type DeleteExercisesRequest = z.infer<typeof DeleteExercisesRequestSchema>;

export const DeleteExercisesResponseSchema = z.object({
	deletedCount: z.number().int().nonnegative(),
});

export type DeleteExercisesResponse = z.infer<typeof DeleteExercisesResponseSchema>;

export const DeleteExerciseResponseSchema = z.object({
	id: z.uuid(),
});

export type DeleteExerciseResponse = z.infer<typeof DeleteExerciseResponseSchema>;

/** Uploaded device video of a variation, as returned for the edit form. */
const ExerciseForEditVideoSchema = z.object({
	objectKey: z.string(),
	thumbnailKey: z.string(),
	durationSeconds: z.number().int(),
	sizeBytes: z.number().int(),
	contentType: VideoContentTypeSchema,
	processingStatus: z.string(),
	/** Playable URL of the uploaded video, or null when it cannot be resolved. */
	url: z.string().nullable(),
});

/** Response of GET /exercises/:id — everything the edit form pre-fills. */
export const ExerciseForEditResponseSchema = z.object({
	variationId: z.uuid(),
	exerciseName: z.string(),
	exerciseType: ExerciseTypeSchema,
	variationName: z.string().nullable(),
	muscleId: z.uuid(),
	secondaryMuscleId: z.uuid().nullable(),
	equipmentId: z.uuid(),
	equipmentSlug: z.string(),
	equipmentPreposition: z.string(),
	youtubeVideoUrl: z.string().nullable(),
	video: ExerciseForEditVideoSchema.nullable(),
});

export type ExerciseForEditResponse = z.infer<typeof ExerciseForEditResponseSchema>;

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
	userId: z.uuid().nullable(),
	deletedAt: z.iso.datetime({ offset: true }).nullable(),
});

export const ExerciseDetailResponseSchema = z.object({
	variationId: z.uuid(),
	variation: DetailVariationSchema,
	sessions: z.array(DetailSessionSchema),
	lastSession: DetailSessionSchema.nullable(),
	records: DetailRecordsSchema,
});

export type ExerciseDetailResponse = z.infer<typeof ExerciseDetailResponseSchema>;
