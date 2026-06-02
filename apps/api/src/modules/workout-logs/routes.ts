import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import { validationHook } from "../../shared/http/validation-hook";
import {
	CreateWorkoutLogRequestSchema,
	CreateWorkoutLogResponseSchema,
	ListWorkoutLogSummariesQuerySchema,
	toCreateWorkoutLogResponse,
	toWorkoutLogSummaryPageResponse,
	WorkoutLogSummaryPageResponseSchema,
} from "./schemas";

export const workoutLogsRouter = new Hono<AppBindings>()
	.get(
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
	)
	.post(
		"/",
		describeRoute({
			summary: "Create a workout log from a finished session",
			tags: ["Workout Logs"],
			responses: {
				201: {
					description: "Created",
					content: {
						"application/json": {
							schema: resolver(CreateWorkoutLogResponseSchema),
						},
					},
				},
				400: { description: "Invalid input" },
				401: { description: "Unauthorized" },
				403: { description: "Not coach of target athlete" },
				404: { description: "Variation not found" },
			},
		}),
		validator("json", CreateWorkoutLogRequestSchema, validationHook),
		async (c) => {
			const userId = c.get("userClaims")?.sub;
			if (!userId) {
				return c.json({ error: "Missing user identity" }, 401);
			}

			const body = c.req.valid("json");
			const { create } = c.get("container").workoutLogs;
			const result = await create({ userId, ...body });
			return c.json(toCreateWorkoutLogResponse(result), 201);
		},
	);
