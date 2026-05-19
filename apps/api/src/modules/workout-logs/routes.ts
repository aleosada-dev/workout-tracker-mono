import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import {
	ListWorkoutLogSummariesQuerySchema,
	toWorkoutLogSummaryPageResponse,
	WorkoutLogSummaryPageResponseSchema,
} from "./schemas";

export const workoutLogsRouter = new Hono<AppBindings>().get(
	"/summaries",
	describeRoute({
		summary: "List workout log summaries (paginated by started_at cursor)",
		tags: ["Workout Logs"],
		responses: {
			200: {
				description: "OK",
				content: {
					"application/json": {
						schema: resolver(WorkoutLogSummaryPageResponseSchema),
					},
				},
			},
			401: { description: "Unauthorized" },
		},
	}),
	validator("query", ListWorkoutLogSummariesQuerySchema),
	async (c) => {
		const userId = c.get("userClaims")?.sub;
		if (!userId) {
			return c.json({ error: "Missing user identity" }, 401);
		}

		const { limit, cursor } = c.req.valid("query");
		const { listSummaries } = c.get("container").workoutLogs;
		const page = await listSummaries({ userId, limit, cursor });
		return c.json(toWorkoutLogSummaryPageResponse(page));
	},
);
