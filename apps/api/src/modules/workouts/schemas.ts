import {
	WORKOUT_FOLDER_COLORS,
	type Workout,
	type WorkoutDetail,
	type WorkoutFolder,
} from "@workout-tracker/domain";
import { z } from "zod";

export const ListWorkoutFoldersQuerySchema = z.object({
	userId: z.uuid().optional(),
});

export type ListWorkoutFoldersQuery = z.infer<typeof ListWorkoutFoldersQuerySchema>;

export const WorkoutFolderResponseSchema = z.object({
	id: z.uuid(),
	userId: z.uuid().optional(),
	name: z.string().trim().min(1),
	color: z.enum(WORKOUT_FOLDER_COLORS),
	workoutCount: z.int().nonnegative(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
});

export const WorkoutFolderListResponseSchema = z.array(WorkoutFolderResponseSchema);

export type WorkoutFolderResponse = z.infer<typeof WorkoutFolderResponseSchema>;

export const CreateWorkoutFolderRequestSchema = z.object({
	userId: z.uuid().optional(),
	name: z.string().trim().min(1).max(20),
	color: z.enum(WORKOUT_FOLDER_COLORS),
});

export type CreateWorkoutFolderRequest = z.infer<typeof CreateWorkoutFolderRequestSchema>;

export const WorkoutFolderIdParamSchema = z.object({
	id: z.uuid(),
});

export const UpdateWorkoutFolderRequestSchema = z
	.object({
		userId: z.uuid().optional(),
		name: z.string().trim().min(1).max(20).optional(),
		color: z.enum(WORKOUT_FOLDER_COLORS).optional(),
	})
	.refine((v) => v.name !== undefined || v.color !== undefined, {
		message: "At least one of name or color must be provided",
	});

export type UpdateWorkoutFolderRequest = z.infer<typeof UpdateWorkoutFolderRequestSchema>;

export const DeleteWorkoutFolderRequestSchema = z.discriminatedUnion("mode", [
	z.object({ mode: z.literal("delete-folder-only"), userId: z.uuid().optional() }),
	z.object({ mode: z.literal("delete-with-workouts"), userId: z.uuid().optional() }),
	z.object({
		mode: z.literal("move-workouts"),
		userId: z.uuid().optional(),
		targetFolderId: z.uuid().nullable(),
	}),
]);

export type DeleteWorkoutFolderRequest = z.infer<typeof DeleteWorkoutFolderRequestSchema>;

export const DeleteWorkoutFolderResponseSchema = z.object({
	id: z.uuid(),
});

export type DeleteWorkoutFolderResponse = z.infer<typeof DeleteWorkoutFolderResponseSchema>;

export const WorkoutIdParamSchema = z.object({
	id: z.uuid(),
});

export const DeleteWorkoutQuerySchema = z.object({
	userId: z.uuid().optional(),
});

export type DeleteWorkoutQuery = z.infer<typeof DeleteWorkoutQuerySchema>;

export const GetWorkoutQuerySchema = z.object({
	userId: z.uuid().optional(),
});

export type GetWorkoutQuery = z.infer<typeof GetWorkoutQuerySchema>;

export const WorkoutDetailResponseSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	name: z.string(),
	description: z.string().nullable(),
	folderId: z.uuid().nullable(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
});

export type WorkoutDetailResponse = z.infer<typeof WorkoutDetailResponseSchema>;

export function toWorkoutDetailResponse(workout: WorkoutDetail): WorkoutDetailResponse {
	return {
		id: workout.id,
		userId: workout.userId,
		name: workout.name,
		description: workout.description,
		folderId: workout.folderId,
		createdAt: workout.createdAt.toISOString(),
		updatedAt: workout.updatedAt.toISOString(),
	};
}

export const DeleteWorkoutResponseSchema = z.object({
	id: z.uuid(),
});

export type DeleteWorkoutResponse = z.infer<typeof DeleteWorkoutResponseSchema>;

export const DeleteWorkoutsRequestSchema = z.object({
	userId: z.uuid().optional(),
	workoutIds: z.array(z.uuid()).min(1),
});

