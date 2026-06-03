import type { OccurrenceWorkout } from "@workout-tracker/application";
import { OCCURRENCE_STATUSES, type PeriodizationOccurrence } from "@workout-tracker/domain";
import { z } from "zod";
import { toWorkoutDetailResponse, WorkoutDetailResponseSchema } from "../workouts/schemas";

export const OccurrencesQuerySchema = z.object({
	date: z.iso.date(),
	status: z.enum(OCCURRENCE_STATUSES).default("pending"),
});

export type OccurrencesQuery = z.infer<typeof OccurrencesQuerySchema>;

export const OccurrenceResponseSchema = z.object({
	occurrenceId: z.uuid(),
	kind: z.enum(["workout", "cardio"]),
	name: z.string(),
	cycle: z.int(),
	durationSeconds: z.int().positive().nullable(),
	workoutId: z.uuid().nullable(),
	cardioProgramId: z.uuid().nullable(),
	plannedDate: z.iso.date(),
	positionInDay: z.int().nonnegative(),
});

export const OccurrenceListResponseSchema = z.array(OccurrenceResponseSchema);

export type OccurrenceResponse = z.infer<typeof OccurrenceResponseSchema>;
export type OccurrenceListResponse = z.infer<typeof OccurrenceListResponseSchema>;

export function toOccurrenceResponse(occurrence: PeriodizationOccurrence): OccurrenceResponse {
	return occurrence;
}

export const OccurrenceWorkoutParamSchema = z.object({
	occurrenceId: z.uuid(),
});

export const OccurrenceWorkoutResponseSchema = z.object({
	workout: WorkoutDetailResponseSchema,
	note: z.string().nullable(),
});

export type OccurrenceWorkoutResponse = z.infer<typeof OccurrenceWorkoutResponseSchema>;

export function toOccurrenceWorkoutResponse(result: OccurrenceWorkout): OccurrenceWorkoutResponse {
	return {
		workout: toWorkoutDetailResponse(result.workout),
		note: result.note,
	};
}
