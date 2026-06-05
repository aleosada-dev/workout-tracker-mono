import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import { validationHook } from "../../shared/http/validation-hook";
import {
	CreateWorkoutLogRequestSchema,
	CreateWorkoutLogResponseSchema,
	ListWorkoutLogSummariesQuerySchema,
	toCreateWorkoutLogResponse,
	toWorkoutLogDetailResponse,
	toWorkoutLogSummaryPageResponse,
	WorkoutLogDetailResponseSchema,
	WorkoutLogIdParamSchema,
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
			const authUserId = c.get("userClaims")?.sub;
			if (!authUserId) {
				return c.json({ error: "Missing user identity" }, 401);
			}

			const { userId: queryUserId, limit, cursor } = c.req.valid("query");
			const userId = queryUserId ?? authUserId;
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
			const actorId = c.get("userId");
			const { userId, ...body } = c.req.valid("json");
			const { create } = c.get("container").workoutLogs;
			const result = await create({ ...body, userId: userId ?? actorId, actorId });
			return c.json(toCreateWorkoutLogResponse(result), 201);
		},
	)
	.get(
		"/:id",
		describeRoute({
			summary: "Get a single workout log with full exercise/set detail",
			tags: ["Workout Logs"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(WorkoutLogDetailResponseSchema),
						},
					},
				},
				401: { description: "Unauthorized" },
				404: { description: "Not found" },
			},
		}),
		validator("param", WorkoutLogIdParamSchema),
		async (c) => {
			const userId = c.get("userClaims")?.sub;
			if (!userId) {
				return c.json({ error: "Missing user identity" }, 401);
			}

			const { id } = c.req.valid("param");
			const { getById } = c.get("container").workoutLogs;
			const detail = await getById({ userId, workoutLogId: id });
			if (!detail) {
				return c.json({ error: "Workout log not found" }, 404);
			}
			return c.json(toWorkoutLogDetailResponse(detail));
		},
	)
	.delete(
		"/:id",
		describeRoute({
			summary: "Soft-delete a workout log and recompute affected records",
			tags: ["Workout Logs"],
			responses: {
				204: { description: "Deleted" },
				401: { description: "Unauthorized" },
				403: { description: "Not authorized to delete this workout log" },
				404: { description: "Not found" },
			},
		}),
		validator("param", WorkoutLogIdParamSchema),
		async (c) => {
			const userId = c.get("userId");

			const { id } = c.req.valid("param");
			const { delete: deleteWorkoutLog } = c.get("container").workoutLogs;
			await deleteWorkoutLog({ userId, workoutLogId: id });
			return c.body(null, 204);
		},
	);
