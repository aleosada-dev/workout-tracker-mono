import {
	type CreateWorkoutLogResult,
	MEASUREMENT_TYPES,
	measurementDimensions,
	WORKOUT_EXERCISE_TYPES,
	WORKOUT_SET_TYPES,
	type WorkoutLogDetail,
	type WorkoutLogSummary,
	type WorkoutLogSummaryPage,
} from "@workout-tracker/domain";
import { z } from "zod";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const ListWorkoutLogSummariesQuerySchema = z.object({
	userId: z.uuid().optional(),
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

export const WorkoutLogIdParamSchema = z.object({
	id: z.uuid(),
});

export const GetWorkoutLogQuerySchema = z.object({
	userId: z.uuid().optional(),
});

export type GetWorkoutLogQuery = z.infer<typeof GetWorkoutLogQuerySchema>;

const WorkoutLogDetailSetSchema = z.object({
	setOrder: z.int().nonnegative(),
	roundOrder: z.int().nonnegative(),
	setType: z.enum(WORKOUT_SET_TYPES),
	measurementType: z.enum(MEASUREMENT_TYPES),
	weightKg: z.number().nullable(),
	reps: z.int().nullable(),
	repsMin: z.int().nullable(),
	repsMax: z.int().nullable(),
	durationSeconds: z.int().nullable(),
	distanceMeters: z.int().nullable(),
});

const WorkoutLogDetailExerciseSchema = z.object({
	variationId: z.uuid().nullable(),
	exerciseName: z.string().nullable(),
	variationName: z.string().nullable(),
	exerciseType: z.enum(WORKOUT_EXERCISE_TYPES),
	position: z.int().nonnegative(),
	supersetGroupId: z.uuid().nullable(),
	note: z.string().nullable(),
	restSeconds: z.int().nullable(),
	sets: z.array(WorkoutLogDetailSetSchema),
});

export const WorkoutLogDetailResponseSchema = z.object({
	workoutLogId: z.uuid(),
	userId: z.uuid(),
	startedBy: z.uuid(),
	title: z.string().nullable(),
	startedAt: z.iso.datetime({ offset: true }),
	finishedAt: z.iso.datetime({ offset: true }),
	note: z.string().nullable(),
	exercises: z.array(WorkoutLogDetailExerciseSchema),
	sessionRecords: z.array(z.unknown()),
});

export type WorkoutLogDetailResponse = z.infer<typeof WorkoutLogDetailResponseSchema>;

export function toWorkoutLogDetailResponse(detail: WorkoutLogDetail): WorkoutLogDetailResponse {
	return detail;
}

const CreateWorkoutLogSetSchema = z
	.object({
		setOrder: z.int().nonnegative(),
		roundOrder: z.int().nonnegative(),
		setType: z.enum(WORKOUT_SET_TYPES),
		measurementType: z.enum(MEASUREMENT_TYPES),
		weightKg: z.number().positive().nullable(),
		reps: z.int().positive().nullable(),
		repsMin: z.int().positive().nullable(),
		repsMax: z.int().positive().nullable(),
		durationSeconds: z.int().positive().nullable(),
		distanceMeters: z.int().positive().nullable(),
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
		if (dims.distance && set.distanceMeters === null) {
			ctx.addIssue({
				code: "custom",
				path: ["distanceMeters"],
				message: "validation.distance_required",
			});
		}
	});

const CreateWorkoutLogExerciseSchema = z.object({
	variationId: z.uuid(),
	aliasId: z.uuid().nullable().default(null),
	exerciseType: z.enum(WORKOUT_EXERCISE_TYPES),
	position: z.int().nonnegative(),
	note: z.string().trim().min(1).nullable(),
	restSeconds: z.int().nonnegative().nullable(),
	supersetGroupId: z.uuid().nullable(),
	sets: z.array(CreateWorkoutLogSetSchema).min(1),
});

export const CreateWorkoutLogRequestSchema = z.object({
	workoutId: z.uuid().nullable(),
	userId: z.uuid().nullable(),
	startedAt: z.iso.datetime({ offset: true }),
	finishedAt: z.iso.datetime({ offset: true }),
	note: z.string().trim().min(1).nullable(),
	isCoached: z.boolean(),
	coachSessionId: z.uuid().nullable(),
	periodizationOccurrenceId: z.uuid().nullable(),
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