export type DeleteWorkoutsRequest = z.infer<typeof DeleteWorkoutsRequestSchema>;

export const DeleteWorkoutsResponseSchema = z.object({
	deletedIds: z.array(z.uuid()),
});

export type DeleteWorkoutsResponse = z.infer<typeof DeleteWorkoutsResponseSchema>;

export const MoveWorkoutsRequestSchema = z.object({
	userId: z.uuid().optional(),
	workoutIds: z.array(z.uuid()).min(1),
	targetFolderId: z.uuid().nullable(),
});

export type MoveWorkoutsRequest = z.infer<typeof MoveWorkoutsRequestSchema>;

export const MoveWorkoutsResponseSchema = z.object({
	movedIds: z.array(z.uuid()),
});

export type MoveWorkoutsResponse = z.infer<typeof MoveWorkoutsResponseSchema>;

export const CopyWorkoutsTargetSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("root") }),
	z.object({ kind: z.literal("existing"), folderId: z.uuid() }),
	z.object({
		kind: z.literal("new"),
		name: z.string().trim().min(1).max(20),
		color: z.enum(WORKOUT_FOLDER_COLORS),
	}),
]);

export const CopyWorkoutsRequestSchema = z.object({
	workoutIds: z.array(z.uuid()).min(1).max(50),
	targetUserId: z.uuid(),
	target: CopyWorkoutsTargetSchema,
});

export type CopyWorkoutsRequest = z.infer<typeof CopyWorkoutsRequestSchema>;

export const CopyWorkoutsResponseSchema = z.object({
	newWorkoutIds: z.array(z.uuid()),
});

export type CopyWorkoutsResponse = z.infer<typeof CopyWorkoutsResponseSchema>;

export const ListWorkoutsQuerySchema = z.object({
	userId: z.uuid().optional(),
	folderId: z
		.union([z.uuid(), z.literal("null")])
		.optional()
		.transform((v) => (v === "null" ? null : v)),
});

export type ListWorkoutsQuery = z.infer<typeof ListWorkoutsQuerySchema>;

export const WorkoutTopExerciseSchema = z.object({
	slug: z.string().nullable(),
	name: z.string(),
	variationSlug: z.string().nullable(),
	variationName: z.string().nullable(),
	equipmentSlug: z.string(),
	equipmentPreposition: z.string(),
});

export type WorkoutTopExerciseResponse = z.infer<typeof WorkoutTopExerciseSchema>;

export const WorkoutResponseSchema = z.object({
	id: z.uuid(),
	userId: z.uuid().optional(),
	name: z.string(),
	folderId: z.uuid().nullable(),
	folderName: z.string().nullable(),
	exerciseCount: z.int().nonnegative(),
	muscleSlugs: z.array(z.string()),
	topExercises: z.array(WorkoutTopExerciseSchema).max(2),
	lastPerformedAt: z.iso.datetime({ offset: true }).nullable(),
	createdAt: z.iso.datetime({ offset: true }),
	updatedAt: z.iso.datetime({ offset: true }),
});

export const WorkoutListResponseSchema = z.array(WorkoutResponseSchema);

export type WorkoutResponse = z.infer<typeof WorkoutResponseSchema>;

export function toWorkoutResponse(workout: Workout): WorkoutResponse {
	return {
		id: workout.id,
		userId: workout.userId,
		name: workout.name,
		folderId: workout.folderId,
		folderName: workout.folderName,
		exerciseCount: workout.exerciseCount,
		muscleSlugs: workout.muscleSlugs,
		topExercises: workout.topExercises,
		lastPerformedAt: workout.lastPerformedAt ? workout.lastPerformedAt.toISOString() : null,
		createdAt: workout.createdAt.toISOString(),
		updatedAt: workout.updatedAt.toISOString(),
	};
}

export function toWorkoutFolderResponse(folder: WorkoutFolder): WorkoutFolderResponse {
	return {
		id: folder.id,
		userId: folder.userId,
		name: folder.name,
		color: folder.color,
		workoutCount: folder.workoutCount,
		createdAt: folder.createdAt.toISOString(),
		updatedAt: folder.updatedAt.toISOString(),
	};
}
