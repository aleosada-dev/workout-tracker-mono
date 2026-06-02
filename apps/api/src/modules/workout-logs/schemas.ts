import {
	type CreateWorkoutLogResult,
	MEASUREMENT_TYPES,
	measurementDimensions,
	WORKOUT_EXERCISE_TYPES,
	WORKOUT_SET_TYPES,
	type WorkoutLogSummary,
	type WorkoutLogSummaryPage,
} from "@workout-tracker/domain";
import { z } from "zod";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const ListWorkoutLogSummariesQuerySchema = z.object({
	limit: z.coerce.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
	cursor: z.iso.datetime({ offset: true }).optional(),
});

export type ListWorkoutLogSummariesQuery = z.infer<typeof ListWorkoutLogSummariesQuerySchema>;

export const WorkoutLogSummaryResponseSchema = z.object({
	id: z.uuid(),
	title: z.string().trim().min(1).nullable(),
	startedAt: z.iso.datetime({ offset: true }),
	durationSeconds: z.int().nonnegative(),
	exerciseCount: z.int().nonnegative(),
	muscleGroupSlugs: z.array(z.string().trim().min(1)),
	prCount: z.int().nonnegative(),
});

export const WorkoutLogSummaryPageResponseSchema = z.object({
	items: z.array(WorkoutLogSummaryResponseSchema),
	hasMore: z.boolean(),
});

export type WorkoutLogSummaryResponse = z.infer<typeof WorkoutLogSummaryResponseSchema>;
export type WorkoutLogSummaryPageResponse = z.infer<typeof WorkoutLogSummaryPageResponseSchema>;

export function toWorkoutLogSummaryResponse(item: WorkoutLogSummary): WorkoutLogSummaryResponse {
	return item;
}

export function toWorkoutLogSummaryPageResponse(
	page: WorkoutLogSummaryPage,
): WorkoutLogSummaryPageResponse {
	return {
		items: page.items.map(toWorkoutLogSummaryResponse),
		hasMore: page.hasMore,
	};
}

const CreateWorkoutLogSetSchema = z
	.object({
		setOrder: z.int().nonnegative(),
		setType: z.enum(WORKOUT_SET_TYPES),
		measurementType: z.enum(MEASUREMENT_TYPES),
		weightKg: z.number().positive().nullable(),
		reps: z.int().positive().nullable(),
		repsMin: z.int().positive().nullable(),
		repsMax: z.int().positive().nullable(),
		durationSeconds: z.int().positive().nullable(),
	})
	.superRefine((set, ctx) => {
		const dims = measurementDimensions(set.measurementType);
		if (dims.weight && set.weightKg === null) {
			ctx.addIssue({
				code: "custom",
				path: ["weightKg"],
				message: "validation.weight_required",
			});
		}
		if (dims.reps && set.reps === null) {
			ctx.addIssue({
				code: "custom",
				path: ["reps"],
				message: "validation.reps_required",
			});
		}
		if (dims.duration && set.durationSeconds === null) {
			ctx.addIssue({
				code: "custom",
				path: ["durationSeconds"],
				message: "validation.duration_required",
			});
		}
	});

const CreateWorkoutLogExerciseSchema = z.object({
	variationId: z.uuid(),
	exerciseType: z.enum(WORKOUT_EXERCISE_TYPES),
	position: z.int().nonnegative(),
	note: z.string().trim().min(1).nullable(),
	restSeconds: z.int().nonnegative().nullable(),
	supersetGroupId: z.uuid().nullable(),
	sets: z.array(CreateWorkoutLogSetSchema).min(1),
});

export const CreateWorkoutLogRequestSchema = z.object({
	workoutId: z.uuid().nullable(),
	startedAt: z.iso.datetime({ offset: true }),
	finishedAt: z.iso.datetime({ offset: true }),
	note: z.string().trim().min(1).nullable(),
	exercises: z.array(CreateWorkoutLogExerciseSchema).min(1),
});

export type CreateWorkoutLogRequest = z.infer<typeof CreateWorkoutLogRequestSchema>;

export const CreateWorkoutLogResponseSchema = z.object({
	workoutLogId: z.uuid(),
});

export type CreateWorkoutLogResponse = z.infer<typeof CreateWorkoutLogResponseSchema>;

export function toCreateWorkoutLogResponse(
	result: CreateWorkoutLogResult,
): CreateWorkoutLogResponse {
	return result;
}
