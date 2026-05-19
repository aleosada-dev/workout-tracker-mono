import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import type { AppBindings } from "../../shared/http/types";
import {
	ExerciseHistoryResponseSchema,
	ExerciseIdParamSchema,
	ExerciseListResponseSchema,
	ListExercisesQuerySchema,
	toExerciseListItemResponse,
} from "./schemas";

export const exercisesRouter = new Hono<AppBindings>()
	.get(
		"/",
		describeRoute({
			summary: "List exercises",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(ExerciseListResponseSchema),
						},
					},
				},
				401: { description: "Unauthorized" },
			},
		}),
		validator("query", ListExercisesQuerySchema),
		async (c) => {
			const userId = c.get("userClaims")?.sub;
			if (!userId) {
				return c.json({ error: "Missing user identity" }, 401);
			}

			const query = c.req.valid("query");
			const { list } = c.get("container").exercises;
			const exercises = await list({ ...query, userId });
			return c.json(exercises.map(toExerciseListItemResponse));
		},
	)
	.get(
		"/:id/history",
		describeRoute({
			summary: "Get exercise history (sessions and records per variation)",
			tags: ["Exercises"],
			responses: {
				200: {
					description: "OK",
					content: {
						"application/json": {
							schema: resolver(ExerciseHistoryResponseSchema),
						},
					},
				},
				401: { description: "Unauthorized" },
			},
		}),
		validator("param", ExerciseIdParamSchema),
		async (c) => {
			const userId = c.get("userClaims")?.sub;
			if (!userId) {
				return c.json({ error: "Missing user identity" }, 401);
			}

			const { id: variationId } = c.req.valid("param");
			const { getExerciseHistory } = c.get("container").workoutLogs;
			const history = await getExerciseHistory({ userId, variationId });
			return c.json(history);
		},
	);
