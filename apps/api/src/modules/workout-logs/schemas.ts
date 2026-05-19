import type { WorkoutLogSummary, WorkoutLogSummaryPage } from "@workout-tracker/domain";
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
